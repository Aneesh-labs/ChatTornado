"""
Future Messages Background Scheduler & Condition Engine
Provides timezone-safe scheduled delivery, state-based condition triggers,
atomic execution, duplicate prevention, and server restart recovery.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from database import SessionLocal
from models import FutureMessage, Message, MessageVisibility, User, Group, GroupMember, ConversationBranch
from websocket_manager import manager
from block_routes import is_blocked_bidirectional

logger = logging.getLogger("chat_tornado.scheduler")


def create_future_message(
    db: Session,
    sender_id: int,
    message: str,
    trigger_type: str,
    receiver_id: Optional[int] = None,
    group_id: Optional[int] = None,
    branch_id: Optional[int] = None,
    scheduled_at: Optional[datetime] = None,
    condition_config: Optional[dict] = None
) -> FutureMessage:
    """Create and register a new Future Message with time or condition trigger."""
    clean_msg = message.strip() if message else ""
    if not clean_msg:
        raise ValueError("Message content cannot be empty")

    if not receiver_id and not group_id:
        raise ValueError("Either receiver_id or group_id must be provided")

    # Access checks
    if group_id:
        member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == sender_id
        ).first()
        if not member:
            raise PermissionError("You are not a member of this group")
    else:
        if is_blocked_bidirectional(db, sender_id, receiver_id):
            raise PermissionError("Cannot schedule message to a blocked contact")

    if branch_id:
        branch = db.query(ConversationBranch).filter(ConversationBranch.id == branch_id).first()
        if not branch:
            raise ValueError("Target branch not found")

    initial_status = "scheduled" if trigger_type == "time" else "waiting"

    if trigger_type == "time":
        if not scheduled_at:
            raise ValueError("scheduled_at timestamp is required for time-based triggers")
        now_utc = datetime.now(timezone.utc)
        sched_utc = scheduled_at if scheduled_at.tzinfo else scheduled_at.replace(tzinfo=timezone.utc)
        if sched_utc <= now_utc:
            raise ValueError("scheduled_at must be in the future")
    elif trigger_type == "condition":
        if not condition_config or not isinstance(condition_config, dict):
            raise ValueError("Valid condition_config is required for condition-based triggers")
    else:
        raise ValueError(f"Unknown trigger_type: {trigger_type}")

    future_msg = FutureMessage(
        sender_id=sender_id,
        receiver_id=receiver_id,
        group_id=group_id,
        branch_id=branch_id,
        message=clean_msg,
        trigger_type=trigger_type,
        scheduled_at=scheduled_at,
        condition_config=condition_config,
        status=initial_status,
        created_at=datetime.now(timezone.utc),
        execution_metadata={
            "created_from_timezone": "UTC",
            "retry_count": 0,
            "audit_trail": [{
                "action": "created",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "user_id": sender_id
            }]
        }
    )
    db.add(future_msg)
    db.commit()
    db.refresh(future_msg)
    return future_msg


async def deliver_future_message(future_msg_id: int, db: Optional[Session] = None) -> Optional[Message]:
    """Atomically executes and delivers a due future message."""
    own_db = False
    if db is None:
        db = SessionLocal()
        own_db = True

    try:
        future_msg = db.query(FutureMessage).filter(FutureMessage.id == future_msg_id).first()
        if not future_msg or future_msg.status not in ("scheduled", "waiting"):
            return None

        # Lock status to prevent duplicate execution
        future_msg.status = "triggered"
        db.commit()

        # 1. Create real message
        now_utc = datetime.now(timezone.utc)
        real_msg = Message(
            sender_id=future_msg.sender_id,
            receiver_id=future_msg.receiver_id,
            group_id=future_msg.group_id,
            branch_id=future_msg.branch_id,
            message=future_msg.message,
            created_at=now_utc,
            read_state="sent",
            is_future_message=True,
            future_message_id=future_msg.id
        )
        db.add(real_msg)
        db.flush()

        # 2. Add visibility records
        if future_msg.group_id:
            members = db.query(GroupMember).filter(GroupMember.group_id == future_msg.group_id).all()
            for mem in members:
                db.add(MessageVisibility(message_id=real_msg.id, user_id=mem.user_id, visible=True))
        else:
            db.add(MessageVisibility(message_id=real_msg.id, user_id=future_msg.sender_id, visible=True))
            if future_msg.receiver_id:
                db.add(MessageVisibility(message_id=real_msg.id, user_id=future_msg.receiver_id, visible=True))

        # 3. Update FutureMessage to delivered
        future_msg.status = "delivered"
        future_msg.executed_at = now_utc
        future_msg.delivered_message_id = real_msg.id
        meta = dict(future_msg.execution_metadata or {})
        audit = meta.get("audit_trail", [])
        audit.append({
            "action": "delivered",
            "timestamp": now_utc.isoformat(),
            "real_message_id": real_msg.id
        })
        meta["audit_trail"] = audit
        future_msg.execution_metadata = meta

        db.commit()
        db.refresh(real_msg)

        # 4. Broadcast via WebSocket
        sender = db.query(User).filter(User.id == real_msg.sender_id).first()
        payload = {
            "type": "group_message" if real_msg.group_id else "message",
            "id": real_msg.id,
            "sender_id": real_msg.sender_id,
            "sender_name": sender.username if sender else "User",
            "receiver_id": real_msg.receiver_id,
            "group_id": real_msg.group_id,
            "branch_id": real_msg.branch_id,
            "message": real_msg.message,
            "created_at": real_msg.created_at.isoformat(),
            "read_state": "sent",
            "is_future_message": True,
            "future_message_id": future_msg.id,
            "reactions": []
        }

        if real_msg.group_id:
            await manager.broadcast_to_group(real_msg.group_id, payload, db=db)
        else:
            await manager.send_personal_message(real_msg.sender_id, payload)
            if real_msg.receiver_id:
                await manager.send_personal_message(real_msg.receiver_id, payload)

        logger.info("Successfully delivered Future Message #%s -> Message #%s", future_msg.id, real_msg.id)
        return real_msg

    except Exception as exc:
        db.rollback()
        logger.error("Failed to deliver future message #%s: %s", future_msg_id, exc)
        try:
            fm = db.query(FutureMessage).filter(FutureMessage.id == future_msg_id).first()
            if fm:
                fm.status = "failed"
                fm.error_message = str(exc)
                db.commit()
        except Exception:
            pass
        return None
    finally:
        if own_db:
            db.close()


def evaluate_condition(condition_config: dict, db: Session, future_msg: FutureMessage) -> bool:
    """Evaluates whether a condition trigger is satisfied."""
    if not condition_config:
        return False

    ctype = condition_config.get("type", "")

    if ctype == "dna_state":
        # Check DNA state
        target_state = condition_config.get("state", "").upper()
        from dna_service import get_or_compute_dna
        dna = get_or_compute_dna(
            db=db,
            user_id=future_msg.sender_id,
            dm_user2_id=future_msg.receiver_id,
            group_id=future_msg.group_id,
            branch_id=future_msg.branch_id
        )
        current_state = dna.get("conversation_state", "").upper()
        return current_state == target_state

    elif ctype == "dna_decision_count":
        threshold = int(condition_config.get("threshold", 1))
        from dna_service import get_or_compute_dna
        dna = get_or_compute_dna(
            db=db,
            user_id=future_msg.sender_id,
            dm_user2_id=future_msg.receiver_id,
            group_id=future_msg.group_id,
            branch_id=future_msg.branch_id
        )
        decisions = dna.get("decisions_emerged", [])
        return len(decisions) >= threshold

    elif ctype == "message_count":
        threshold = int(condition_config.get("threshold", 10))
        if future_msg.branch_id:
            cnt = db.query(Message).filter(Message.branch_id == future_msg.branch_id).count()
        elif future_msg.group_id:
            cnt = db.query(Message).filter(Message.group_id == future_msg.group_id).count()
        else:
            u1, u2 = sorted([future_msg.sender_id, future_msg.receiver_id])
            cnt = db.query(Message).filter(
                or_(
                    and_(Message.sender_id == u1, Message.receiver_id == u2),
                    and_(Message.sender_id == u2, Message.receiver_id == u1)
                )
            ).count()
        return cnt >= threshold

    elif ctype == "min_members":
        if not future_msg.group_id:
            return False
        threshold = int(condition_config.get("count", 5))
        m_cnt = db.query(GroupMember).filter(GroupMember.group_id == future_msg.group_id).count()
        return m_cnt >= threshold

    return False


async def process_scheduler_tick(db: Optional[Session] = None):
    """Single tick of the background scheduler: checks time-due & condition-due messages."""
    own_db = False
    if db is None:
        db = SessionLocal()
        own_db = True

    try:
        now_utc = datetime.now(timezone.utc)

        # 1. Time-based due messages
        due_time_msgs = (
            db.query(FutureMessage.id)
            .filter(
                FutureMessage.status == "scheduled",
                FutureMessage.trigger_type == "time",
                FutureMessage.scheduled_at <= now_utc
            )
            .all()
        )

        for (f_id,) in due_time_msgs:
            await deliver_future_message(f_id, db=db)

        # 2. Condition-based messages
        waiting_cond_msgs = (
            db.query(FutureMessage)
            .filter(
                FutureMessage.status == "waiting",
                FutureMessage.trigger_type == "condition"
            )
            .all()
        )

        for fm in waiting_cond_msgs:
            if evaluate_condition(fm.condition_config, db, fm):
                await deliver_future_message(fm.id, db=db)

    except Exception as e:
        logger.error("Error in scheduler tick: %s", e)
    finally:
        if own_db:
            db.close()


async def background_scheduler_worker():
    """Continuous background worker running every 3 seconds."""
    logger.info("Starting ChatTornado Future Messages scheduler background worker.")
    while True:
        try:
            await process_scheduler_tick()
        except asyncio.CancelledError:
            logger.info("Scheduler worker cancelled.")
            break
        except Exception as exc:
            logger.error("Unhandled error in scheduler loop: %s", exc)
        await asyncio.sleep(3)
