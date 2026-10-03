from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from auth import decode_token
from database import get_db
from models import User, Group, GroupMember, Message, MessageVisibility
from websocket_manager import manager

router = APIRouter(prefix="/api/groups", tags=["groups"])


class CreateGroupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    avatar_url: Optional[str] = None
    initial_member_ids: Optional[List[int]] = Field(default_factory=list)


class UpdateGroupRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    avatar_url: Optional[str] = None


class AddMembersRequest(BaseModel):
    user_ids: List[int] = Field(..., min_length=1)


class ChangeMemberRoleRequest(BaseModel):
    role: str = Field(..., description="ADMIN or MEMBER")


def get_current_user_id(token: str) -> int:
    payload = decode_token(token)
    if not payload or not payload.get("user_id"):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return int(payload["user_id"])


def get_member_or_403(db: Session, group_id: int, user_id: int) -> GroupMember:
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group.")
    return member


@router.post("")
def create_group(
    payload: CreateGroupRequest,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    current_user_id = get_current_user_id(token)

    # Check user account status
    user = db.query(User).filter(User.id == current_user_id).first()
    if user and user.account_status == "restricted":
        raise HTTPException(status_code=403, detail="Your account is restricted from creating groups.")

    new_group = Group(
        name=payload.name.strip(),
        avatar_url=payload.avatar_url,
        created_by=current_user_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    # Add creator as OWNER
    owner_member = GroupMember(
        group_id=new_group.id,
        user_id=current_user_id,
        role="OWNER",
        joined_at=datetime.utcnow()
    )
    db.add(owner_member)

    # Add initial members
    added_members = [current_user_id]
    if payload.initial_member_ids:
        from block_routes import is_blocked_bidirectional
        for uid in payload.initial_member_ids:
            if uid == current_user_id or uid in added_members:
                continue
            # Don't add admin account or blocked users
            u = db.query(User).filter(User.id == uid).first()
            if not u or u.role == "SUPER_ADMIN" or u.username == "BlackShadow-ChatTornado":
                continue
            if is_blocked_bidirectional(db, current_user_id, uid):
                continue

            db.add(GroupMember(
                group_id=new_group.id,
                user_id=uid,
                role="MEMBER",
                joined_at=datetime.utcnow()
            ))
            added_members.append(uid)

    db.commit()

    return {
        "status": "success",
        "group": {
            "id": new_group.id,
            "name": new_group.name,
            "avatar_url": new_group.avatar_url,
            "created_by": new_group.created_by,
            "member_count": len(added_members),
            "created_at": new_group.created_at.isoformat()
        }
    }


@router.get("")
def list_my_groups(
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    current_user_id = get_current_user_id(token)

    memberships = db.query(GroupMember).filter(GroupMember.user_id == current_user_id).all()
    group_ids = [m.group_id for m in memberships]
    if not group_ids:
        return []

    groups = db.query(Group).filter(Group.id.in_(group_ids)).all()
    role_map = {m.group_id: m.role for m in memberships}

    results = []
    for g in groups:
        count = db.query(GroupMember).filter(GroupMember.group_id == g.id).count()
        last_msg = db.query(Message).filter(Message.group_id == g.id).order_by(Message.id.desc()).first()

        results.append({
            "id": g.id,
            "name": g.name,
            "avatar_url": g.avatar_url,
            "created_by": g.created_by,
            "my_role": role_map.get(g.id, "MEMBER"),
            "member_count": count,
            "created_at": g.created_at.isoformat() if g.created_at else None,
            "last_message": {
                "id": last_msg.id,
                "sender_id": last_msg.sender_id,
                "message": last_msg.message,
                "created_at": last_msg.created_at.isoformat()
            } if last_msg else None
        })

    return results


@router.get("/{group_id}")
def get_group_details(
    group_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    current_user_id = get_current_user_id(token)
    my_membership = get_member_or_403(db, group_id, current_user_id)

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    member_list = []
    for m in members:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            is_live = u.id in manager.active_connections or str(u.id) in manager.active_connections
            member_list.append({
                "id": u.id,
                "username": u.username,
                "avatar_url": u.avatar_url,
                "status": u.status if is_live else "offline",
                "custom_status": u.custom_status,
                "role": m.role,
                "joined_at": m.joined_at.isoformat() if m.joined_at else None
            })

    return {
        "id": group.id,
        "name": group.name,
        "avatar_url": group.avatar_url,
        "created_by": group.created_by,
        "my_role": my_membership.role,
        "members": member_list,
        "member_count": len(member_list),
        "created_at": group.created_at.isoformat() if group.created_at else None
    }


@router.put("/{group_id}")
def update_group(
    group_id: int,
    payload: UpdateGroupRequest,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    current_user_id = get_current_user_id(token)
    my_membership = get_member_or_403(db, group_id, current_user_id)

    if my_membership.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only group owner or admin can update group settings.")

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    if payload.name is not None and payload.name.strip():
        group.name = payload.name.strip()
    if payload.avatar_url is not None:
        group.avatar_url = payload.avatar_url.strip() or None

    group.updated_at = datetime.utcnow()
    db.commit()

    return {
        "status": "success",
        "name": group.name,
        "avatar_url": group.avatar_url
    }


@router.post("/{group_id}/members")
def add_group_members(
    group_id: int,
    payload: AddMembersRequest,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    current_user_id = get_current_user_id(token)
    my_membership = get_member_or_403(db, group_id, current_user_id)

    if my_membership.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only group owner or admin can add members.")

    from block_routes import is_blocked_bidirectional

    added = []
    for uid in payload.user_ids:
        # Check if already member
        exists = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == uid
        ).first()
        if exists:
            continue

        target_u = db.query(User).filter(User.id == uid).first()
        if not target_u or target_u.role == "SUPER_ADMIN" or target_u.username == "BlackShadow-ChatTornado":
            continue

        if is_blocked_bidirectional(db, current_user_id, uid):
            continue

        new_m = GroupMember(
            group_id=group_id,
            user_id=uid,
            role="MEMBER",
            joined_at=datetime.utcnow()
        )
        db.add(new_m)
        added.append(uid)

    db.commit()
    return {"status": "success", "added_count": len(added), "added_user_ids": added}


@router.delete("/{group_id}/members/{target_user_id}")
def remove_group_member(
    group_id: int,
    target_user_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    current_user_id = get_current_user_id(token)
    my_membership = get_member_or_403(db, group_id, current_user_id)

    # Target member
    target_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == target_user_id
    ).first()
    if not target_membership:
        raise HTTPException(status_code=404, detail="User is not a member of this group.")

    # Permissions:
    # 1. Leaving: current_user_id == target_user_id
    if current_user_id == target_user_id:
        if target_membership.role == "OWNER":
            # If owner leaves, check if there are other members
            other_member = db.query(GroupMember).filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id != current_user_id
            ).first()
            if other_member:
                other_member.role = "OWNER"
            else:
                # Last member leaving -> delete group
                group = db.query(Group).filter(Group.id == group_id).first()
                if group:
                    db.delete(group)
                    db.commit()
                    return {"status": "success", "message": "Group deleted as owner was last member."}

        db.delete(target_membership)
        db.commit()
        return {"status": "success", "message": "You left the group."}

    # 2. Removing others:
    if my_membership.role == "OWNER":
        # OWNER can remove anyone
        db.delete(target_membership)
        db.commit()
        return {"status": "success", "message": "Member removed."}

    if my_membership.role == "ADMIN":
        # ADMIN can remove MEMBER, but not OWNER or other ADMIN
        if target_membership.role in ["OWNER", "ADMIN"]:
            raise HTTPException(status_code=403, detail="Admins cannot remove other admins or group owner.")
        db.delete(target_membership)
        db.commit()
        return {"status": "success", "message": "Member removed."}

    raise HTTPException(status_code=403, detail="You do not have permission to remove members.")


@router.put("/{group_id}/members/{target_user_id}/role")
def change_member_role(
    group_id: int,
    target_user_id: int,
    payload: ChangeMemberRoleRequest,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    current_user_id = get_current_user_id(token)
    my_membership = get_member_or_403(db, group_id, current_user_id)

    if my_membership.role != "OWNER":
        raise HTTPException(status_code=403, detail="Only group owner can change member roles.")

    target_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == target_user_id
    ).first()
    if not target_membership:
        raise HTTPException(status_code=404, detail="User is not a member of this group.")

    new_role = payload.role.upper().strip()
    if new_role not in ["ADMIN", "MEMBER"]:
        raise HTTPException(status_code=400, detail="Role must be ADMIN or MEMBER.")

    target_membership.role = new_role
    db.commit()

    return {"status": "success", "new_role": new_role}


@router.get("/{group_id}/messages")
def get_group_messages(
    group_id: int,
    token: str = Query(...),
    limit: int = 50,
    before_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    current_user_id = get_current_user_id(token)
    get_member_or_403(db, group_id, current_user_id)

    query = db.query(Message).filter(Message.group_id == group_id)
    if before_id:
        query = query.filter(Message.id < before_id)

    messages = query.order_by(Message.id.asc()).limit(limit).all()

    results = []
    for m in messages:
        sender_u = db.query(User).filter(User.id == m.sender_id).first()
        results.append({
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_name": sender_u.username if sender_u else "User",
            "group_id": m.group_id,
            "branch_id": getattr(m, "branch_id", None),
            "message": m.message,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "is_shielded": m.is_shielded,
            "read_state": m.read_state,
            "is_future_message": getattr(m, "is_future_message", False),
            "future_message_id": getattr(m, "future_message_id", None),
            "reactions": []
        })

    return results


@router.delete("/{group_id}")
def delete_group(
    group_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    current_user_id = get_current_user_id(token)
    my_membership = get_member_or_403(db, group_id, current_user_id)

    if my_membership.role != "OWNER":
        raise HTTPException(status_code=403, detail="Only group owner can delete the group.")

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    db.delete(group)
    db.commit()

    return {"status": "success", "message": "Group deleted."}
