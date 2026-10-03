from datetime import datetime, timezone
from typing import Optional
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from auth import decode_token
from database import get_db, SessionLocal
from models import Message, MessageVisibility, MessageReaction, User
from schemas import MessageReactionData, SendMessageRequest
from websocket_manager import manager
from block_routes import is_blocked_bidirectional
from diagnostics import log_message_event, log_message_error, generate_correlation_id

logger = logging.getLogger("chat_tornado.message_routes")
router = APIRouter()


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



@router.get("/messages/{other_user_id}")
async def get_messages(
    other_user_id: int,
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

    messages = (
        db.query(Message)
        .join(
            MessageVisibility,
            Message.id == MessageVisibility.message_id
        )
        .filter(
            MessageVisibility.user_id == user_id,
            MessageVisibility.visible == True,
            or_(
                and_(
                    Message.sender_id == user_id,
                    Message.receiver_id == other_user_id
                ),
                and_(
                    Message.sender_id == other_user_id,
                    Message.receiver_id == user_id
                )
            )
        )
        .order_by(Message.created_at)
        .all()
    )

    # ✅ Mark incoming unread messages as read
    db.query(Message).filter(
        Message.sender_id == other_user_id,
        Message.receiver_id == user_id,
        Message.read_state != "read"
    ).update({"read_state": "read"}, synchronize_session=False)
    db.commit()

    try:
        await manager.send_personal_message(other_user_id, {
            "type": "read_receipt",
            "reader_id": user_id
        })
    except Exception:
        pass

    # ✅ Convert to list of dicts
    now = datetime.now(timezone.utc)
    
    result = []
    for msg in messages:
        # If this message was sent to user_id, it is now read
        current_read_state = "read" if msg.receiver_id == user_id else getattr(msg, "read_state", "sent")
        
        # Shield logic
        is_locked = False
        message_content = msg.message
        
        u_iso = None
        if msg.is_shielded and msg.shield_mode == "timelock" and msg.unlock_at:
            # Ensure unlock_at is timezone aware for comparison
            unlock_time = msg.unlock_at
            if unlock_time.tzinfo is None:
                unlock_time = unlock_time.replace(tzinfo=timezone.utc)
                
            u_iso = unlock_time.isoformat()
            if not u_iso.endswith('Z') and '+' not in u_iso:
                u_iso += 'Z'

            if unlock_time > now:
                # Still locked
                is_locked = True
                if msg.receiver_id == user_id:
                    # Withhold payload from recipient
                    message_content = None
                else:
                    # Sender can see it, but we mark it as locked for UI
                    is_locked = True

        result.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "group_id": msg.group_id,
            "branch_id": getattr(msg, "branch_id", None),
            "message": message_content,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
            "read_state": current_read_state,
            "reactions": format_reactions(getattr(msg, "reactions", [])),
            "is_shielded": msg.is_shielded,
            "shield_mode": msg.shield_mode,
            "unlock_at": u_iso,
            "is_locked": is_locked,
            "is_future_message": getattr(msg, "is_future_message", False),
            "future_message_id": getattr(msg, "future_message_id", None)
        })

    return result


# ============================================================================
# DELETE MESSAGE ENDPOINT
# ============================================================================
@router.post("/delete_message/{message_id}")
async def delete_message(
    message_id: int,
    mode: str,
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

    message = (
        db.query(Message)
        .filter(Message.id == message_id)
        .first()
    )

    if message is None:
        raise HTTPException(
            status_code=404,
            detail="Message not found."
        )

    # ✅ Allow delete for "me" mode for any participant
    if mode == "me":
        # Anyone in the conversation can delete for themselves
        if message.sender_id != user_id and message.receiver_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="You are not a participant in this message."
            )
    else:
        # For "receiver" or "both" mode, only sender can delete
        if message.sender_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Only the sender can delete for others."
            )

    # Delete logic
    if mode == "me":
        visibility = (
            db.query(MessageVisibility)
            .filter(
                MessageVisibility.message_id == message_id,
                MessageVisibility.user_id == user_id
            )
            .first()
        )

        if visibility:
            visibility.visible = False

        await manager.send_personal_message(user_id, {
            "type": "delete_message",
            "message_id": message_id
        })

    elif mode == "receiver":
        visibility = (
            db.query(MessageVisibility)
            .filter(
                MessageVisibility.message_id == message_id,
                MessageVisibility.user_id == message.receiver_id
            )
            .first()
        )

        if visibility:
            visibility.visible = False

        await manager.send_personal_message(message.receiver_id, {
            "type": "delete_message",
            "message_id": message_id
        })

    elif mode == "both":
        db.query(MessageVisibility).filter(
            MessageVisibility.message_id == message_id
        ).update({"visible": False}, synchronize_session=False)

        delete_packet = {
            "type": "delete_message",
            "message_id": message_id
        }
        await manager.send_personal_message(message.sender_id, delete_packet)
        await manager.send_personal_message(message.receiver_id, delete_packet)

    db.commit()

    return {
        "success": True,
        "message_id": message_id,
        "mode": mode
    }

# ============================================================================
# DELETE CHAT ENDPOINT (Permanently wipe conversation)
# ============================================================================

@router.delete("/messages/conversation/{other_user_id}")
@router.post("/delete_chat/{other_user_id}")
async def delete_chat_conversation(
    other_user_id: int,
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

    # Find all messages between user and other_user
    messages = (
        db.query(Message.id)
        .filter(
            or_(
                and_(
                    Message.sender_id == user_id,
                    Message.receiver_id == other_user_id
                ),
                and_(
                    Message.sender_id == other_user_id,
                    Message.receiver_id == user_id
                )
            )
        )
        .all()
    )

    message_ids = [msg.id for msg in messages]

    if message_ids:
        # Delete reactions, visibility, and message rows
        db.query(MessageReaction).filter(MessageReaction.message_id.in_(message_ids)).delete(synchronize_session=False)
        db.query(MessageVisibility).filter(MessageVisibility.message_id.in_(message_ids)).delete(synchronize_session=False)
        db.query(Message).filter(Message.id.in_(message_ids)).delete(synchronize_session=False)
        db.commit()

        # Broadcast real-time clear event to both users
        clear_packet = {
            "type": "chat_cleared",
            "cleared_by": user_id,
            "partner_id": other_user_id
        }
        await manager.send_personal_message(user_id, clear_packet)
        await manager.send_personal_message(other_user_id, clear_packet)

    return {
        "success": True,
        "message": "Conversation permanently deleted.",
        "count": len(message_ids)
    }


# ============================================================================
# DELETE ALL CHATS ENDPOINT
# ============================================================================

@router.post("/delete_all_chats")
def delete_all_chats(
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

    messages = (
        db.query(Message.id)
        .filter(
            or_(
                Message.sender_id == user_id,
                Message.receiver_id == user_id
            )
        )
        .all()
    )

    message_ids = [msg.id for msg in messages]

    if message_ids:
        db.query(MessageVisibility).filter(
            MessageVisibility.message_id.in_(message_ids),
            MessageVisibility.user_id == user_id
        ).update({"visible": False}, synchronize_session=False)

        db.commit()

    return {
        "success": True,
        "count": len(message_ids)
    }


# ============================================================================
# MESSAGE REACTION ENDPOINT (REST fallback)
# ============================================================================

@router.post("/messages/{message_id}/reaction")
async def toggle_message_reaction(
    message_id: int,
    data: MessageReactionData,
    token: str,
    db: Session = Depends(get_db)
):
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token.")

    user_id = payload["user_id"]
    emoji = data.reaction.strip() if data.reaction else ""
    if not emoji:
        raise HTTPException(status_code=400, detail="Reaction emoji cannot be empty.")

    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    if user_id not in (msg.sender_id, msg.receiver_id):
        raise HTTPException(status_code=403, detail="Not a participant in this conversation.")

    existing_rxn = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id,
        MessageReaction.user_id == user_id
    ).first()

    if existing_rxn:
        if existing_rxn.reaction == emoji:
            db.delete(existing_rxn)
        else:
            existing_rxn.reaction = emoji
            existing_rxn.updated_at = datetime.utcnow()
    else:
        new_rxn = MessageReaction(
            message_id=message_id,
            user_id=user_id,
            reaction=emoji,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(new_rxn)

    db.commit()

    all_rxns = db.query(MessageReaction).filter(MessageReaction.message_id == message_id).all()
    formatted = format_reactions(all_rxns)

    packet = {
        "type": "reaction",
        "message_id": message_id,
        "sender_id": user_id,
        "emoji": emoji,
        "reactions": formatted
    }

    other_user_id = msg.receiver_id if user_id == msg.sender_id else msg.sender_id
    await manager.send_personal_message(other_user_id, packet)
    await manager.send_personal_message(user_id, packet)

    return {"success": True, "reactions": formatted}


# ============================================================================
# UNLOCK CAPSULE ENDPOINT
# ============================================================================
@router.post("/messages/{message_id}/unlock")
async def unlock_message_capsule(
    message_id: int,
    token: str,
    db: Session = Depends(get_db)
):
    payload = decode_token(token)
    if not payload or "user_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token.")

    user_id = payload["user_id"]
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    if user_id not in (msg.sender_id, msg.receiver_id):
        raise HTTPException(status_code=403, detail="Not a participant.")

    now = datetime.now(timezone.utc)

    if msg.is_shielded and msg.shield_mode == "timelock" and msg.unlock_at:
        unlock_time = msg.unlock_at
        if unlock_time.tzinfo is None:
            unlock_time = unlock_time.replace(tzinfo=timezone.utc)
        if unlock_time > now:
            return {"is_locked": True, "message": None}

    return {
        "is_locked": False,
        "message": msg.message
    }

from pydantic import BaseModel
from datetime import timedelta

class EditMessageRequest(BaseModel):
    new_text: str

@router.put("/edit_message/{message_id}")
async def edit_message(
    message_id: int,
    data: EditMessageRequest,
    token: str,
    db: Session = Depends(get_db)
):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token.")

    user_id = payload["user_id"]
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    if msg.sender_id != user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own messages.")

    if datetime.utcnow() - msg.created_at > timedelta(minutes=30):
        raise HTTPException(status_code=400, detail="Cannot edit messages older than 30 minutes.")

    msg.message = data.new_text
    msg.is_edited = True
    db.commit()

    # Broadcast edit to users
    packet = {
        "type": "message_edited",
        "message_id": message_id,
        "new_text": data.new_text,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id
    }
    await manager.send_personal_message(msg.sender_id, packet)
    await manager.send_personal_message(msg.receiver_id, packet)

    return {"success": True, "message_id": message_id, "is_edited": True}


class AICleanupRequest(BaseModel):
    text: str
    token: Optional[str] = None

@router.post("/ai_cleanup")
async def ai_cleanup(
    data: AICleanupRequest,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    auth_token = token or data.token
    if not auth_token and authorization:
        auth_token = authorization.replace("Bearer ", "").strip()

    payload = decode_token(auth_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token.")

    from ai_service import ai_clean_text
    cleaned = await ai_clean_text(data.text)
    return {"success": True, "cleaned_text": cleaned}


class AISummarizeRequest(BaseModel):
    chat_text: str
    token: Optional[str] = None

@router.post("/ai_summarize")
async def ai_summarize(
    data: AISummarizeRequest,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    auth_token = token or data.token
    if not auth_token and authorization:
        auth_token = authorization.replace("Bearer ", "").strip()

    payload = decode_token(auth_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token.")

    from ai_service import ai_summarize_chat
    summary = await ai_summarize_chat(data.chat_text)
    return {"success": True, "summary": summary}


# ============================================================================
# GUARANTEED REST FALLBACK SEND ENDPOINT
# ============================================================================
@router.post("/messages/send")
async def send_message_rest(
    data: SendMessageRequest,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    auth_token = token
    if not auth_token and authorization:
        auth_token = authorization.replace("Bearer ", "").strip()

    payload = decode_token(auth_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    user_id = int(payload["user_id"])
    receiver_id = int(data.receiver_id)
    message_text = str(data.message).strip()
    temp_id = data.temp_id
    correlation_id = data.correlation_id or generate_correlation_id()

    if not message_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    log_message_event(
        logger,
        "REST_MESSAGE_RECEIVED",
        user_id=user_id,
        receiver_id=receiver_id,
        temp_id=temp_id,
        correlation_id=correlation_id
    )

    # Security & Moderation checks
    sender_user = db.query(User).filter(User.id == user_id).first()
    now_dt = datetime.utcnow()
    if sender_user and sender_user.account_status == "restricted":
        if sender_user.restricted_until and now_dt < sender_user.restricted_until:
            raise HTTPException(
                status_code=403,
                detail="Your account is temporarily restricted from sending messages."
            )
        elif sender_user.restricted_until and now_dt >= sender_user.restricted_until:
            sender_user.account_status = "active"
            sender_user.restricted_until = None
            sender_user.restriction_reason = None
            db.commit()

    if is_blocked_bidirectional(db, user_id, receiver_id):
        log_message_event(
            logger,
            "REST_MESSAGE_BLOCKED",
            user_id=user_id,
            receiver_id=receiver_id,
            temp_id=temp_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=403,
            detail="Unable to send message. Interaction with this user is blocked."
        )

    # Idempotency check
    if temp_id:
        existing_msg = db.query(Message).filter(
            Message.sender_id == user_id,
            Message.client_temp_id == temp_id
        ).first()
        if existing_msg:
            log_message_event(
                logger,
                "REST_MESSAGE_DUPLICATE_IGNORED",
                user_id=user_id,
                receiver_id=receiver_id,
                message_id=existing_msg.id,
                temp_id=temp_id,
                correlation_id=correlation_id
            )
            return {
                "status": "success",
                "id": existing_msg.id,
                "temp_id": temp_id,
                "sender_id": user_id,
                "receiver_id": receiver_id,
                "message": existing_msg.message,
                "created_at": existing_msg.created_at.isoformat() if existing_msg.created_at else None,
                "is_shielded": existing_msg.is_shielded,
                "shield_mode": existing_msg.shield_mode,
                "correlation_id": correlation_id
            }

    # Time-lock capsule handling
    unlock_at = None
    if data.unlock_at:
        try:
            from dateutil import parser
            unlock_at = parser.isoparse(data.unlock_at)
        except Exception:
            pass

    try:
        new_message = Message(
            sender_id=user_id,
            receiver_id=receiver_id,
            message=message_text,
            is_shielded=data.is_shielded,
            shield_mode=data.shield_mode,
            unlock_at=unlock_at,
            client_temp_id=temp_id,
            correlation_id=correlation_id,
            read_state="sent"
        )
        db.add(new_message)
        db.commit()
        db.refresh(new_message)

        db.add_all([
            MessageVisibility(message_id=new_message.id, user_id=user_id, visible=True),
            MessageVisibility(message_id=new_message.id, user_id=receiver_id, visible=True)
        ])
        db.commit()
        log_message_event(
            logger,
            "REST_DB_COMMIT_SUCCESS",
            user_id=user_id,
            receiver_id=receiver_id,
            message_id=new_message.id,
            temp_id=temp_id,
            correlation_id=correlation_id
        )
    except Exception as db_err:
        db.rollback()
        log_message_error(
            logger,
            "REST_DB_COMMIT_FAILED",
            str(db_err),
            user_id=user_id,
            receiver_id=receiver_id,
            temp_id=temp_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to persist message in database. Please retry."
        )

    # Construct and dispatch real-time WebSocket push (Decoupled delivery)
    now = datetime.now(timezone.utc)
    u_time = unlock_at if (unlock_at and unlock_at.tzinfo) else (unlock_at.replace(tzinfo=timezone.utc) if unlock_at else None)
    u_iso = u_time.isoformat() if u_time else None
    is_locked = bool(data.is_shielded and data.shield_mode == "timelock" and u_time and u_time > now)

    packet_sender = {
        "type": "message",
        "id": new_message.id,
        "temp_id": temp_id,
        "sender_id": user_id,
        "receiver_id": receiver_id,
        "message": message_text,
        "created_at": new_message.created_at.isoformat() if new_message.created_at else str(now),
        "is_shielded": data.is_shielded,
        "shield_mode": data.shield_mode,
        "unlock_at": u_iso,
        "is_locked": is_locked,
        "read_state": "sent",
        "reactions": [],
        "correlation_id": correlation_id
    }

    packet_receiver = dict(packet_sender)
    if is_locked:
        packet_receiver["message"] = None

    try:
        await manager.send_personal_message(receiver_id, packet_receiver)
        await manager.send_personal_message(user_id, packet_sender)
    except Exception as ws_err:
        logger.warning("Decoupled WS broadcast notice: %s", ws_err)

    # Check if receiver is bot
    is_bot = False
    bot = None
    target_u = db.query(User).filter(User.id == receiver_id).first()
    if target_u and (target_u.username == "VORTEX-9" or target_u.email == "vortex9@system.bot"):
        is_bot = True
        bot = target_u

    if is_bot and bot:
        from ai_service import process_user_message_to_bot
        async def trigger_bot():
            bot_db = SessionLocal()
            try:
                reply_text = await process_user_message_to_bot(
                    user_id,
                    message_text,
                    data.ai_mode or "DEFAULT",
                    bot_db,
                    ai_model=data.ai_model
                )
                bot_msg = Message(
                    sender_id=bot.id,
                    receiver_id=user_id,
                    message=reply_text,
                    is_shielded=False,
                    read_state="sent"
                )
                bot_db.add(bot_msg)
                bot_db.commit()
                bot_db.refresh(bot_msg)
                bot_db.add_all([
                    MessageVisibility(message_id=bot_msg.id, user_id=bot.id, visible=True),
                    MessageVisibility(message_id=bot_msg.id, user_id=user_id, visible=True),
                ])
                bot_db.commit()

                await manager.send_personal_message(user_id, {
                    "type": "message",
                    "id": bot_msg.id,
                    "sender_id": bot.id,
                    "receiver_id": user_id,
                    "message": reply_text,
                    "created_at": str(bot_msg.created_at),
                    "is_shielded": False,
                    "is_locked": False,
                    "read_state": "sent",
                    "reactions": []
                })
            except Exception as bot_err:
                logger.error("REST bot reply error: %s", bot_err)
            finally:
                bot_db.close()

        asyncio.create_task(trigger_bot())

    return {
        "status": "success",
        "id": new_message.id,
        "temp_id": temp_id,
        "sender_id": user_id,
        "receiver_id": receiver_id,
        "message": message_text,
        "created_at": new_message.created_at.isoformat() if new_message.created_at else None,
        "is_shielded": data.is_shielded,
        "shield_mode": data.shield_mode,
        "unlock_at": u_iso,
        "is_locked": is_locked,
        "correlation_id": correlation_id
    }



