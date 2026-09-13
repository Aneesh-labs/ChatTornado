from datetime import datetime
import logging

from fastapi import APIRouter, WebSocket
from starlette.websockets import WebSocketDisconnect
from sqlalchemy.orm import Session

from auth import decode_token
from database import SessionLocal
from models import Message, MessageVisibility, MessageReaction
from websocket_manager import manager, ghost_manager

router = APIRouter()
logger = logging.getLogger("chat_tornado.websocket")


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):

    token = websocket.query_params.get("token")

    if token is None:
        await websocket.close()
        return

    payload = decode_token(token)

    if payload is None:
        await websocket.close()
        return

    user_id = payload["user_id"]

    await manager.connect(user_id, websocket)
    logger.info("WebSocket connected: user=%s", user_id)

    await manager.broadcast_online_users()

    db: Session = SessionLocal()

    try:

        while True:

            data = await websocket.receive_json()

            if not isinstance(data, dict):
                continue

            # WebRTC signaling is deliberately relayed only to the named peer.
            # Media never passes through FastAPI; it remains encrypted peer-to-peer.
            if data.get("type") == "signal":
                receiver_id = data.get("receiver_id")
                signal = data.get("signal")
                if isinstance(receiver_id, int) and isinstance(signal, dict):
                    logger.info("WebRTC %s: %s -> %s", signal.get("type", "signal"), user_id, receiver_id)
                    await manager.send_personal_message(receiver_id, {
                        "type": "signal", "sender_id": user_id, "signal": signal,
                    })
                continue

            # ---------- Ghost Chat ----------
            if data.get("type") == "ghost_start":

                receiver_id = data.get("receiver_id")

                if not isinstance(receiver_id, int):
                    continue
                receiver_id = int(receiver_id)

                # Prevent duplicate sessions
                if ghost_manager.exists(user_id, receiver_id):
                    continue

                # Create temporary session in RAM
                ghost_manager.create(user_id, receiver_id)

                logger.info(
                    "Ghost Chat started: %s <-> %s",
                    user_id,
                    receiver_id
                )

                # Notify receiver
                await manager.send_personal_message(
                    receiver_id,
                    {
                        "type": "ghost_invite",
                        "sender_id": user_id
                    }
                )

                continue

            # ---------- Ghost Chat Accept ----------
            if data.get("type") == "ghost_accept":

                receiver_id = data.get("receiver_id")

                if not isinstance(receiver_id, int):
                    continue

                # Make sure the Ghost session exists
                if not ghost_manager.exists(user_id, receiver_id):
                    continue

                logger.info(
                    "Ghost Chat connected: %s <-> %s",
                    user_id,
                    receiver_id
                )

                packet = {
                    "type": "ghost_connected"
                }

                # Notify both participants
                await manager.send_personal_message(
                    user_id,
                    packet
                )

                await manager.send_personal_message(
                    receiver_id,
                    packet
                )

                continue

            # ---------- Ghost Chat Message ----------
            if data.get("type") == "ghost_message":

                receiver_id = data.get("receiver_id")
                message_text = str(data.get("message", "")).strip()

                if not isinstance(receiver_id, int):
                    continue

                receiver_id = int(receiver_id)

                if not message_text:
                    continue

                # Make sure the Ghost session exists
                if not ghost_manager.exists(user_id, receiver_id):
                    continue

                packet = {
                    "type": "ghost_message",
                    "sender_id": user_id,
                    "receiver_id": receiver_id,
                    "message": message_text,
                }

                await manager.send_personal_message(
                    receiver_id,
                    packet
                )

                # Echo back so sender sees their own message
                await manager.send_personal_message(
                    user_id,
                    packet
                )

                continue

            # ---------- Ghost Chat Typing ----------
            if data.get("type") == "ghost_typing":

                receiver_id = data.get("receiver_id")

                if not isinstance(receiver_id, int):
                    continue

                receiver_id = int(receiver_id)

                if not ghost_manager.exists(user_id, receiver_id):
                    continue

                await manager.send_personal_message(
                    receiver_id,
                    {
                        "type": "ghost_typing",
                        "sender_id": user_id
                    }
                )

                continue

            # ---------- Ghost Chat Stop Typing ----------
            if data.get("type") == "ghost_stop_typing":

                receiver_id = data.get("receiver_id")

                if not isinstance(receiver_id, int):
                    continue

                receiver_id = int(receiver_id)

                if not ghost_manager.exists(user_id, receiver_id):
                    continue

                await manager.send_personal_message(
                    receiver_id,
                    {
                        "type": "ghost_stop_typing",
                        "sender_id": user_id
                    }
                )

                continue

            # ---------- Ghost Chat Close ----------
            if data.get("type") == "ghost_close":

                receiver_id = data.get("receiver_id")

                if not isinstance(receiver_id, int):
                    continue

                receiver_id = int(receiver_id)

                if not ghost_manager.exists(user_id, receiver_id):
                    continue

                # Remove session from RAM
                ghost_manager.remove(user_id, receiver_id)

                logger.info(
                    "Ghost Chat closed: %s <-> %s",
                    user_id,
                    receiver_id
                )

                packet = {
                    "type": "ghost_closed",
                    "sender_id": user_id
                }

                # Notify both participants
                await manager.send_personal_message(
                    receiver_id,
                    packet
                )

                await manager.send_personal_message(
                    user_id,
                    packet
                )

                continue

            # ==========================
            # Typing Indicator
            # ==========================

            if data.get("type") in {"typing_start", "typing_stop"}:

                receiver_id = data.get("receiver_id")

                if receiver_id is not None:

                    await manager.send_personal_message(
                        receiver_id,
                        {
                            "type": data["type"],
                            "sender_id": user_id
                        }
                    )

                continue

            # ==========================
            # Emoji Reaction (Database Persisted)
            # ==========================
            if data.get("type") == "reaction":
                message_id = data.get("message_id")
                emoji = data.get("emoji") or data.get("reaction")
                receiver_id = data.get("receiver_id")

                if message_id is not None and emoji:
                    try:
                        msg = db.query(Message).filter(Message.id == int(message_id)).first()
                        if msg and (user_id in (msg.sender_id, msg.receiver_id)):
                            other_user_id = msg.receiver_id if user_id == msg.sender_id else msg.sender_id

                            # Check for existing reaction by this user on this message
                            existing_rxn = db.query(MessageReaction).filter(
                                MessageReaction.message_id == msg.id,
                                MessageReaction.user_id == user_id
                            ).first()

                            if existing_rxn:
                                if existing_rxn.reaction == str(emoji).strip():
                                    # Clicking same emoji toggles it off
                                    db.delete(existing_rxn)
                                else:
                                    # Clicking different emoji changes the reaction
                                    existing_rxn.reaction = str(emoji).strip()
                                    existing_rxn.updated_at = datetime.utcnow()
                            else:
                                new_rxn = MessageReaction(
                                    message_id=msg.id,
                                    user_id=user_id,
                                    reaction=str(emoji).strip(),
                                    created_at=datetime.utcnow(),
                                    updated_at=datetime.utcnow()
                                )
                                db.add(new_rxn)

                            db.commit()

                            # Group all current reactions on this message by glyph
                            all_rxns = db.query(MessageReaction).filter(MessageReaction.message_id == msg.id).all()
                            glyph_map = {}
                            for r in all_rxns:
                                g = r.reaction
                                if g not in glyph_map:
                                    glyph_map[g] = []
                                glyph_map[g].append(r.user_id)
                            formatted_reactions = [{"glyph": g, "users": u} for g, u in glyph_map.items()]

                            reaction_packet = {
                                "type": "reaction",
                                "message_id": msg.id,
                                "sender_id": user_id,
                                "emoji": str(emoji).strip(),
                                "reactions": formatted_reactions
                            }

                            logger.info("Reaction saved: msg=%s, user=%s, emoji=%s", msg.id, user_id, emoji)
                            await manager.send_personal_message(other_user_id, reaction_packet)
                            await manager.send_personal_message(user_id, reaction_packet)
                    except Exception as rxn_err:
                        logger.exception("Error processing reaction: %s", rxn_err)
                        db.rollback()
                continue

            # ==========================
            # P2P Direct File Transfer Signals
            # ==========================
            if data.get("type") in {"p2p_offer", "p2p_request", "p2p_chunk", "p2p_complete", "p2p_wipe"}:
                receiver_id = data.get("receiver_id")
                if receiver_id is not None:
                    payload = dict(data)
                    payload["sender_id"] = user_id
                    await manager.send_personal_message(int(receiver_id), payload)
                continue

            # ==========================
            # Message Deletion Broadcast
            # ==========================
            if data.get("type") == "delete_message":
                receiver_id = data.get("receiver_id")
                message_id = data.get("message_id")
                delete_mode = data.get("mode", "both")  # "me", "both", "receiver"

                if message_id:
                    # Notify receiver if applicable
                    if receiver_id and delete_mode in ("both", "receiver"):
                        await manager.send_personal_message(int(receiver_id), {
                            "type": "message_deleted",
                            "message_id": message_id,
                            "sender_id": user_id
                        })
                    # Notify sender
                    if delete_mode in ("both", "me"):
                        await manager.send_personal_message(user_id, {
                            "type": "message_deleted",
                            "message_id": message_id,
                            "sender_id": user_id
                        })
                continue

            # ==========================
            # Capsule Unlock Handshake
            # ==========================
            if data.get("type") == "unlock_capsule":
                message_id = data.get("message_id")
                if message_id:
                    msg = db.query(Message).filter(Message.id == message_id).first()
                    if msg and msg.shield_mode == "timelock":
                        from datetime import timezone, datetime
                        now = datetime.now(timezone.utc)
                        unlock_time = msg.unlock_at
                        if unlock_time:
                            if unlock_time.tzinfo is None:
                                unlock_time = unlock_time.replace(tzinfo=timezone.utc)
                            
                            if unlock_time <= now:
                                unlock_packet = {
                                    "type": "capsule_unlocked",
                                    "message_id": msg.id,
                                    "message": msg.message
                                }
                                await manager.send_personal_message(msg.receiver_id, unlock_packet)
                                await manager.send_personal_message(msg.sender_id, unlock_packet)
                continue

            # ==========================
            # Validate Packet
            # ==========================

            receiver_id = data.get("receiver_id")
            message_text = str(
                data.get("message", "")
            ).strip()

            if receiver_id is None:
                continue

            if not message_text:
                continue

            temp_id = data.get("temp_id")

            # ==========================
            # Save Message
            # ==========================

            is_shielded = bool(data.get("is_shielded", False))
            shield_mode = data.get("shield_mode")
            
            unlock_at = None
            if data.get("unlock_at"):
                try:
                    from dateutil import parser
                    unlock_at = parser.isoparse(data.get("unlock_at"))
                except Exception:
                    pass

            new_message = Message(
                sender_id=user_id,
                receiver_id=receiver_id,
                message=message_text,
                is_shielded=is_shielded,
                shield_mode=shield_mode,
                unlock_at=unlock_at
            )

            db.add(new_message)
            db.commit()
            db.refresh(new_message)

            # ==========================
            # Visibility
            # ==========================

            db.add_all(
                [
                    MessageVisibility(
                        message_id=new_message.id,
                        user_id=user_id,
                        visible=True
                    ),
                    MessageVisibility(
                        message_id=new_message.id,
                        user_id=receiver_id,
                        visible=True
                    )
                ]
            )

            db.commit()

            # ==========================
            # Packet
            # ==========================

            packet_sender = {
                "type": "message",
                "id": new_message.id,
                "temp_id": temp_id,
                "sender_id": user_id,
                "receiver_id": receiver_id,
                "message": message_text,
                "created_at": str(new_message.created_at),
                "is_shielded": is_shielded,
                "shield_mode": shield_mode,
                "unlock_at": unlock_at.isoformat() if unlock_at else None,
                "is_locked": False
            }
            
            packet_receiver = dict(packet_sender)
            
            if is_shielded and shield_mode == "timelock" and unlock_at:
                from datetime import timezone, datetime
                now = datetime.now(timezone.utc)
                u_time = unlock_at if unlock_at.tzinfo else unlock_at.replace(tzinfo=timezone.utc)
                if u_time > now:
                    packet_receiver["message"] = None
                    packet_receiver["is_locked"] = True

            logger.info("Message: %s -> %s", user_id, receiver_id)

            # Send to receiver
            await manager.send_personal_message(
                receiver_id,
                packet_receiver
            )

            # Echo back to sender
            await manager.send_personal_message(
                user_id,
                packet_sender
            )

    except (WebSocketDisconnect, RuntimeError):

        manager.disconnect(user_id)
        ghost_manager.disconnect(user_id)
        logger.info("WebSocket disconnected: user=%s", user_id)

        await manager.broadcast_online_users()

    except Exception as e:

        logger.exception("WebSocket error for user=%s: %s", user_id, e)

        manager.disconnect(user_id)

        await manager.broadcast_online_users()

    finally:

        db.close()