import logging

from fastapi import APIRouter, WebSocket
from starlette.websockets import WebSocketDisconnect
from sqlalchemy.orm import Session

from auth import decode_token
from database import SessionLocal
from models import Message, MessageVisibility
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
            # Emoji Reaction
            # ==========================
            if data.get("type") == "reaction":
                receiver_id = data.get("receiver_id")
                message_id = data.get("message_id")
                emoji = data.get("emoji")
                if receiver_id is not None and message_id is not None and emoji:
                    await manager.send_personal_message(
                        int(receiver_id),
                        {
                            "type": "reaction",
                            "message_id": message_id,
                            "sender_id": user_id,
                            "emoji": emoji
                        }
                    )
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

            new_message = Message(
                sender_id=user_id,
                receiver_id=receiver_id,
                message=message_text
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

            packet = {
                "type": "message",
                "id": new_message.id,
                "temp_id": temp_id,
                "sender_id": user_id,
                "receiver_id": receiver_id,
                "message": message_text,
                "created_at": str(new_message.created_at)
            }
            logger.info("Message: %s -> %s", user_id, receiver_id)

            # Send to receiver
            await manager.send_personal_message(
                receiver_id,
                packet
            )

            # Echo back to sender
            await manager.send_personal_message(
                user_id,
                packet
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