from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from auth import decode_token
from database import get_db
from models import User
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
        .filter(User.id != current_user_id)
        .order_by(User.username)
        .all()
    )

    return [
        {
            "id": user.id,
            "username": user.username
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
        "username": user.username
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