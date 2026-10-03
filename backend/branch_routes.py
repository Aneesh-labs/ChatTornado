from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import decode_token
from database import get_db
from models import ConversationBranch
from branch_service import create_reality_fork, get_branch_messages, list_conversation_branches, validate_conversation_access
from dna_routes import parse_conversation_target

router = APIRouter(prefix="/api/branches", tags=["Reality Forks"])


class CreateForkRequest(BaseModel):
    fork_message_id: int
    name: str
    description: Optional[str] = None


class UpdateForkRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_archived: Optional[bool] = None


@router.post("/fork")
async def fork_conversation(
    req: CreateForkRequest,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Create a new reality fork branch from a specific message."""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["user_id"])
    try:
        branch = create_reality_fork(
            db=db,
            user_id=user_id,
            fork_message_id=req.fork_message_id,
            name=req.name,
            description=req.description
        )
        return {
            "status": "success",
            "data": {
                "id": branch.id,
                "name": branch.name,
                "description": branch.description,
                "parent_branch_id": branch.parent_branch_id,
                "fork_message_id": branch.fork_message_id,
                "created_by": branch.created_by,
                "created_at": branch.created_at.isoformat() if branch.created_at else None
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create reality fork: {str(e)}")


@router.get("/{target}")
async def list_branches_for_conversation(
    target: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """List all reality forks for a given DM or Group conversation."""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["user_id"])
    dm_user2_id, group_id = parse_conversation_target(target, user_id, db)

    try:
        branches = list_conversation_branches(
            db=db,
            user_id=user_id,
            dm_user2_id=dm_user2_id,
            group_id=group_id
        )
        return {"status": "success", "branches": branches, "data": branches}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list branches: {str(e)}")


@router.get("/{branch_id}/messages")
async def get_messages_for_branch(
    branch_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Fetch complete message stream for a specific reality fork."""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["user_id"])
    try:
        messages = get_branch_messages(db=db, user_id=user_id, branch_id=branch_id)
        return {"status": "success", "messages": messages, "data": messages}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch branch messages: {str(e)}")


@router.patch("/{branch_id}")
async def update_branch(
    branch_id: int,
    req: UpdateForkRequest,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Update branch name, description, or archive status."""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["user_id"])
    branch = db.query(ConversationBranch).filter(ConversationBranch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    if not validate_conversation_access(db, user_id, branch):
        raise HTTPException(status_code=403, detail="Access denied")

    if req.name is not None and req.name.strip():
        branch.name = req.name.strip()[:100]
    if req.description is not None:
        branch.description = req.description.strip() if req.description else None
    if req.is_archived is not None:
        branch.is_archived = req.is_archived

    db.commit()
    db.refresh(branch)
    return {"status": "success", "data": {"id": branch.id, "name": branch.name, "is_archived": branch.is_archived}}


@router.delete("/{branch_id}")
async def delete_or_archive_branch(
    branch_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Delete or archive a reality fork branch."""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["user_id"])
    branch = db.query(ConversationBranch).filter(ConversationBranch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    if not validate_conversation_access(db, user_id, branch):
        raise HTTPException(status_code=403, detail="Access denied")

    # Only creator or group owner/admin can delete
    if branch.created_by != user_id:
        raise HTTPException(status_code=403, detail="Only the fork creator can delete this branch")

    branch.is_archived = True
    db.commit()
    return {"status": "success", "message": "Branch archived successfully"}
