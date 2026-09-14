from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from auth import decode_token
from database import get_db
from models import User, Connection
from schemas import ConnectionCreate, ConnectionAction
from websocket_manager import manager
import json

router = APIRouter()

@router.post("/connections/request")
async def send_connection_request(
    request: ConnectionCreate,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    sender_id = payload["user_id"]
    receiver_id = request.receiver_id
    
    if sender_id == receiver_id:
        raise HTTPException(status_code=400, detail="Cannot connect to yourself")
        
    # Check if a connection already exists
    existing = db.query(Connection).filter(
        or_(
            and_(Connection.sender_id == sender_id, Connection.receiver_id == receiver_id),
            and_(Connection.sender_id == receiver_id, Connection.receiver_id == sender_id)
        )
    ).first()
    
    if existing:
        if existing.status == "pending":
            raise HTTPException(status_code=400, detail="Request already pending")
        elif existing.status in ["accepted", "accept"]:
            raise HTTPException(status_code=400, detail="Already connected")
        else:
            # Re-activate declined request
            existing.status = "pending"
            existing.sender_id = sender_id
            existing.receiver_id = receiver_id
            db.commit()
            connection = existing
    else:
        connection = Connection(sender_id=sender_id, receiver_id=receiver_id, status="pending")
        db.add(connection)
        db.commit()
        db.refresh(connection)
        
    # Notify receiver via WebSocket
    if receiver_id in manager.active_connections:
        sender_user = db.query(User).filter(User.id == sender_id).first()
        await manager.send_personal_message(receiver_id, {
            "type": "connection_request",
            "connection_id": connection.id,
            "sender": {
                "id": sender_user.id,
                "username": sender_user.username,
                "avatar_url": sender_user.avatar_url
            }
        })
            
    return {"status": "success", "connection_id": connection.id}


@router.post("/connections/{connection_id}/action")
async def respond_connection_request(
    connection_id: int,
    action_data: ConnectionAction,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user_id = payload["user_id"]
    
    connection = db.query(Connection).filter(Connection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection request not found")
        
    status_value = "accepted" if action_data.action in ["accept", "accepted"] else "declined"
    connection.status = status_value
    db.commit()
    
    # Notify sender and receiver via WebSocket
    if status_value == "accepted":
        receiver_user = db.query(User).filter(User.id == user_id).first()
        sender_user = db.query(User).filter(User.id == connection.sender_id).first()
        
        if connection.sender_id in manager.active_connections and receiver_user:
            await manager.send_personal_message(connection.sender_id, {
                "type": "connection_accepted",
                "connection_id": connection.id,
                "user": {
                    "id": receiver_user.id,
                    "username": receiver_user.username,
                    "avatar_url": receiver_user.avatar_url
                }
            })
            
        if user_id in manager.active_connections and sender_user:
            await manager.send_personal_message(user_id, {
                "type": "connection_accepted",
                "connection_id": connection.id,
                "user": {
                    "id": sender_user.id,
                    "username": sender_user.username,
                    "avatar_url": sender_user.avatar_url
                }
            })
            
    return {"status": "success", "connection_status": connection.status}


@router.get("/connections/pending")
def get_pending_requests(
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user_id = payload["user_id"]
    
    requests = db.query(Connection).filter(
        Connection.receiver_id == user_id,
        Connection.status == "pending"
    ).all()
    
    result = []
    for req in requests:
        sender = db.query(User).filter(User.id == req.sender_id).first()
        result.append({
            "connection_id": req.id,
            "sender": {
                "id": sender.id,
                "username": sender.username,
                "avatar_url": sender.avatar_url
            },
            "created_at": req.created_at
        })
        
    return result


@router.get("/connections/active")
def get_active_connections(
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user_id = payload["user_id"]
    
    connections = db.query(Connection).filter(
        or_(
            and_(Connection.sender_id == user_id, Connection.status.in_(["accepted", "accept"])),
            and_(Connection.receiver_id == user_id, Connection.status.in_(["accepted", "accept"]))
        )
    ).all()
    
    friends = []
    for conn in connections:
        friend_id = conn.receiver_id if conn.sender_id == user_id else conn.sender_id
        friend = db.query(User).filter(User.id == friend_id).first()
        if friend:
            friends.append({
                "id": friend.id,
                "username": friend.username,
                "avatar_url": friend.avatar_url,
                "status": friend.status,
                "last_seen": friend.last_seen
            })
            
    return friends

@router.get("/connections/all")
def get_all_connection_statuses(
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user_id = payload["user_id"]
    
    connections = db.query(Connection).filter(
        or_(Connection.sender_id == user_id, Connection.receiver_id == user_id)
    ).all()
    
    result = {}
    for conn in connections:
        other_id = conn.receiver_id if conn.sender_id == user_id else conn.sender_id
        normalized_status = "accepted" if conn.status in ["accepted", "accept"] else ("declined" if conn.status in ["declined", "decline"] else conn.status)
        result[other_id] = {
            "connection_id": conn.id,
            "status": normalized_status,
            "is_sender": conn.sender_id == user_id
        }
        
    return result
