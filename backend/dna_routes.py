from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from auth import decode_token
from database import get_db
from models import User, Group, GroupMember, ConversationBranch
from dna_service import get_or_compute_dna
from block_routes import is_blocked_bidirectional

router = APIRouter(prefix="/api/dna", tags=["Conversation DNA"])


def parse_conversation_target(target: str, user_id: int, db: Session) -> tuple[Optional[int], Optional[int]]:
    """
    Parses 'target' into (dm_user2_id, group_id).
    Validates permissions.
    """
    if target.startswith("group:"):
        try:
            gid = int(target.replace("group:", ""))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid group identifier")
        
        # Check membership
        member = db.query(GroupMember).filter(GroupMember.group_id == gid, GroupMember.user_id == user_id).first()
        if not member:
            raise HTTPException(status_code=403, detail="You are not a member of this group")
        return None, gid
    else:
        try:
            other_id = int(target)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user identifier")

        if is_blocked_bidirectional(db, user_id, other_id):
            raise HTTPException(status_code=403, detail="Conversation is unavailable due to block state")

        other = db.query(User).filter(User.id == other_id).first()
        if not other:
            raise HTTPException(status_code=404, detail="Target user not found")
        return other_id, None


@router.get("/{target}")
async def get_conversation_dna(
    target: str,
    token: str = Query(...),
    branch_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieve Conversation DNA analysis for a DM, Group, or Reality Fork Branch."""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["user_id"])
    dm_user2_id, group_id = parse_conversation_target(target, user_id, db)

    # If branch_id is specified, validate branch access
    if branch_id:
        branch = db.query(ConversationBranch).filter(ConversationBranch.id == branch_id).first()
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        if branch.group_id and branch.group_id != group_id:
            raise HTTPException(status_code=403, detail="Branch does not belong to this group")
        if not branch.group_id and dm_user2_id:
            u1, u2 = sorted([user_id, dm_user2_id])
            if branch.dm_user1_id != u1 or branch.dm_user2_id != u2:
                raise HTTPException(status_code=403, detail="Branch does not belong to this conversation")

    try:
        metrics = get_or_compute_dna(
            db=db,
            user_id=user_id,
            dm_user2_id=dm_user2_id,
            group_id=group_id,
            branch_id=branch_id,
            force_refresh=False
        )
        return {"status": "success", "data": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Conversation DNA: {str(e)}")


@router.post("/refresh/{target}")
async def refresh_conversation_dna(
    target: str,
    token: str = Query(...),
    branch_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Force fresh re-computation of Conversation DNA."""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["user_id"])
    dm_user2_id, group_id = parse_conversation_target(target, user_id, db)

    try:
        metrics = get_or_compute_dna(
            db=db,
            user_id=user_id,
            dm_user2_id=dm_user2_id,
            group_id=group_id,
            branch_id=branch_id,
            force_refresh=True
        )
        return {"status": "success", "data": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh Conversation DNA: {str(e)}")
