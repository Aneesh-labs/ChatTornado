from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from auth import decode_token
from database import get_db
from models import Message, MessageVisibility, MessageReaction
from schemas import MessageReactionData
from websocket_manager import manager

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
    result = []
    for msg in messages:
        # If this message was sent to user_id, it is now read
        current_read_state = "read" if msg.receiver_id == user_id else getattr(msg, "read_state", "sent")
        result.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "message": msg.message,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
            "read_state": current_read_state,
            "reactions": format_reactions(getattr(msg, "reactions", []))
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
# DELETE CHAT ENDPOINT
# ============================================================================

@router.post("/delete_chat/{other_user_id}")
def delete_chat(
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
