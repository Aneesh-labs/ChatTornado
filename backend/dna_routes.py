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
    Accepts:
      - 'group:123', 'group_123', 'g:123', 'g_123' -> (None, 123)
      - 'dm:123', 'dm_123', 'user:123', 'user_123', 'u:123', 'u_123', '123' -> (123, None)
      - Bot identifiers ('vortex', 'vortex-9', 'ai', or bot IDs)
    Validates permissions.
    """
    t = str(target).strip().lower()
    
    # 1. Check for explicit group prefix
    if t.startswith("group:") or t.startswith("group_") or t.startswith("g:") or t.startswith("g_"):
        clean_id = t.replace("group:", "").replace("group_", "").replace("g:", "").replace("g_", "")
        try:
            gid = int(clean_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid group identifier")
        
        member = db.query(GroupMember).filter(GroupMember.group_id == gid, GroupMember.user_id == user_id).first()
        if not member:
            raise HTTPException(status_code=403, detail="You are not a member of this group")
        return None, gid
    
    # 2. Check for DM prefix or clean integer or bot
    clean_id = t.replace("dm:", "").replace("dm_", "").replace("user:", "").replace("user_", "").replace("u:", "").replace("u_", "")
    other_id = None
    try:
        other_id = int(clean_id)
    except ValueError:
        # Check if it's a bot user by name or username
        bot = db.query(User).filter(
            or_(
                User.username.ilike(clean_id),
                User.username.ilike(f"%{clean_id}%"),
                User.is_bot == True
            )
        ).first()
        if bot:
            other_id = bot.id
        else:
            raise HTTPException(status_code=400, detail="Invalid user identifier")

    if other_id != user_id and is_blocked_bidirectional(db, user_id, other_id):
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
        return {**metrics, "status": "success", "data": metrics}
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
        return {**metrics, "status": "success", "data": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh Conversation DNA: {str(e)}")
