from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime

from auth import decode_token
from database import get_db
from models import User, UserBlock

router = APIRouter(prefix="/api/blocks", tags=["blocks"])


def get_current_user_id(token: str) -> int:
    payload = decode_token(token)
    if not payload or not payload.get("user_id"):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return int(payload["user_id"])


def is_blocked_bidirectional(db: Session, user_a: int, user_b: int) -> bool:
    """Return True if either user has blocked the other."""
    if not user_a or not user_b or user_a == user_b:
        return False
    block = db.query(UserBlock).filter(
        or_(
            (UserBlock.blocker_id == user_a) & (UserBlock.blocked_id == user_b),
            (UserBlock.blocker_id == user_b) & (UserBlock.blocked_id == user_a),
        )
    ).first()
    return block is not None


@router.post("/{target_user_id}")
def block_user(
    target_user_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    current_user_id = get_current_user_id(token)
    if current_user_id == target_user_id:
        raise HTTPException(status_code=400, detail="You cannot block yourself.")

    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Check if already blocked
    existing = db.query(UserBlock).filter(
        UserBlock.blocker_id == current_user_id,
        UserBlock.blocked_id == target_user_id
    ).first()

    if not existing:
        new_block = UserBlock(
            blocker_id=current_user_id,
            blocked_id=target_user_id,
            created_at=datetime.utcnow()
        )
        db.add(new_block)
        db.commit()

    return {
        "status": "success",
        "message": f"Successfully blocked {target_user.username}.",
        "blocked_id": target_user_id
    }


@router.delete("/{target_user_id}")
def unblock_user(
    target_user_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    current_user_id = get_current_user_id(token)

    block = db.query(UserBlock).filter(
        UserBlock.blocker_id == current_user_id,
        UserBlock.blocked_id == target_user_id
    ).first()

    if not block:
        raise HTTPException(status_code=404, detail="User is not currently blocked.")

    db.delete(block)
    db.commit()

    return {
        "status": "success",
        "message": "User unblocked.",
        "unblocked_id": target_user_id
    }


@router.get("")
def get_blocked_users(
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    current_user_id = get_current_user_id(token)

    blocks = db.query(UserBlock).filter(UserBlock.blocker_id == current_user_id).all()
    results = []
    for b in blocks:
        u = db.query(User).filter(User.id == b.blocked_id).first()
        if u:
            results.append({
                "id": u.id,
                "username": u.username,
                "avatar_url": u.avatar_url,
                "blocked_at": b.created_at.isoformat() if b.created_at else None
            })

    return results


@router.get("/check/{target_user_id}")
def check_block_status(
    target_user_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    current_user_id = get_current_user_id(token)
    i_blocked = db.query(UserBlock).filter(
        UserBlock.blocker_id == current_user_id,
        UserBlock.blocked_id == target_user_id
    ).first() is not None

    they_blocked = db.query(UserBlock).filter(
        UserBlock.blocker_id == target_user_id,
        UserBlock.blocked_id == current_user_id
    ).first() is not None

    return {
        "is_blocked": i_blocked or they_blocked,
        "i_blocked": i_blocked,
        "they_blocked": they_blocked
    }
