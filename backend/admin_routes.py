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
