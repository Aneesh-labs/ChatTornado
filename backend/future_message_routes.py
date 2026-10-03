from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from auth import decode_token
from database import get_db
from models import FutureMessage, User, Group, ConversationBranch
from scheduler_service import create_future_message
from dna_routes import parse_conversation_target

router = APIRouter(prefix="/api/future-messages", tags=["Future Messages"])


class ScheduleFutureMessageRequest(BaseModel):
    message: str
    trigger_type: str = Field(..., pattern="^(time|condition)$")
    receiver_id: Optional[int] = None
    group_id: Optional[int] = None
    branch_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    condition_config: Optional[dict] = None


class UpdateFutureMessageRequest(BaseModel):
    message: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    condition_config: Optional[dict] = None


@router.post("")
async def schedule_message(
    req: ScheduleFutureMessageRequest,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Schedule a message for future time delivery or condition satisfaction."""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    sender_id = int(payload["user_id"])
    try:
        future_msg = create_future_message(
            db=db,
            sender_id=sender_id,
            message=req.message,
            trigger_type=req.trigger_type,
            receiver_id=req.receiver_id,
            group_id=req.group_id,
            branch_id=req.branch_id,
            scheduled_at=req.scheduled_at,
            condition_config=req.condition_config
        )
        return {
            "status": "success",
            "data": {
                "id": future_msg.id,
                "status": future_msg.status,
                "trigger_type": future_msg.trigger_type,
                "scheduled_at": future_msg.scheduled_at.isoformat() if future_msg.scheduled_at else None,
                "condition_config": future_msg.condition_config,
                "created_at": future_msg.created_at.isoformat()
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to schedule future message: {str(e)}")


@router.get("")
async def list_user_future_messages(
    token: str = Query(...),
    target: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """List pending and historical future messages for the authenticated user."""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["user_id"])
    query = db.query(FutureMessage).filter(FutureMessage.sender_id == user_id)

    if status:
        query = query.filter(FutureMessage.status == status)

    if target:
        dm_user2_id, group_id = parse_conversation_target(target, user_id, db)
        if group_id:
            query = query.filter(FutureMessage.group_id == group_id)
        elif dm_user2_id:
            query = query.filter(FutureMessage.receiver_id == dm_user2_id)

    records = query.order_by(FutureMessage.created_at.desc()).all()

    result = []
    for fm in records:
        target_name = "Direct Message"
        if fm.group:
            target_name = fm.group.name
        elif fm.receiver:
            target_name = fm.receiver.username

        result.append({
            "id": fm.id,
            "sender_id": fm.sender_id,
            "receiver_id": fm.receiver_id,
            "group_id": fm.group_id,
            "branch_id": fm.branch_id,
            "branch_name": fm.branch.name if fm.branch else None,
            "target_name": target_name,
            "message": fm.message,
            "trigger_type": fm.trigger_type,
            "scheduled_at": fm.scheduled_at.isoformat() if fm.scheduled_at else None,
            "condition_config": fm.condition_config,
            "status": fm.status,
            "created_at": fm.created_at.isoformat(),
            "executed_at": fm.executed_at.isoformat() if fm.executed_at else None,
            "error_message": fm.error_message,
            "delivered_message_id": fm.delivered_message_id
        })

    return {"status": "success", "data": result}


@router.get("/{future_msg_id}")
async def get_future_message(
    future_msg_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Get single future message details."""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["user_id"])
    fm = db.query(FutureMessage).filter(FutureMessage.id == future_msg_id, FutureMessage.sender_id == user_id).first()
    if not fm:
        raise HTTPException(status_code=404, detail="Future message not found")

    return {
        "status": "success",
        "data": {
            "id": fm.id,
            "message": fm.message,
            "trigger_type": fm.trigger_type,
            "scheduled_at": fm.scheduled_at.isoformat() if fm.scheduled_at else None,
            "condition_config": fm.condition_config,
            "status": fm.status,
            "created_at": fm.created_at.isoformat(),
            "executed_at": fm.executed_at.isoformat() if fm.executed_at else None,
            "delivered_message_id": fm.delivered_message_id,
            "execution_metadata": fm.execution_metadata
        }
    }


@router.patch("/{future_msg_id}")
async def update_future_message(
    future_msg_id: int,
    req: UpdateFutureMessageRequest,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Update message payload, scheduled time, or condition while still pending."""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["user_id"])
    fm = db.query(FutureMessage).filter(FutureMessage.id == future_msg_id, FutureMessage.sender_id == user_id).first()
    if not fm:
        raise HTTPException(status_code=404, detail="Future message not found")

    if fm.status not in ("scheduled", "waiting"):
        raise HTTPException(status_code=400, detail=f"Cannot edit message with status '{fm.status}'")

    if req.message is not None and req.message.strip():
        fm.message = req.message.strip()

    if req.scheduled_at is not None:
        now_utc = datetime.now(timezone.utc)
        sched_utc = req.scheduled_at if req.scheduled_at.tzinfo else req.scheduled_at.replace(tzinfo=timezone.utc)
        if sched_utc <= now_utc:
            raise HTTPException(status_code=400, detail="scheduled_at must be in the future")
        fm.scheduled_at = req.scheduled_at

    if req.condition_config is not None:
        fm.condition_config = req.condition_config

    meta = dict(fm.execution_metadata or {})
    audit = meta.get("audit_trail", [])
    audit.append({
        "action": "edited",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id
    })
    meta["audit_trail"] = audit
    fm.execution_metadata = meta

    db.commit()
    db.refresh(fm)
    return {"status": "success", "data": {"id": fm.id, "status": fm.status, "message": fm.message}}


@router.delete("/{future_msg_id}")
@router.post("/{future_msg_id}/cancel")
async def cancel_future_message(
    future_msg_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Cancel a pending future message."""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["user_id"])
    fm = db.query(FutureMessage).filter(FutureMessage.id == future_msg_id, FutureMessage.sender_id == user_id).first()
    if not fm:
        raise HTTPException(status_code=404, detail="Future message not found")

    if fm.status in ("delivered", "triggered"):
        raise HTTPException(status_code=400, detail="Cannot cancel an already delivered or executing message")

    fm.status = "cancelled"
    meta = dict(fm.execution_metadata or {})
    audit = meta.get("audit_trail", [])
    audit.append({
        "action": "cancelled",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id
    })
    meta["audit_trail"] = audit
    fm.execution_metadata = meta

    db.commit()
    return {"status": "success", "message": "Future message cancelled successfully"}
