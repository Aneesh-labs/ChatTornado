from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from models import ChatStreak

EXPIRY_HOURS = 36  # Generous window (1.5 days) so users don't lose streaks across timezones


def get_tier_info(count: int) -> Dict[str, str]:
    if count >= 100:
        return {
            "badge": "👑",
            "level": "legend",
            "title": "Tornado Legend",
            "color": "text-amber-400",
            "bg": "bg-amber-500/20",
            "border": "border-amber-500/40"
        }
    if count >= 30:
        return {
            "badge": "🌪️",
            "level": "vortex",
            "title": "Vortex Storm",
            "color": "text-purple-400",
            "bg": "bg-purple-500/20",
            "border": "border-purple-500/40"
        }
    if count >= 7:
        return {
            "badge": "⚡",
            "level": "electric",
            "title": "Lightning Cyclone",
            "color": "text-cyan-400",
            "bg": "bg-cyan-500/20",
            "border": "border-cyan-500/40"
        }
    if count >= 1:
        return {
            "badge": "🔥",
            "level": "breeze",
            "title": "Breeze Flame",
            "color": "text-orange-400",
            "bg": "bg-orange-500/20",
            "border": "border-orange-500/40"
        }
    return {
        "badge": "🔥",
        "level": "inactive",
        "title": "Ignite Streak",
        "color": "text-white/40",
        "bg": "bg-white/5",
        "border": "border-white/10"
    }


def get_or_create_streak_record(db: Session, user_a: int, user_b: int) -> ChatStreak:
    u1, u2 = min(user_a, user_b), max(user_a, user_b)
    streak = db.query(ChatStreak).filter(
        ChatStreak.user1_id == u1,
        ChatStreak.user2_id == u2
    ).first()

    if not streak:
        streak = ChatStreak(
            user1_id=u1,
            user2_id=u2,
            streak_count=0,
            best_streak=0,
            last_interaction=datetime.utcnow() - timedelta(days=2),
            freeze_count=1
        )
        db.add(streak)
        db.commit()
        db.refresh(streak)

    return streak


def calculate_streak_state(streak: ChatStreak, now: Optional[datetime] = None) -> Dict[str, Any]:
    if now is None:
        now = datetime.utcnow()

    last_dt = streak.last_interaction or (now - timedelta(days=2))
    elapsed_seconds = max(0, (now - last_dt).total_seconds())
    elapsed_hours = elapsed_seconds / 3600.0

    count = streak.streak_count
    freeze_count = streak.freeze_count
    was_frozen = False

    # Check if expired
    if count > 0 and elapsed_hours > EXPIRY_HOURS:
        if freeze_count > 0:
            # Consume 1 freeze to protect the streak!
            freeze_count -= 1
            was_frozen = True
            streak.freeze_count = freeze_count
            # Give another 12 hour grace period
            streak.last_interaction = now - timedelta(hours=24)
        else:
            count = 0
            streak.streak_count = 0

    hours_left = max(0, int(EXPIRY_HOURS - elapsed_hours)) if count > 0 else 0
    tier = get_tier_info(count)

    return {
        "count": count,
        "best": streak.best_streak,
        "hours_left": hours_left,
        "is_expiring": hours_left <= 8 and count > 0,
        "badge": tier["badge"],
        "level": tier["level"],
        "title": tier["title"],
        "color": tier["color"],
        "bg": tier["bg"],
        "border": tier["border"],
        "freeze_count": freeze_count,
        "was_frozen": was_frozen
    }


def update_streak_on_message(db: Session, sender_id: int, receiver_id: int) -> Dict[str, Any]:
    """
    Called whenever a direct message is sent between two users.
    Increments streak if on consecutive calendar days, preserves if same day,
    or restarts if expired.
    """
    u1, u2 = min(sender_id, receiver_id), max(sender_id, receiver_id)
    streak = db.query(ChatStreak).filter(
        ChatStreak.user1_id == u1,
        ChatStreak.user2_id == u2
    ).first()

    now = datetime.utcnow()
    just_increased = False
    just_leveled_up = False

    if not streak:
        streak = ChatStreak(
            user1_id=u1,
            user2_id=u2,
            streak_count=1,
            best_streak=1,
            last_interaction=now,
            last_sender_id=sender_id,
            freeze_count=1
        )
        db.add(streak)
        just_increased = True
    else:
        last_dt = streak.last_interaction or (now - timedelta(days=2))
        elapsed_seconds = (now - last_dt).total_seconds()
        elapsed_hours = elapsed_seconds / 3600.0

        prev_count = streak.streak_count
        prev_date = last_dt.date()
        current_date = now.date()

        if elapsed_hours > EXPIRY_HOURS:
            if streak.freeze_count > 0:
                streak.freeze_count -= 1
                streak.streak_count = max(1, streak.streak_count)
            else:
                streak.streak_count = 1
                just_increased = True
        elif current_date > prev_date:
            # Different calendar date within the active window -> Streak up!
            streak.streak_count += 1
            just_increased = True
        elif streak.streak_count == 0:
            streak.streak_count = 1
            just_increased = True

        streak.last_interaction = now
        streak.last_sender_id = sender_id
        if streak.streak_count > streak.best_streak:
            streak.best_streak = streak.streak_count

        if just_increased and streak.streak_count in (7, 30, 100):
            just_leveled_up = True

    db.commit()
    db.refresh(streak)

    state = calculate_streak_state(streak, now)
    state["just_increased"] = just_increased
    state["just_leveled_up"] = just_leveled_up
    return state


def get_user_streaks_map(db: Session, user_id: int) -> Dict[int, Dict[str, Any]]:
    """
    Returns map of { other_user_id: streak_summary } for all users that user_id has talked to.
    """
    now = datetime.utcnow()
    records = db.query(ChatStreak).filter(
        or_(ChatStreak.user1_id == user_id, ChatStreak.user2_id == user_id)
    ).all()

    streaks_map = {}
    dirty = False

    for s in records:
        other_id = s.user2_id if s.user1_id == user_id else s.user1_id
        state = calculate_streak_state(s, now)
        if state["count"] != s.streak_count or state["freeze_count"] != s.freeze_count:
            dirty = True
        streaks_map[other_id] = state

    if dirty:
        try:
            db.commit()
        except Exception:
            db.rollback()

    return streaks_map
