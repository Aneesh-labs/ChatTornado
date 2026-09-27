"""
admin_routes.py — Direct Admin Dispatch API
Bypasses the LLM entirely. The frontend calls this endpoint directly
when in Admin Mode and the user issues a send/text/message command.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from database import SessionLocal
from models import Message, MessageVisibility, User
from auth import decode_token
from websocket_manager import manager

router = APIRouter(prefix="/api/admin", tags=["admin"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class AdminDispatchRequest(BaseModel):
    token: str
    target: str        # username, partial name, or user ID
    message: str


@router.post("/dispatch")
async def admin_dispatch(payload: AdminDispatchRequest, db: Session = Depends(get_db)):
    """
    Direct admin message dispatch — no LLM involved.
    Resolves target by username (exact, partial, prefix) or ID,
    saves the message, and pushes live WebSocket events to both parties.
    """
    # 1. Verify token
    token_data = decode_token(payload.token)
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    admin_id: int = token_data.get("user_id") or token_data.get("sub")
    if not admin_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    admin_id = int(admin_id)
    target_raw = payload.target.strip()
    msg_text = payload.message.strip()

    if not msg_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    print(f"👑 [ADMIN_DISPATCH] Admin {admin_id} → target='{target_raw}' | msg='{msg_text}'", flush=True)

    # 2. Resolve target user
    target_user = None
    if target_raw.isdigit():
        target_user = db.query(User).filter(User.id == int(target_raw)).first()
    else:
        # Exact match
        target_user = db.query(User).filter(func.lower(User.username) == target_raw.lower()).first()
        if not target_user:
            # Partial match (contains)
            target_user = db.query(User).filter(User.username.ilike(f"%{target_raw}%")).first()
        if not target_user and len(target_raw) >= 3:
            # Prefix match
            target_user = db.query(User).filter(User.username.ilike(f"{target_raw[:3]}%")).first()

    if not target_user:
        print(f"⚠️ [ADMIN_DISPATCH] No user found for target='{target_raw}'", flush=True)
        raise HTTPException(status_code=404, detail=f"No user matching '{target_raw}' found in the platform.")

    target_id = target_user.id
    print(f"👑 [ADMIN_DISPATCH] Resolved target: {target_user.username} (ID={target_id})", flush=True)

    # 3. Save message to DB
    b_msg = Message(
        sender_id=admin_id,
        receiver_id=target_id,
        message=msg_text,
        is_shielded=False,
        read_state="sent"
    )
    db.add(b_msg)
    db.commit()
    db.refresh(b_msg)

    db.add_all([
        MessageVisibility(message_id=b_msg.id, user_id=admin_id, visible=True),
        MessageVisibility(message_id=b_msg.id, user_id=target_id, visible=True),
    ])
    db.commit()

    msg_payload = {
        "type": "message",
        "id": b_msg.id,
        "sender_id": admin_id,
        "receiver_id": target_id,
        "message": msg_text,
        "created_at": str(b_msg.created_at),
        "is_shielded": False,
        "is_locked": False,
        "read_state": "sent",
        "reactions": []
    }

    # 4. Push live to recipient
    await manager.send_personal_message(target_id, msg_payload)
    # 5. Push live to admin (appears in their outbox)
    await manager.send_personal_message(admin_id, msg_payload)

    print(f"👑 [ADMIN_DISPATCH SUCCESS] msg_id={b_msg.id} | Admin {admin_id} → {target_user.username} ({target_id})", flush=True)

    return {
        "ok": True,
        "message_id": b_msg.id,
        "to": target_user.username,
        "to_id": target_id,
        "message": msg_text,
    }


from typing import Optional

class AdminDeleteRequest(BaseModel):
    token: str
    message_id: Optional[int] = None
    target: Optional[str] = None       # username, partial name, or user ID
    mode: Optional[str] = "last"       # "id", "last", "all", "text"
    text_query: Optional[str] = None


@router.post("/delete")
async def admin_delete_message(payload: AdminDeleteRequest, db: Session = Depends(get_db)):
    """
    Direct admin message deletion — bypasses LLM entirely.
    Allows admin to delete specific message IDs, the last message sent to a user,
    or all messages with a user, broadcasting live deletion packets via WebSocket.
    """
    token_data = decode_token(payload.token)
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    admin_id: int = token_data.get("user_id") or token_data.get("sub")
    if not admin_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")
    admin_id = int(admin_id)

    print(f"👑 [ADMIN_DELETE] Admin {admin_id} delete request: mode={payload.mode} | msg_id={payload.message_id} | target={payload.target}", flush=True)

    # Helper function to delete a message and broadcast live
    async def delete_and_broadcast(msg: Message):
        db.query(MessageVisibility).filter(
            MessageVisibility.message_id == msg.id
        ).update({"visible": False}, synchronize_session=False)
        db.commit()

        delete_packet = {
            "type": "delete_message",
            "message_id": msg.id
        }
        try:
            await manager.send_personal_message(msg.sender_id, delete_packet)
        except Exception:
            pass
        try:
            await manager.send_personal_message(msg.receiver_id, delete_packet)
        except Exception:
            pass

    # 1. Delete by specific Message ID
    if payload.message_id:
        msg = db.query(Message).filter(Message.id == payload.message_id).first()
        if not msg:
            raise HTTPException(status_code=404, detail=f"Message ID #{payload.message_id} not found.")
        
        target_name = "User"
        target_user = db.query(User).filter(User.id == (msg.receiver_id if msg.sender_id == admin_id else msg.sender_id)).first()
        if target_user:
            target_name = target_user.username

        await delete_and_broadcast(msg)
        print(f"👑 [ADMIN_DELETE SUCCESS] Deleted message #{msg.id} ({target_name}): '{msg.message}'", flush=True)
        return {
            "ok": True,
            "deleted_count": 1,
            "message_id": msg.id,
            "target": target_name,
            "preview": msg.message,
            "summary": f"Deleted message #{msg.id} (\"{msg.message}\") with {target_name}."
        }

    # Helper to resolve target user
    target_user = None
    target_id = None
    if payload.target:
        target_raw = payload.target.strip()
        if target_raw.isdigit():
            target_user = db.query(User).filter(User.id == int(target_raw)).first()
        else:
            target_user = db.query(User).filter(func.lower(User.username) == target_raw.lower()).first()
            if not target_user:
                target_user = db.query(User).filter(User.username.ilike(f"%{target_raw}%")).first()
            if not target_user and len(target_raw) >= 3:
                target_user = db.query(User).filter(User.username.ilike(f"{target_raw[:3]}%")).first()

        if not target_user:
            raise HTTPException(status_code=404, detail=f"No user matching '{target_raw}' found.")
        target_id = target_user.id

    # 2. Delete ALL messages with a target user
    if payload.mode == "all" and target_id:
        messages = db.query(Message).filter(
            or_(
                and_(Message.sender_id == admin_id, Message.receiver_id == target_id),
                and_(Message.sender_id == target_id, Message.receiver_id == admin_id)
            )
        ).all()

        if not messages:
            return {
                "ok": True,
                "deleted_count": 0,
                "target": target_user.username,
                "summary": f"No messages found with {target_user.username} to delete."
            }

        for msg in messages:
            await delete_and_broadcast(msg)

        print(f"👑 [ADMIN_DELETE SUCCESS] Deleted all {len(messages)} messages with {target_user.username}", flush=True)
        return {
            "ok": True,
            "deleted_count": len(messages),
            "target": target_user.username,
            "summary": f"Deleted all {len(messages)} messages in conversation with **{target_user.username}**."
        }

    # 3. Delete by text query
    if payload.text_query:
        query = db.query(Message).filter(Message.message.ilike(f"%{payload.text_query.strip()}%"))
        if target_id:
            query = query.filter(
                or_(
                    and_(Message.sender_id == admin_id, Message.receiver_id == target_id),
                    and_(Message.sender_id == target_id, Message.receiver_id == admin_id)
                )
            )
        msg = query.order_by(Message.id.desc()).first()
        if not msg:
            raise HTTPException(status_code=404, detail=f"No message matching text '{payload.text_query}' found.")

        target_u = db.query(User).filter(User.id == (msg.receiver_id if msg.sender_id == admin_id else msg.sender_id)).first()
        target_name = target_u.username if target_u else "User"

        await delete_and_broadcast(msg)
        print(f"👑 [ADMIN_DELETE SUCCESS] Deleted matching message #{msg.id}: '{msg.message}'", flush=True)
        return {
            "ok": True,
            "deleted_count": 1,
            "message_id": msg.id,
            "target": target_name,
            "preview": msg.message,
            "summary": f"Deleted message #{msg.id} (\"{msg.message}\") with {target_name}."
        }

    # 4. Default: Delete LAST message sent to target (or last message sent by admin)
    query = db.query(Message)
    if target_id:
        query = query.filter(
            or_(
                and_(Message.sender_id == admin_id, Message.receiver_id == target_id),
                and_(Message.sender_id == target_id, Message.receiver_id == admin_id)
            )
        )
    else:
        query = query.filter(Message.sender_id == admin_id)

    last_msg = query.order_by(Message.id.desc()).first()
    if not last_msg:
        target_display = target_user.username if target_user else "any user"
        raise HTTPException(status_code=404, detail=f"No recent messages found with {target_display} to delete.")

    target_u = db.query(User).filter(User.id == (last_msg.receiver_id if last_msg.sender_id == admin_id else last_msg.sender_id)).first()
    target_name = target_u.username if target_u else "User"

    await delete_and_broadcast(last_msg)
    print(f"👑 [ADMIN_DELETE SUCCESS] Deleted last message #{last_msg.id} with {target_name}: '{last_msg.message}'", flush=True)
    return {
        "ok": True,
        "deleted_count": 1,
        "message_id": last_msg.id,
        "target": target_name,
        "preview": last_msg.message,
        "summary": f"Deleted last message #{last_msg.id} (\"{last_msg.message}\") with **{target_name}**."
    }

