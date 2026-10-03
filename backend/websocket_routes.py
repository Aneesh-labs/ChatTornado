from datetime import datetime, timezone
import time
import re
import json
import asyncio
import logging

from fastapi import APIRouter, WebSocket
from starlette.websockets import WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_

from auth import decode_token
from database import SessionLocal
from models import Message, MessageVisibility, MessageReaction, User, GroupMember
from websocket_manager import manager, ghost_manager
from block_routes import is_blocked_bidirectional
from diagnostics import (
    log_message_event,
    log_message_error,
    generate_correlation_id
)

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
        
    if payload.get("email_verified") is False:
        await websocket.close(code=1008, reason="Email not verified")
        return

    user_id = int(payload["user_id"])

    await manager.connect(user_id, websocket)
    logger.info("WebSocket connected: user=%s", user_id)

    await manager.broadcast_online_users()

    db: Session = SessionLocal()

    try:

        while True:

            data = await websocket.receive_json()

            if not isinstance(data, dict):
                continue

            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            # WebRTC signaling is deliberately relayed only to the named peer.
            # Media never passes through FastAPI; it remains encrypted peer-to-peer.
            if data.get("type") == "signal":
                receiver_id = data.get("receiver_id")
                signal = data.get("signal")
                try:
                    receiver_id = int(receiver_id)
                except (ValueError, TypeError):
                    continue

                # Block check: blocked users cannot call each other
                if is_blocked_bidirectional(db, user_id, receiver_id):
                    continue

                if isinstance(signal, dict):
                    logger.info("WebRTC %s: %s -> %s", signal.get("type", "signal"), user_id, receiver_id)
                    await manager.send_personal_message(receiver_id, {
                        "type": "signal", "sender_id": user_id, "signal": signal,
                    })
                continue

            # ---------- Status Update Event ----------
            if data.get("type") == "status_update":
                new_status = str(data.get("status", "online")).lower().strip()
                new_custom = data.get("custom_status")
                if new_status in {"online", "away", "dnd", "offline"}:
                    try:
                        u = db.query(User).filter(User.id == user_id).first()
                        if u:
                            u.status = new_status
                            u.custom_status = str(new_custom)[:100] if new_custom else None
                            u.last_seen = datetime.utcnow()
                            db.commit()
                            await manager.broadcast_user_status(user_id, new_status, u.custom_status, db=db)
                    except Exception as st_err:
                        db.rollback()
                        logger.error("Error updating status: %s", st_err)
                continue

            # ---------- Group Message Event ----------
            if data.get("type") == "group_message":
                group_id = data.get("group_id")
                msg_text = str(data.get("message", "")).strip()
                temp_id = data.get("temp_id")
                correlation_id = data.get("correlation_id") or generate_correlation_id()

                if not group_id or not msg_text:
                    continue
                try:
                    group_id = int(group_id)
                except (ValueError, TypeError):
                    continue

                log_message_event(
                    logger,
                    "MESSAGE_RECEIVED",
                    user_id=user_id,
                    group_id=group_id,
                    temp_id=temp_id,
                    correlation_id=correlation_id
                )

                # Check idempotency for group message
                if temp_id:
                    existing_grp_msg = db.query(Message).filter(
                        Message.sender_id == user_id,
                        Message.client_temp_id == temp_id
                    ).first()
                    if existing_grp_msg:
                        log_message_event(
                            logger,
                            "MESSAGE_DUPLICATE_IGNORED",
                            user_id=user_id,
                            group_id=group_id,
                            message_id=existing_grp_msg.id,
                            temp_id=temp_id,
                            correlation_id=correlation_id
                        )
                        continue

                sender = db.query(User).filter(User.id == user_id).first()
                now = datetime.utcnow()
                if sender and sender.account_status == "restricted":
                    if sender.restricted_until and now < sender.restricted_until:
                        await manager.send_personal_message(user_id, {
                            "type": "error",
                            "message": "Your account is temporarily restricted from sending messages.",
                            "temp_id": temp_id,
                            "correlation_id": correlation_id
                        })
                        continue

                # Check membership
                member = db.query(GroupMember).filter(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == user_id
                ).first()
                if not member:
                    continue

                branch_id = data.get("branch_id")
                try:
                    branch_id = int(branch_id) if branch_id is not None else None
                except (ValueError, TypeError):
                    branch_id = None

                try:
                    new_group_msg = Message(
                        sender_id=user_id,
                        receiver_id=None,
                        group_id=group_id,
                        branch_id=branch_id,
                        message=msg_text,
                        read_state="sent",
                        client_temp_id=temp_id,
                        correlation_id=correlation_id
                    )
                    db.add(new_group_msg)
                    db.commit()
                    db.refresh(new_group_msg)
                    log_message_event(
                        logger,
                        "DB_COMMIT_SUCCESS",
                        user_id=user_id,
                        group_id=group_id,
                        message_id=new_group_msg.id,
                        temp_id=temp_id,
                        correlation_id=correlation_id
                    )
                except Exception as grp_db_err:
                    db.rollback()
                    log_message_error(
                        logger,
                        "DB_COMMIT_FAILED",
                        str(grp_db_err),
                        user_id=user_id,
                        group_id=group_id,
                        temp_id=temp_id,
                        correlation_id=correlation_id
                    )
                    await manager.send_personal_message(user_id, {
                        "type": "error",
                        "message": "Failed to persist group message in database.",
                        "temp_id": temp_id,
                        "correlation_id": correlation_id
                    })
                    continue

                # Broadcast to all group members (Decoupled delivery)
                try:
                    all_members = db.query(GroupMember.user_id).filter(GroupMember.group_id == group_id).all()
                    group_packet = {
                        "type": "group_message",
                        "id": new_group_msg.id,
                        "temp_id": temp_id,
                        "group_id": group_id,
                        "branch_id": branch_id,
                        "sender_id": user_id,
                        "sender_name": sender.username if sender else "Member",
                        "message": msg_text,
                        "created_at": new_group_msg.created_at.isoformat() if hasattr(new_group_msg.created_at, "isoformat") else str(new_group_msg.created_at),
                        "correlation_id": correlation_id
                    }
                    for (m_uid,) in all_members:
                        await manager.send_personal_message(m_uid, group_packet)
                except Exception as bcast_err:
                    logger.warning("Group message broadcast partial failure: %s", bcast_err)
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
                self_destruct = data.get("selfDestruct")
                burn = data.get("burn")
                drawing = data.get("drawing")
                image = data.get("image")

                if not isinstance(receiver_id, int):
                    continue

                receiver_id = int(receiver_id)

                if not message_text and not drawing and not image:
                    continue

                # Make sure the Ghost session exists
                if not ghost_manager.exists(user_id, receiver_id):
                    continue

                packet = {
                    "type": "ghost_message",
                    "id": data.get("id") or int(time.time() * 1000),
                    "sender_id": user_id,
                    "receiver_id": receiver_id,
                    "message": message_text,
                    "selfDestruct": self_destruct,
                    "burn": burn,
                    "drawing": drawing,
                    "image": image,
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

            # ---------- Ghost Chat Reaction ----------
            if data.get("type") == "ghost_reaction":
                receiver_id = data.get("receiver_id")
                msg_id = data.get("message_id")
                emoji = data.get("emoji")

                if isinstance(receiver_id, int) and ghost_manager.exists(user_id, receiver_id):
                    await manager.send_personal_message(
                        receiver_id,
                        {
                            "type": "ghost_reaction",
                            "sender_id": user_id,
                            "message_id": msg_id,
                            "emoji": emoji,
                        }
                    )
                continue

            # ---------- Ghost Chat Burn / Destroy ----------
            if data.get("type") == "ghost_burn":
                receiver_id = data.get("receiver_id")
                msg_id = data.get("message_id")

                if isinstance(receiver_id, int) and ghost_manager.exists(user_id, receiver_id):
                    await manager.send_personal_message(
                        receiver_id,
                        {
                            "type": "ghost_burn",
                            "sender_id": user_id,
                            "message_id": msg_id,
                        }
                    )
                continue

            # ---------- Ghost Chat Delete Message ----------
            if data.get("type") == "ghost_delete":
                receiver_id = data.get("receiver_id")
                msg_id = data.get("message_id")

                if isinstance(receiver_id, int) and ghost_manager.exists(user_id, receiver_id):
                    await manager.send_personal_message(
                        receiver_id,
                        {
                            "type": "ghost_delete",
                            "sender_id": user_id,
                            "message_id": msg_id,
                        }
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

            if data.get("type") in {"typing_start", "typing_stop", "typing", "stop_typing"}:

                receiver_id = data.get("receiver_id")

                if receiver_id is not None:
                    try:
                        r_id = int(receiver_id)
                    except (ValueError, TypeError):
                        r_id = receiver_id

                    norm_type = "typing_start" if data["type"] in {"typing_start", "typing"} else "typing_stop"
                    await manager.send_personal_message(
                        r_id,
                        {
                            "type": norm_type,
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
            # In-Chat Game Real-Time Move
            # ==========================
            if data.get("type") == "game_move":
                message_id = data.get("message_id")
                receiver_id = data.get("receiver_id")
                game_id = data.get("game_id")
                game_data = data.get("game_data")

                if receiver_id is None or not game_data or not isinstance(game_data, dict):
                    continue

                try:
                    receiver_id = int(receiver_id)
                except (ValueError, TypeError):
                    continue

                # Persist updated game state into existing message row in DB
                if message_id:
                    try:
                        m_id = int(message_id) if str(message_id).isdigit() else message_id
                        msg_row = db.query(Message).filter(Message.id == m_id).first()
                        if msg_row:
                            # Special handling for RPS simultaneous choices merge:
                            if game_data.get("game") == "rps" and msg_row.message and msg_row.message.startswith("🎮 GAME:"):
                                try:
                                    raw_existing = msg_row.message.replace("🎮 GAME:", "").strip()
                                    existing_payload = json.loads(raw_existing)
                                    existing_choices = existing_payload.get("choices") or {}
                                    incoming_choices = game_data.get("choices") or {}
                                    merged_choices = {**existing_choices, **incoming_choices}
                                    game_data["choices"] = merged_choices
                                    if len(merged_choices) >= 2:
                                        game_data["status"] = "revealed"
                                except Exception as parse_err:
                                    logger.warning("RPS choice merge error: %s", parse_err)

                            msg_row.message = "🎮 GAME:" + json.dumps(game_data)
                            db.commit()
                    except Exception as db_err:
                        logger.error("Failed to persist game move in DB: %s", db_err)
                        db.rollback()

                # Broadcast game_update to recipient and sender's other tabs/sessions
                packet = {
                    "type": "game_update",
                    "message_id": message_id,
                    "game_id": game_id,
                    "game_data": game_data,
                    "sender_id": user_id,
                    "receiver_id": receiver_id
                }

                await manager.send_personal_message(receiver_id, packet)
                await manager.send_personal_message(user_id, packet)
                continue

            # ==========================
            # Capsule Unlock Handshake
            # ==========================
            if data.get("type") == "unlock_capsule":
                message_id = data.get("message_id")
                if message_id:
                    msg = db.query(Message).filter(Message.id == message_id).first()
                    if msg and msg.shield_mode == "timelock":
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

            try:
                receiver_id = int(receiver_id)
            except (ValueError, TypeError):
                continue

            if not message_text:
                continue

            temp_id = data.get("temp_id")
            correlation_id = data.get("correlation_id") or generate_correlation_id()
            ai_mode = data.get("ai_mode", "DEFAULT")
            ai_model = data.get("ai_model")

            log_message_event(
                logger,
                "MESSAGE_RECEIVED",
                user_id=user_id,
                receiver_id=receiver_id,
                temp_id=temp_id,
                correlation_id=correlation_id
            )

            # ==========================
            # Security & Moderation Checks
            # ==========================

            sender_user = db.query(User).filter(User.id == user_id).first()
            now_dt = datetime.utcnow()
            if sender_user and sender_user.account_status == "restricted":
                if sender_user.restricted_until and now_dt < sender_user.restricted_until:
                    await manager.send_personal_message(user_id, {
                        "type": "error",
                        "message": "Your account is temporarily restricted from sending messages.",
                        "temp_id": temp_id,
                        "correlation_id": correlation_id
                    })
                    continue
                elif sender_user.restricted_until and now_dt >= sender_user.restricted_until:
                    sender_user.account_status = "active"
                    sender_user.restricted_until = None
                    sender_user.restriction_reason = None
                    db.commit()

            if is_blocked_bidirectional(db, user_id, receiver_id):
                log_message_event(
                    logger,
                    "MESSAGE_BLOCKED",
                    user_id=user_id,
                    receiver_id=receiver_id,
                    temp_id=temp_id,
                    correlation_id=correlation_id
                )
                await manager.send_personal_message(user_id, {
                    "type": "error",
                    "message": "Unable to send message. Interaction with this user is blocked.",
                    "temp_id": temp_id,
                    "correlation_id": correlation_id
                })
                continue

            # ==========================
            # Backend Idempotency Check
            # ==========================
            if temp_id:
                existing_msg = db.query(Message).filter(
                    Message.sender_id == user_id,
                    Message.client_temp_id == temp_id
                ).first()
                if existing_msg:
                    log_message_event(
                        logger,
                        "MESSAGE_DUPLICATE_IGNORED",
                        user_id=user_id,
                        receiver_id=receiver_id,
                        message_id=existing_msg.id,
                        temp_id=temp_id,
                        correlation_id=correlation_id
                    )
                    # Acknowledge back to sender so client knows it was saved
                    await manager.send_personal_message(user_id, {
                        "type": "message",
                        "id": existing_msg.id,
                        "temp_id": temp_id,
                        "sender_id": user_id,
                        "receiver_id": receiver_id,
                        "message": existing_msg.message,
                        "created_at": str(existing_msg.created_at),
                        "is_shielded": existing_msg.is_shielded,
                        "shield_mode": existing_msg.shield_mode,
                        "correlation_id": correlation_id
                    })
                    continue

            # ==========================
            # Save Message (Transaction Isolated)
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

            branch_id = data.get("branch_id")
            try:
                branch_id = int(branch_id) if branch_id is not None else None
            except (ValueError, TypeError):
                branch_id = None

            try:
                new_message = Message(
                    sender_id=user_id,
                    receiver_id=receiver_id,
                    branch_id=branch_id,
                    message=message_text,
                    is_shielded=is_shielded,
                    shield_mode=shield_mode,
                    unlock_at=unlock_at,
                    client_temp_id=temp_id,
                    correlation_id=correlation_id
                )

                db.add(new_message)
                db.commit()
                db.refresh(new_message)

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
                log_message_event(
                    logger,
                    "DB_COMMIT_SUCCESS",
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
                    "DB_COMMIT_FAILED",
                    str(db_err),
                    user_id=user_id,
                    receiver_id=receiver_id,
                    temp_id=temp_id,
                    correlation_id=correlation_id
                )
                await manager.send_personal_message(user_id, {
                    "type": "error",
                    "message": "Failed to persist message in database. Please retry.",
                    "temp_id": temp_id,
                    "correlation_id": correlation_id
                })
                continue

            # ==========================
            # Packet Construction & Decoupled Delivery
            # ==========================

            now = datetime.now(timezone.utc)
            u_time = unlock_at if (unlock_at and unlock_at.tzinfo) else (unlock_at.replace(tzinfo=timezone.utc) if unlock_at else None)
            u_iso = None
            if u_time:
                u_iso = u_time.isoformat()
                if not u_iso.endswith('Z') and '+' not in u_iso:
                    u_iso += 'Z'

            is_locked = bool(is_shielded and shield_mode == "timelock" and u_time and u_time > now)

            packet_sender = {
                "type": "message",
                "id": new_message.id,
                "temp_id": temp_id,
                "sender_id": user_id,
                "receiver_id": receiver_id,
                "branch_id": branch_id,
                "message": message_text,
                "created_at": str(new_message.created_at),
                "is_shielded": is_shielded,
                "shield_mode": shield_mode,
                "unlock_at": u_iso,
                "is_locked": is_locked,
                "correlation_id": correlation_id
            }
            
            packet_receiver = dict(packet_sender)
            if is_locked:
                packet_receiver["message"] = None
                packet_receiver["is_locked"] = True

            logger.info("Message persisted: msg_id=%s, %s -> %s", new_message.id, user_id, receiver_id)

            # 1. Echo back to sender first (guarantees sender sees confirmation)
            await manager.send_personal_message(
                user_id,
                packet_sender
            )
            log_message_event(
                logger,
                "WS_SENDER_ACK_SENT",
                user_id=user_id,
                receiver_id=receiver_id,
                message_id=new_message.id,
                temp_id=temp_id,
                correlation_id=correlation_id
            )

            # 2. Decoupled Delivery to receiver (offline receiver does NOT fail the message)
            try:
                delivered = await manager.send_personal_message(
                    receiver_id,
                    packet_receiver
                )
                if delivered:
                    log_message_event(
                        logger,
                        "WS_DELIVERY_SUCCESS",
                        user_id=user_id,
                        receiver_id=receiver_id,
                        message_id=new_message.id,
                        correlation_id=correlation_id
                    )
                else:
                    log_message_event(
                        logger,
                        "WS_RECIPIENT_OFFLINE",
                        user_id=user_id,
                        receiver_id=receiver_id,
                        message_id=new_message.id,
                        correlation_id=correlation_id
                    )
            except Exception as deliv_err:
                logger.warning("Recipient delivery network error (message safely saved in DB): %s", deliv_err)

            # Check if receiver is VORTEX-9 bot
            from ai_service import get_or_create_bot_user, process_user_message_to_bot, process_user_message_to_bot_stream, execute_deep_research
            bot = get_or_create_bot_user(db)
            is_bot_target = False
            if bot and receiver_id == bot.id:
                is_bot_target = True
            else:
                target_u = db.query(User).filter(User.id == receiver_id).first()
                if target_u and (target_u.username == "VORTEX-9" or target_u.email == "vortex9@system.bot"):
                    is_bot_target = True
                    bot = target_u

            if is_bot_target and bot:
                async def handle_bot_reply(u_id: int, b_id: int, prompt_text: str):
                    await manager.send_personal_message(u_id, {
                        "type": "typing_start",
                        "sender_id": b_id
                    })
                    reply_db = SessionLocal()
                    try:
                        print(f"[BOT_HANDLER] Starting reply generation for user {u_id} (Mode: {ai_mode}, Model: {ai_model}): {prompt_text}", flush=True)

                        # DUAL-LAYER: 1. Direct prompt interception for Admin mode
                        direct_dispatched = False
                        reply_text = None  # will be set if we short-circuit

                        if ai_mode.upper() == "ADMIN":
                            print(f"👑 [ADMIN_MODE] Received Admin request: '{prompt_text}'", flush=True)

                            # 1A. Capability inquiry check
                            if re.search(
                                r'\b(?:can you|are you able to|can we|do you have (?:permission|rights|access) to)\s+(?:send|dispatch|post|deliver|delete|remove|erase|wipe)\s+(?:a\s+)?(?:messages?|texts?)\b',
                                prompt_text, re.IGNORECASE
                            ):
                                reply_text = (
                                    "👑 **Yes, Administrator!** In Admin Mode, I have elevated dispatch and deletion authority across ChatTornado.\n\n"
                                    "**Dispatch Commands:**\n"
                                    "• `text <username> <message>`\n"
                                    "• `send to <username> <message>`\n"
                                    "• `tell <username> <message>`\n\n"
                                    "**Deletion Commands:**\n"
                                    "• `delete last message to <username>`\n"
                                    "• `delete message <id>`\n"
                                    "• `delete all messages with <username>`\n"
                                    "• `delete last message`"
                                )
                                direct_dispatched = True
                                print(f"👑 [ADMIN_CAPABILITY] Answered capability inquiry for Admin {u_id}", flush=True)

                            # 1B. Direct delete command
                            if not direct_dispatched:
                                del_id_match = re.search(r'^(?:please\s+)?(?:delete|remove|erase)\s+(?:message|msg)?\s*#?(\d+)$', prompt_text.strip(), re.IGNORECASE)
                                del_all_match = re.search(r'^(?:please\s+)?(?:delete|remove|erase|clear|wipe)\s+(?:all\s+)?messages?\s+(?:with|to|from|for)\s+([a-zA-Z0-9_\-.]+)$', prompt_text.strip(), re.IGNORECASE)
                                del_last_match = re.search(r'^(?:please\s+)?(?:delete|remove|erase)\s+(?:the\s+)?last\s+(?:message|msg|text)(?:\s+(?:with|to|from|for)\s+([a-zA-Z0-9_\-.]+))?$', prompt_text.strip(), re.IGNORECASE)

                                if del_id_match:
                                    target_msg_id = int(del_id_match.group(1))
                                    msg = reply_db.query(Message).filter(Message.id == target_msg_id).first()
                                    if msg:
                                        reply_db.query(MessageVisibility).filter(MessageVisibility.message_id == target_msg_id).update({"visible": False}, synchronize_session=False)
                                        reply_db.commit()
                                        del_pkt = {"type": "delete_message", "message_id": target_msg_id}
                                        await manager.send_personal_message(msg.sender_id, del_pkt)
                                        await manager.send_personal_message(msg.receiver_id, del_pkt)
                                        direct_dispatched = True
                                        reply_text = f"🗑️ **Deleted message #{target_msg_id}**: \"{msg.message}\""
                                    else:
                                        direct_dispatched = True
                                        reply_text = f"⚠️ Message ID #{target_msg_id} not found."

                                elif del_all_match:
                                    raw_u = del_all_match.group(1).strip()
                                    t_user = reply_db.query(User).filter(func.lower(User.username) == raw_u.lower()).first()
                                    if not t_user:
                                        t_user = reply_db.query(User).filter(User.username.ilike(f"%{raw_u}%")).first()
                                    if t_user:
                                        msgs = reply_db.query(Message).filter(
                                            or_(
                                                and_(Message.sender_id == u_id, Message.receiver_id == t_user.id),
                                                and_(Message.sender_id == t_user.id, Message.receiver_id == u_id)
                                            )
                                        ).all()
                                        for m in msgs:
                                            reply_db.query(MessageVisibility).filter(MessageVisibility.message_id == m.id).update({"visible": False}, synchronize_session=False)
                                            del_pkt = {"type": "delete_message", "message_id": m.id}
                                            await manager.send_personal_message(m.sender_id, del_pkt)
                                            await manager.send_personal_message(m.receiver_id, del_pkt)
                                        reply_db.commit()
                                        direct_dispatched = True
                                        reply_text = f"🗑️ **Deleted all {len(msgs)} messages** in conversation with **{t_user.username}**."
                                    else:
                                        direct_dispatched = True
                                        reply_text = f"⚠️ User '{raw_u}' not found."

                                elif del_last_match:
                                    raw_u = del_last_match.group(1)
                                    t_user = None
                                    if raw_u:
                                        raw_u = raw_u.strip()
                                        t_user = reply_db.query(User).filter(func.lower(User.username) == raw_u.lower()).first()
                                        if not t_user:
                                            t_user = reply_db.query(User).filter(User.username.ilike(f"%{raw_u}%")).first()

                                    q = reply_db.query(Message)
                                    if t_user:
                                        q = q.filter(
                                            or_(
                                                and_(Message.sender_id == u_id, Message.receiver_id == t_user.id),
                                                and_(Message.sender_id == t_user.id, Message.receiver_id == u_id)
                                            )
                                        )
                                    else:
                                        q = q.filter(Message.sender_id == u_id)

                                    last_m = q.order_by(Message.id.desc()).first()
                                    if last_m:
                                        reply_db.query(MessageVisibility).filter(MessageVisibility.message_id == last_m.id).update({"visible": False}, synchronize_session=False)
                                        reply_db.commit()
                                        del_pkt = {"type": "delete_message", "message_id": last_m.id}
                                        await manager.send_personal_message(last_m.sender_id, del_pkt)
                                        await manager.send_personal_message(last_m.receiver_id, del_pkt)
                                        other_u = reply_db.query(User).filter(User.id == (last_m.receiver_id if last_m.sender_id == u_id else last_m.sender_id)).first()
                                        other_name = other_u.username if other_u else "User"
                                        direct_dispatched = True
                                        reply_text = f"🗑️ **Deleted last message #{last_m.id}** with **{other_name}**: \"{last_m.message}\""
                                    else:
                                        direct_dispatched = True
                                        reply_text = f"⚠️ No recent messages found to delete."

                            # 1C. Direct dispatch command
                            if not direct_dispatched:
                                direct_match = re.search(
                                    r'^(?:please\s+)?'
                                    r'(?:send\s+(?:a\s+)?(?:message|text)\s+to|send\s+to|text|message|msg|tell|broadcast\s+to)'
                                    r'\s+([a-zA-Z0-9_\-.]+)'
                                    r'(?:\s+(?:saying|that|with\s+text|:|-))?'
                                    r'\s*["\'\`]?\s*(.+?)["\'\`]?\s*$',
                                    prompt_text.strip(),
                                    re.IGNORECASE
                                )
                                print(f"👑 [ADMIN_DIRECT] Regex match result: {direct_match}", flush=True)

                                if direct_match:
                                    target_raw = direct_match.group(1).strip().strip("[]'\"` \t")
                                    broadcast_msg = direct_match.group(2).strip().strip("[]'\"` \t")
                                    print(f"👑 [ADMIN_DIRECT] Parsed target='{target_raw}' | msg='{broadcast_msg}'", flush=True)

                                    target_user = None
                                    if target_raw.isdigit():
                                        target_user = reply_db.query(User).filter(User.id == int(target_raw)).first()
                                    else:
                                        target_user = reply_db.query(User).filter(func.lower(User.username) == target_raw.lower()).first()
                                        if not target_user:
                                            target_user = reply_db.query(User).filter(User.username.ilike(f"%{target_raw}%")).first()
                                        if not target_user and len(target_raw) >= 3:
                                            target_user = reply_db.query(User).filter(User.username.ilike(f"{target_raw[:3]}%")).first()

                                    print(f"👑 [ADMIN_DIRECT] DB lookup result: {target_user}", flush=True)

                                    if target_user:
                                        target_id = target_user.id
                                        b_msg = Message(
                                            sender_id=u_id,
                                            receiver_id=target_id,
                                            message=broadcast_msg,
                                            is_shielded=False,
                                            read_state="sent"
                                        )
                                        reply_db.add(b_msg)
                                        reply_db.commit()
                                        reply_db.refresh(b_msg)
                                        reply_db.add_all([
                                            MessageVisibility(message_id=b_msg.id, user_id=u_id, visible=True),
                                            MessageVisibility(message_id=b_msg.id, user_id=target_id, visible=True),
                                        ])
                                        reply_db.commit()

                                        # Push live to recipient
                                        await manager.send_personal_message(target_id, {
                                            "type": "message",
                                            "id": b_msg.id,
                                            "sender_id": u_id,
                                            "receiver_id": target_id,
                                            "message": broadcast_msg,
                                            "created_at": str(b_msg.created_at),
                                            "is_shielded": False,
                                            "is_locked": False,
                                            "read_state": "sent",
                                            "reactions": []
                                        })
                                        # Push live to admin (so it shows in their chat too)
                                        await manager.send_personal_message(u_id, {
                                            "type": "message",
                                            "id": b_msg.id,
                                            "sender_id": u_id,
                                            "receiver_id": target_id,
                                            "message": broadcast_msg,
                                            "created_at": str(b_msg.created_at),
                                            "is_shielded": False,
                                            "is_locked": False,
                                            "read_state": "sent",
                                            "reactions": []
                                        })
                                        direct_dispatched = True
                                        reply_text = f"✅ Message dispatched to **{target_user.username}** (ID: {target_id}): \"{broadcast_msg}\""
                                        print(f"👑 [ADMIN_DIRECT SUCCESS] msg_id={b_msg.id} | Admin {u_id} → {target_user.username} ({target_id})", flush=True)
                                    else:
                                        direct_dispatched = True
                                        reply_text = f"⚠️ Admin Dispatch Failed: No user matching '{target_raw}' was found in the platform registry."
                                        print(f"⚠️ [ADMIN_DIRECT] No user found for target='{target_raw}'", flush=True)


                        if not direct_dispatched:
                            # Pre-create bot message in DB so frontend has a stable message ID to stream into
                            bot_message = Message(
                                sender_id=b_id,
                                receiver_id=u_id,
                                message="",
                                is_shielded=False,
                                read_state="sent"
                            )
                            reply_db.add(bot_message)
                            reply_db.commit()
                            reply_db.refresh(bot_message)
                            reply_db.add_all([
                                MessageVisibility(message_id=bot_message.id, user_id=b_id, visible=True),
                                MessageVisibility(message_id=bot_message.id, user_id=u_id, visible=True),
                            ])
                            reply_db.commit()

                            # Signal streaming start to client and stop typing indicator
                            await manager.send_personal_message(u_id, {
                                "type": "typing_stop",
                                "sender_id": b_id
                            })
                            await manager.send_personal_message(u_id, {
                                "type": "ai_stream_start",
                                "message_id": bot_message.id,
                                "sender_id": b_id,
                                "created_at": str(bot_message.created_at)
                            })

                            accumulated_streamed_chunks = []
                            async def on_stream_chunk(chunk_text: str):
                                accumulated_streamed_chunks.append(chunk_text)
                                await manager.send_personal_message(u_id, {
                                    "type": "ai_stream_chunk",
                                    "message_id": bot_message.id,
                                    "chunk": chunk_text
                                })

                            is_research = (
                                str(ai_mode).upper() == "RESEARCH" or
                                prompt_text.strip().lower().startswith("/research") or
                                prompt_text.strip().lower().startswith("!research")
                            )

                            try:
                                if is_research:
                                    reply_text = await execute_deep_research(
                                        prompt_text,
                                        on_step=on_stream_chunk,
                                        on_chunk=on_stream_chunk,
                                        user_id=u_id,
                                        db=reply_db
                                    )
                                else:
                                    reply_text = await process_user_message_to_bot_stream(u_id, prompt_text, ai_mode, reply_db, on_chunk=on_stream_chunk, ai_model=ai_model)
                            except Exception as stream_call_err:
                                logger.exception("Streaming call exception: %s", stream_call_err)
                                if accumulated_streamed_chunks:
                                    reply_text = "".join(accumulated_streamed_chunks)
                                else:
                                    reply_text = f"⚠️ Neural synthesis encountered a connection interruption. Please try resending."
                            print(f"[BOT_HANDLER] Stream reply generated successfully ({len(reply_text)} chars)", flush=True)


                            # DUAL-LAYER: 2. ADMIN BROADCAST INTERCEPT FROM LLM OUTPUT
                            match = re.search(r'ADMIN_BROADCAST:\s*([^|\n]+)\|\s*(.*)', reply_text, re.IGNORECASE)
                            if match:
                                target_raw = match.group(1).strip().strip("[]'\"` \t")
                                broadcast_msg = match.group(2).strip().strip("[]'\"` \t")
                                
                                # Resolve target user by ID or Username
                                target_user = None
                                if target_raw.isdigit():
                                    target_user = reply_db.query(User).filter(User.id == int(target_raw)).first()
                                else:
                                    target_user = reply_db.query(User).filter(func.lower(User.username) == target_raw.lower()).first()
                                    if not target_user:
                                        target_user = reply_db.query(User).filter(User.username.ilike(f"%{target_raw}%")).first()
                                    if not target_user and len(target_raw) >= 3:
                                        target_user = reply_db.query(User).filter(User.username.ilike(f"{target_raw[:3]}%")).first()
                                
                                if target_user:
                                    target_id = target_user.id
                                    b_msg = Message(
                                        sender_id=u_id,
                                        receiver_id=target_id,
                                        message=broadcast_msg,
                                        is_shielded=False,
                                        read_state="sent"
                                    )
                                    reply_db.add(b_msg)
                                    reply_db.commit()
                                    reply_db.refresh(b_msg)
                                    reply_db.add_all([
                                        MessageVisibility(message_id=b_msg.id, user_id=u_id, visible=True),
                                        MessageVisibility(message_id=b_msg.id, user_id=target_id, visible=True),
                                    ])
                                    reply_db.commit()
                                    
                                    # Push live to recipient
                                    await manager.send_personal_message(target_id, {
                                        "type": "message",
                                        "id": b_msg.id,
                                        "sender_id": u_id,
                                        "receiver_id": target_id,
                                        "message": broadcast_msg,
                                        "created_at": str(b_msg.created_at),
                                        "is_shielded": False,
                                        "is_locked": False,
                                        "read_state": "sent",
                                        "reactions": []
                                    })
                                    
                                    # Also push to admin
                                    await manager.send_personal_message(u_id, {
                                        "type": "message",
                                        "id": b_msg.id,
                                        "sender_id": u_id,
                                        "receiver_id": target_id,
                                        "message": broadcast_msg,
                                        "created_at": str(b_msg.created_at),
                                        "is_shielded": False,
                                        "is_locked": False,
                                        "read_state": "sent",
                                        "reactions": []
                                    })
                                    
                                    reply_text = f"✅ Message dispatched directly to **{target_user.username}** (ID: {target_id}): \"{broadcast_msg}\""
                                else:
                                    reply_text = f"⚠️ Admin Dispatch Failed: User '{target_raw}' was not found in registered platform users."
                        
                        # REMINDER INTERCEPT
                        rem_match = re.search(r'\[REMINDER:\s*(\d+)\s*\|\s*(.*?)\]', reply_text, re.IGNORECASE)
                        if rem_match:
                            delay_sec = int(rem_match.group(1))
                            rem_msg = rem_match.group(2).strip()
                            
                            async def send_reminder_task(t_uid: int, t_bid: int, delay: int, msg: str):
                                await asyncio.sleep(delay)
                                
                                # Send real message
                                rem_db = SessionLocal()
                                try:
                                    final_msg = f"🔔 **Reminder:** {msg}"
                                    b_msg = Message(
                                        sender_id=t_bid,
                                        receiver_id=t_uid,
                                        message=final_msg,
                                        is_shielded=False,
                                        read_state="sent"
                                    )
                                    rem_db.add(b_msg)
                                    rem_db.commit()
                                    rem_db.refresh(b_msg)
                                    rem_db.add_all([
                                        MessageVisibility(message_id=b_msg.id, user_id=t_bid, visible=True),
                                        MessageVisibility(message_id=b_msg.id, user_id=t_uid, visible=True),
                                    ])
                                    rem_db.commit()
                                    
                                    await manager.send_personal_message(t_uid, {
                                        "type": "message",
                                        "id": b_msg.id,
                                        "sender_id": t_bid,
                                        "receiver_id": t_uid,
                                        "message": final_msg,
                                        "created_at": str(b_msg.created_at),
                                        "is_shielded": False,
                                        "is_locked": False,
                                        "read_state": "sent",
                                        "reactions": []
                                    })
                                finally:
                                    rem_db.close()
                            
                            asyncio.create_task(send_reminder_task(u_id, b_id, delay_sec, rem_msg))
                            reply_text = reply_text.replace(rem_match.group(0), f"*(Reminder set for {delay_sec} seconds)*")

                        if direct_dispatched:
                            bot_message = Message(
                                sender_id=b_id,
                                receiver_id=u_id,
                                message=reply_text,
                                is_shielded=False,
                                read_state="sent"
                            )
                            reply_db.add(bot_message)
                            reply_db.commit()
                            reply_db.refresh(bot_message)
                            reply_db.add_all([
                                MessageVisibility(message_id=bot_message.id, user_id=b_id, visible=True),
                                MessageVisibility(message_id=bot_message.id, user_id=u_id, visible=True),
                            ])
                            reply_db.commit()
                        else:
                            bot_message.message = reply_text
                            reply_db.commit()

                        await manager.send_personal_message(u_id, {
                            "type": "typing_stop",
                            "sender_id": b_id
                        })

                        # Finalize stream with complete text
                        await manager.send_personal_message(u_id, {
                            "type": "ai_stream_done",
                            "message_id": bot_message.id,
                            "sender_id": b_id,
                            "receiver_id": u_id,
                            "full_text": reply_text
                        })

                        await manager.send_personal_message(u_id, {
                            "type": "message",
                            "id": bot_message.id,
                            "sender_id": b_id,
                            "receiver_id": u_id,
                            "message": reply_text,
                            "created_at": str(bot_message.created_at),
                            "is_shielded": False,
                            "is_locked": False,
                            "read_state": "sent",
                            "reactions": []
                        })
                    except Exception as bot_err:
                        print(f"[BOT_HANDLER] Exception during bot reply: {bot_err}", flush=True)
                        logger.exception("Error in bot reply task: %s", bot_err)
                        fallback_final = "".join(accumulated_streamed_chunks) if accumulated_streamed_chunks else f"⚠️ **Neural Link Disruption**: {str(bot_err)}"
                        try:
                            if bot_message:
                                bot_message.message = fallback_final
                                reply_db.commit()
                                await manager.send_personal_message(u_id, {
                                    "type": "ai_stream_done",
                                    "message_id": bot_message.id,
                                    "sender_id": b_id,
                                    "receiver_id": u_id,
                                    "full_text": fallback_final
                                })
                                await manager.send_personal_message(u_id, {
                                    "type": "message",
                                    "id": bot_message.id,
                                    "sender_id": b_id,
                                    "receiver_id": u_id,
                                    "message": fallback_final,
                                    "created_at": str(bot_message.created_at),
                                    "is_shielded": False,
                                    "is_locked": False,
                                    "read_state": "sent",
                                    "reactions": []
                                })
                            else:
                                err_msg = Message(
                                    sender_id=b_id,
                                    receiver_id=u_id,
                                    message=fallback_final,
                                    is_shielded=False,
                                    read_state="sent"
                                )
                                reply_db.add(err_msg)
                                reply_db.commit()
                                reply_db.refresh(err_msg)
                                reply_db.add_all([
                                    MessageVisibility(message_id=err_msg.id, user_id=b_id, visible=True),
                                    MessageVisibility(message_id=err_msg.id, user_id=u_id, visible=True),
                                ])
                                reply_db.commit()

                                await manager.send_personal_message(u_id, {
                                    "type": "message",
                                    "id": err_msg.id,
                                    "sender_id": b_id,
                                    "receiver_id": u_id,
                                    "message": fallback_final,
                                    "created_at": str(err_msg.created_at),
                                    "is_shielded": False,
                                    "is_locked": False,
                                    "read_state": "sent",
                                    "reactions": []
                                })
                        except Exception as inner_err:
                            logger.exception("Failed to deliver error message to user: %s", inner_err)

                        await manager.send_personal_message(u_id, {
                            "type": "typing_stop",
                            "sender_id": b_id
                        })
                    finally:
                        reply_db.close()

                asyncio.create_task(handle_bot_reply(user_id, bot.id, message_text))

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

@router.websocket("/ws/ai/live/{user_id}")
async def ai_live_websocket(websocket: WebSocket, user_id: int):
    from google import genai
    from google.genai import types
    import os
    import asyncio
    
    await websocket.accept()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        await websocket.close(code=1008, reason="No Gemini API Key")
        return

    client = genai.Client(api_key=api_key)
    config = types.LiveConnectConfig(
        response_modalities=[types.Modality.AUDIO],
        system_instruction=types.Content(
            parts=[types.Part.from_text(text="You are VORTEX-9, in a live voice call. Keep answers short.")]
        )
    )

    try:
        async with client.aio.live.connect(model="gemini-3.1-flash-live-preview", config=config) as session:
            
            async def receive_from_frontend():
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        await session.send_realtime_input(audio=types.Blob(data=data, mime_type="audio/pcm;rate=16000"))
                except Exception:
                    pass

            async def receive_from_gemini():
                try:
                    async for response in session.receive():
                        content = response.server_content
                        if content and content.model_turn:
                            for part in content.model_turn.parts:
                                if part.inline_data:
                                    await websocket.send_bytes(part.inline_data.data)
                except Exception:
                    pass

            await asyncio.gather(receive_from_frontend(), receive_from_gemini())
    except Exception as e:
        print(f"[AI_LIVE] Error: {e}")
        try:
            await websocket.close()
        except:
            pass