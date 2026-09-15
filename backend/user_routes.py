from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from auth import decode_token
from database import get_db
from models import User, Message, MessageVisibility, MessageReaction, Connection, RefreshToken
from websocket_manager import manager

router = APIRouter()


@router.get("/users")
def get_users(
    token: str,
    db: Session = Depends(get_db)
):
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid token."
        )

    current_user_id = payload["user_id"]

    users = (
        db.query(User)
        .filter(User.id != current_user_id, User.email != "vortex9@system.bot")
        .order_by(User.username)
        .all()
    )

    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
        for user in users
    ]


@router.get("/user/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email
    }


@router.get("/search-users")
def search_users(
    q: str = Query(..., min_length=1),
    token: str = "",
    db: Session = Depends(get_db)
):
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid token."
        )

    current_user_id = payload["user_id"]

    users = (
        db.query(User)
        .filter(
            User.id != current_user_id,
            or_(
                User.username.ilike(f"%{q}%"),
                User.email.ilike(f"%{q}%")
            )
        )
        .order_by(User.username)
        .limit(20)
        .all()
    )

    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
        for user in users
    ]


@router.get("/online-users")
def get_online_users():
    return list(
        manager.active_connections.keys()
    )


# ============================================================================
# DELETE ACCOUNT PERMANENTLY ENDPOINT
# ============================================================================

@router.delete("/user/account")
@router.post("/user/delete-account")
async def delete_account(
    token: str,
    db: Session = Depends(get_db)
):
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid token."
        )

    user_id = payload["user_id"]

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    # 1. Collect all message IDs where the user was sender or receiver
    user_messages = db.query(Message.id).filter(
        or_(
            Message.sender_id == user_id,
            Message.receiver_id == user_id
        )
    ).all()
    user_msg_ids = [m.id for m in user_messages]

    # 2. Delete MessageReaction rows (user's reactions or reactions on user's messages)
    if user_msg_ids:
        db.query(MessageReaction).filter(
            or_(
                MessageReaction.user_id == user_id,
                MessageReaction.message_id.in_(user_msg_ids)
            )
        ).delete(synchronize_session=False)
    else:
        db.query(MessageReaction).filter(MessageReaction.user_id == user_id).delete(synchronize_session=False)

    # 3. Delete MessageVisibility rows
    if user_msg_ids:
        db.query(MessageVisibility).filter(
            or_(
                MessageVisibility.user_id == user_id,
                MessageVisibility.message_id.in_(user_msg_ids)
            )
        ).delete(synchronize_session=False)
    else:
        db.query(MessageVisibility).filter(MessageVisibility.user_id == user_id).delete(synchronize_session=False)

    # 4. Delete Messages
    if user_msg_ids:
        db.query(Message).filter(Message.id.in_(user_msg_ids)).delete(synchronize_session=False)

    # 5. Delete Connections
    db.query(Connection).filter(
        or_(
            Connection.sender_id == user_id,
            Connection.receiver_id == user_id
        )
    ).delete(synchronize_session=False)

    # 6. Delete RefreshTokens
    db.query(RefreshToken).filter(RefreshToken.user_id == user_id).delete(synchronize_session=False)

    # 7. Delete User record
    db.delete(user)
    db.commit()

    # 8. Disconnect user websocket if connected
    try:
        manager.disconnect(user_id)
    except Exception:
        pass

    return {
        "success": True,
        "message": "Account and all associated data permanently deleted."
    }