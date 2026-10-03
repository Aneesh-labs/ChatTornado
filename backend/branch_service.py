"""
Reality Forks Service
Handles conversation branching (Git-like DAG for chats with shared ancestry & divergent message model).
Zero unnecessary duplication: ancestors are referenced dynamically.
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from models import Message, MessageVisibility, ConversationBranch, GroupMember, User
from dna_service import get_conversation_key


def format_reactions(rxn_list):
    """Format SQLAlchemy MessageReaction list into UI-ready glyph list."""
    glyph_map = {}
    for r in rxn_list or []:
        g = getattr(r, "reaction", None)
        u = getattr(r, "user_id", None)
        if not g or u is None:
            continue
        if g not in glyph_map:
            glyph_map[g] = []
        if u not in glyph_map[g]:
            glyph_map[g].append(u)
    return [{"glyph": g, "users": u} for g, u in glyph_map.items()]


def validate_conversation_access(db: Session, user_id: int, branch: ConversationBranch) -> bool:
    """Validate whether user has permission to access a branch."""
    if branch.group_id:
        member = db.query(GroupMember).filter(
            GroupMember.group_id == branch.group_id,
            GroupMember.user_id == user_id
        ).first()
        return member is not None
    elif branch.dm_user1_id and branch.dm_user2_id:
        return user_id in (branch.dm_user1_id, branch.dm_user2_id)
    return False


def create_reality_fork(
    db: Session,
    user_id: int,
    fork_message_id: int,
    name: str,
    description: Optional[str] = None
) -> ConversationBranch:
    """Create a new Reality Fork branch starting from a specific message."""
    fork_msg = db.query(Message).filter(Message.id == fork_message_id).first()
    if not fork_msg:
        raise ValueError("Target message for fork not found")

    # Access check
    group_id = fork_msg.group_id
    dm_user1_id = None
    dm_user2_id = None

    if group_id:
        member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        ).first()
        if not member:
            raise PermissionError("You are not a member of this group")
    else:
        if user_id not in (fork_msg.sender_id, fork_msg.receiver_id):
            raise PermissionError("You are not a participant in this conversation")
        dm_user1_id = min(fork_msg.sender_id, fork_msg.receiver_id)
        dm_user2_id = max(fork_msg.sender_id, fork_msg.receiver_id)

    conv_key = get_conversation_key(dm_user1_id, dm_user2_id, group_id)

    clean_name = name.strip() if name and name.strip() else f"Fork #{fork_message_id}"
    branch = ConversationBranch(
        name=clean_name[:100],
        description=description.strip() if description else None,
        conversation_key=conv_key,
        group_id=group_id,
        dm_user1_id=dm_user1_id,
        dm_user2_id=dm_user2_id,
        parent_branch_id=fork_msg.branch_id,
        fork_message_id=fork_message_id,
        created_by=user_id,
        created_at=datetime.now(timezone.utc),
        is_archived=False
    )
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


def get_branch_messages(
    db: Session,
    user_id: int,
    branch_id: int
) -> List[Dict[str, Any]]:
    """Fetch all messages for a branch: ancestor messages up to fork point + branch-specific messages."""
    branch = db.query(ConversationBranch).filter(ConversationBranch.id == branch_id).first()
    if not branch:
        raise ValueError("Branch not found")

    if not validate_conversation_access(db, user_id, branch):
        raise PermissionError("Access denied to this branch")

    # 1. Fetch ancestor messages (up to fork_message_id)
    ancestor_query = (
        db.query(Message)
        .filter(
            Message.id <= branch.fork_message_id,
            or_(
                Message.branch_id == branch.parent_branch_id,
                Message.branch_id == None
            )
        )
    )
    if branch.group_id:
        ancestor_query = ancestor_query.filter(Message.group_id == branch.group_id)
    else:
        u1, u2 = branch.dm_user1_id, branch.dm_user2_id
        ancestor_query = ancestor_query.filter(
            or_(
                and_(Message.sender_id == u1, Message.receiver_id == u2),
                and_(Message.sender_id == u2, Message.receiver_id == u1)
            )
        )
    ancestors = ancestor_query.order_by(Message.created_at).all()

    # 2. Fetch divergent messages sent directly on this branch
    divergent_msgs = (
        db.query(Message)
        .filter(Message.branch_id == branch.id)
        .order_by(Message.created_at)
        .all()
    )

    combined = ancestors + divergent_msgs
    now = datetime.now(timezone.utc)

    result = []
    for msg in combined:
        # Check visibility
        vis = db.query(MessageVisibility).filter(
            MessageVisibility.message_id == msg.id,
            MessageVisibility.user_id == user_id
        ).first()
        if vis and not vis.visible:
            continue

        current_read_state = "read" if msg.receiver_id == user_id else getattr(msg, "read_state", "sent")
        is_locked = False
        message_content = msg.message

        u_iso = None
        if msg.is_shielded and msg.shield_mode == "timelock" and msg.unlock_at:
            unlock_time = msg.unlock_at
            if unlock_time.tzinfo is None:
                unlock_time = unlock_time.replace(tzinfo=timezone.utc)
            u_iso = unlock_time.isoformat()
            if unlock_time > now:
                is_locked = True
                if msg.receiver_id == user_id:
                    message_content = None

        result.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "group_id": msg.group_id,
            "branch_id": msg.branch_id,
            "is_branch_ancestor": msg.id <= branch.fork_message_id,
            "message": message_content,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
            "read_state": current_read_state,
            "reactions": format_reactions(getattr(msg, "reactions", [])),
            "is_shielded": msg.is_shielded,
            "shield_mode": msg.shield_mode,
            "unlock_at": u_iso,
            "is_locked": is_locked,
            "is_future_message": getattr(msg, "is_future_message", False)
        })

    return result


def list_conversation_branches(
    db: Session,
    user_id: int,
    dm_user2_id: Optional[int] = None,
    group_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """List all reality fork branches for a conversation."""
    conv_key = get_conversation_key(user_id, dm_user2_id, group_id)

    branches = (
        db.query(ConversationBranch)
        .filter(ConversationBranch.conversation_key == conv_key)
        .order_by(ConversationBranch.created_at.desc())
        .all()
    )

    result = []
    for b in branches:
        if not validate_conversation_access(db, user_id, b):
            continue

        msg_count = db.query(Message).filter(Message.branch_id == b.id).count()
        fork_snippet = b.fork_message.message[:60] if b.fork_message and b.fork_message.message else ""
        creator_name = b.creator.username if b.creator else "User"

        result.append({
            "id": b.id,
            "name": b.name,
            "description": b.description,
            "parent_branch_id": b.parent_branch_id,
            "fork_message_id": b.fork_message_id,
            "fork_snippet": fork_snippet,
            "created_by": b.created_by,
            "creator_name": creator_name,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "is_archived": b.is_archived,
            "divergent_message_count": msg_count
        })

    return result
