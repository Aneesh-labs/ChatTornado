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
    current_user = db.query(User).filter(User.id == current_user_id).first()
    is_admin = current_user and current_user.role == "SUPER_ADMIN"

    query = db.query(User).filter(
        User.id != current_user_id,
        User.email != "vortex9@system.bot"
    )

    # Hide BlackShadow-ChatTornado and SUPER_ADMIN from regular users
    if not is_admin:
        query = query.filter(
            User.username != "BlackShadow-ChatTornado",
            User.role != "SUPER_ADMIN"
        )

    users = query.order_by(User.username).all()

    # Determine live status
    online_ids = set(manager.active_connections.keys())

    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "status": user.status if (user.id in online_ids or str(user.id) in online_ids) else "offline",
            "custom_status": user.custom_status,
            "is_verified": bool(getattr(user, "is_verified", False) or getattr(user, "email_verified", False)),
            "game_stats": getattr(user, "game_stats", {}) or {}
        }
        for user in users
    ]


@router.get("/user/{user_id}")
def get_user(
    user_id: int,
    token: str = "",
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

    # Hide admin from normal user lookup
    if user.username == "BlackShadow-ChatTornado" or user.role == "SUPER_ADMIN":
        payload = decode_token(token) if token else None
        if not payload or payload.get("user_id") != user.id:
            caller = db.query(User).filter(User.id == payload.get("user_id")).first() if payload else None
            if not caller or caller.role != "SUPER_ADMIN":
                raise HTTPException(status_code=404, detail="User not found.")

    online_ids = set(manager.active_connections.keys())
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "status": user.status if (user.id in online_ids or str(user.id) in online_ids) else "offline",
        "custom_status": user.custom_status,
        "is_verified": bool(getattr(user, "is_verified", False) or getattr(user, "email_verified", False)),
        "game_stats": getattr(user, "game_stats", {}) or {}
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
    current_user = db.query(User).filter(User.id == current_user_id).first()
    is_admin = current_user and current_user.role == "SUPER_ADMIN"

    query = (
        db.query(User)
        .filter(
            User.id != current_user_id,
            User.email != "vortex9@system.bot",
            or_(
                User.username.ilike(f"%{q}%"),
                User.email.ilike(f"%{q}%")
            )
        )
    )

    # Hide BlackShadow-ChatTornado from regular searches
    if not is_admin:
        query = query.filter(
            User.username != "BlackShadow-ChatTornado",
            User.role != "SUPER_ADMIN"
        )

    users = query.order_by(User.username).limit(20).all()

    online_ids = set(manager.active_connections.keys())
    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "status": user.status if (user.id in online_ids or str(user.id) in online_ids) else "offline",
            "custom_status": user.custom_status,
            "is_verified": bool(getattr(user, "is_verified", False) or getattr(user, "email_verified", False)),
            "game_stats": getattr(user, "game_stats", {}) or {}
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


@router.get("/user/portfolio")
def get_user_portfolio(
    token: str,
    db: Session = Depends(get_db)
):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token.")
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "onboarding_completed": getattr(user, "onboarding_completed", False),
        "portfolio_data": getattr(user, "portfolio_data", None)
    }


@router.post("/user/portfolio")
def save_user_portfolio(
    data: dict,
    token: str = "",
    db: Session = Depends(get_db)
):
    auth_token = token or data.get("token")
    if not auth_token:
        raise HTTPException(status_code=401, detail="Authorization token is required.")
    payload = decode_token(auth_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token.")
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    portfolio = data.get("portfolio") if data.get("portfolio") is not None else data.get("portfolio_data", {})
    user.portfolio_data = portfolio
    user.onboarding_completed = True
    
    if data.get("custom_status"):
        user.custom_status = data["custom_status"][:100]
        
    db.commit()
    db.refresh(user)
    return {
        "success": True,
        "message": "Portfolio updated successfully!",
        "onboarding_completed": True,
        "portfolio_data": user.portfolio_data
    }


@router.post("/user/game-score")
def save_game_score(
    data: dict,
    token: str = "",
    db: Session = Depends(get_db)
):
    auth_token = token or data.get("token")
    if not auth_token:
        raise HTTPException(status_code=401, detail="Authorization token is required.")
    payload = decode_token(auth_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token.")
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    game = str(data.get("game", "")).strip().lower()
    score = int(data.get("score", 0))
    if not game:
        raise HTTPException(status_code=400, detail="Game name is required.")
        
    current_stats = dict(user.game_stats or {})
    current_high = int(current_stats.get(game, 0))
    if score > current_high:
        current_stats[game] = score
        user.game_stats = current_stats
        db.commit()
        db.refresh(user)
        
    return {
        "success": True,
        "game": game,
        "high_score": current_stats.get(game, score),
        "game_stats": user.game_stats or {}
    }


@router.get("/user/stats")
def get_user_stats(
    token: str = "",
    db: Session = Depends(get_db)
):
    if not token:
        raise HTTPException(status_code=401, detail="Authorization token is required.")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token.")
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    game_stats = user.game_stats or {}
    highest_score = max(game_stats.values()) if game_stats else 0
    total_messages_sent = db.query(Message).filter(Message.sender_id == user.id).count()
    total_messages_received = db.query(Message).filter(Message.receiver_id == user.id).count()
    total_messages_all = db.query(Message).count()
    is_verified = bool(getattr(user, "is_verified", False) or getattr(user, "email_verified", False))
    
    return {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "is_verified": is_verified,
        "verification_status": "verified" if is_verified else "not verified",
        "game_stats": game_stats,
        "highest_game_score": highest_score,
        "total_messages_sent": total_messages_sent,
        "total_messages_received": total_messages_received,
        "total_messages_all": total_messages_all,
        "portfolio_data": getattr(user, "portfolio_data", None)
    }


@router.get("/user/{user_id}/stats")
def get_specific_user_stats(
    user_id: int,
    token: str = "",
    db: Session = Depends(get_db)
):
    if not token:
        raise HTTPException(status_code=401, detail="Authorization token is required.")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    game_stats = user.game_stats or {}
    highest_score = max(game_stats.values()) if game_stats else 0
    total_messages_sent = db.query(Message).filter(Message.sender_id == user.id).count()
    total_messages_received = db.query(Message).filter(Message.receiver_id == user.id).count()
    total_messages_all = db.query(Message).count()
    is_verified = bool(getattr(user, "is_verified", False) or getattr(user, "email_verified", False))
    
    return {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "is_verified": is_verified,
        "verification_status": "verified" if is_verified else "not verified",
        "game_stats": game_stats,
        "highest_game_score": highest_score,
        "total_messages_sent": total_messages_sent,
        "total_messages_received": total_messages_received,
        "total_messages_all": total_messages_all,
        "portfolio_data": getattr(user, "portfolio_data", None)
    }