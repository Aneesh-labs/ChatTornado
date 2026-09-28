from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from auth import decode_token
from database import get_db
from models import User
from websocket_manager import manager

router = APIRouter(prefix="/api/user/status", tags=["status"])

VALID_STATUSES = {"online", "away", "dnd", "offline"}


class StatusUpdateRequest(BaseModel):
    status: str = Field(..., description="online, away, dnd, or offline")
    custom_status: Optional[str] = Field(None, max_length=100)


def get_current_user_id(token: str) -> int:
    payload = decode_token(token)
    if not payload or not payload.get("user_id"):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return int(payload["user_id"])


@router.put("")
async def update_status(
    payload: StatusUpdateRequest,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    current_user_id = get_current_user_id(token)
    status_lower = payload.status.lower().strip()
    if status_lower not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Must be one of: {', '.join(VALID_STATUSES)}"
        )

    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.status = status_lower
    user.custom_status = payload.custom_status.strip() if payload.custom_status else None
    user.last_seen = datetime.utcnow()
    db.commit()
    db.refresh(user)

    # Broadcast status update via WebSocket manager
    await manager.broadcast_user_status(
        user_id=current_user_id,
        status=user.status,
        custom_status=user.custom_status,
        db=db
    )

    return {
        "status": "success",
        "user_status": user.status,
        "custom_status": user.custom_status
    }


@router.get("/{user_id}")
def get_user_status(
    user_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    current_user_id = get_current_user_id(token)

    from block_routes import is_blocked_bidirectional
    if is_blocked_bidirectional(db, current_user_id, user_id):
        # Do not expose presence info to blocked users
        return {
            "user_id": user_id,
            "status": "offline",
            "custom_status": None
        }

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Check live WS connection
    is_live = user_id in manager.active_connections or str(user_id) in manager.active_connections
    effective_status = user.status if (is_live or user.status == "offline") else "offline"

    return {
        "user_id": user.id,
        "status": effective_status,
        "custom_status": user.custom_status,
        "last_seen": user.last_seen.isoformat() if user.last_seen else None
    }
