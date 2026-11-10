"""
FastAPI REST Routes & Isolated Real-Time Broadcaster for NULL//NORTH.
Handles match lifecycle, invitation card posting into ChatTornado conversations,
server-authoritative actions, per-player state filtering, background dimension
ticks, player statistics, and global leaderboard.
"""

from __future__ import annotations

import asyncio
import json
import secrets
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from auth import decode_token
from database import SessionLocal, get_db
from models import (
    GroupMember,
    Message,
    MessageVisibility,
    NullNorthAction,
    NullNorthEvent,
    NullNorthMatch,
    NullNorthPlayer,
    NullNorthStatistics,
    NullNorthWorldState,
    User,
)
from null_north_engine import (
    ROLES,
    assign_balanced_roles,
    generate_labyrinth,
    project_state_for_player,
    resolve_player_action,
    step_dimension_tick,
    DIFFICULTY_CFG,
)
from websocket_manager import manager

router = APIRouter(prefix="/api/games/null-north", tags=["null-north"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class CreateMatchRequest(BaseModel):
    difficulty: str = Field("standard", pattern="^(standard|hard|nightmare)$")
    game_mode: str = Field("classic", pattern="^(classic|endless|duel)$")
    player_limit: int = Field(4, ge=2, le=4)
    solo_bots: bool = False
    group_id: Optional[int] = None
    dm_partner_id: Optional[int] = None


class SelectRoleRequest(BaseModel):
    role: str = Field(..., pattern="^(AUTO|CARTOGRAPHER|SEER|DECODER|ARCHITECT)$")


class InviteTargetRequest(BaseModel):
    group_id: Optional[int] = None
    dm_partner_id: Optional[int] = None


class SubmitActionRequest(BaseModel):
    action_type: str = Field(..., min_length=2, max_length=32)
    payload: Dict[str, Any] = Field(default_factory=dict)


# ============================================================================
# Auth & Helper Utilities
# ============================================================================

def get_authenticated_user(
    request: Request,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> User:
    raw_token = token
    if not raw_token:
        auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            raw_token = auth_header[7:].strip()
    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication token required.")

    payload = decode_token(raw_token)
    if not payload or not payload.get("user_id"):
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    user = db.query(User).filter(User.id == int(payload["user_id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


def resolve_match(db: Session, match_ref: str) -> NullNorthMatch:
    ref = str(match_ref).strip()
    match = None
    if ref.isdigit():
        match = db.query(NullNorthMatch).filter(NullNorthMatch.id == int(ref)).first()
    if not match:
        match = db.query(NullNorthMatch).filter(NullNorthMatch.match_code == ref.upper()).first()
    if not match:
        raise HTTPException(status_code=404, detail="NULL//NORTH match not found.")
    return match


def ensure_stats_row(db: Session, user_id: int) -> NullNorthStatistics:
    st = db.query(NullNorthStatistics).filter(NullNorthStatistics.user_id == user_id).first()
    if not st:
        st = NullNorthStatistics(user_id=user_id)
        db.add(st)
        db.flush()
    return st


def finalize_match_statistics(db: Session, match: NullNorthMatch, players: List[NullNorthPlayer], victory: bool) -> None:
    if match.completed_at is not None:
        return
    match.completed_at = datetime.utcnow()
    cfg = DIFFICULTY_CFG.get(match.difficulty, DIFFICULTY_CFG["standard"])
    elapsed_sec = max(1, cfg["collapse_sec"] - match.collapse_seconds_left)

    for p in players:
        st = ensure_stats_row(db, p.user_id)
        st.matches_played += 1
        if victory:
            st.victories += 1
            st.xp += 150 + (25 if match.difficulty == "hard" else 50 if match.difficulty == "nightmare" else 0)
            if st.best_escape_seconds is None or elapsed_sec < st.best_escape_seconds:
                st.best_escape_seconds = elapsed_sec
        else:
            st.defeats += 1
            st.xp += 35
        st.rooms_explored += max(1, p.actions_taken)
        st.updated_at = datetime.utcnow()


async def broadcast_filtered_match_state(
    db: Session,
    match: NullNorthMatch,
    event_name: str,
    world_data: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Sends individually filtered state packets to each participant over WebSocket.
    Never broadcasts unfiltered global labyrinth data!
    """
    players = db.query(NullNorthPlayer).filter(NullNorthPlayer.match_id == match.id).all()
    if world_data is None and match.world_state:
        world_data = match.world_state.world_data

    events = (
        db.query(NullNorthEvent)
        .filter(NullNorthEvent.match_id == match.id)
        .order_by(NullNorthEvent.id.desc())
        .limit(15)
        .all()
    )
    events = list(reversed(events))

    for p in players:
        projected = (
            project_state_for_player(match, world_data, p, players, events)
            if (world_data and match.status != "lobby")
            else _project_lobby_state(match, p, players)
        )
        await manager.send_personal_message(
            p.user_id,
            {
                "type": "null_north_event",
                "event": event_name,
                "match_id": match.id,
                "match_code": match.match_code,
                "state": projected,
            },
        )


def _project_lobby_state(match: NullNorthMatch, viewer: NullNorthPlayer, players: List[NullNorthPlayer]) -> Dict[str, Any]:
    return {
        "match": {
            "id": match.id,
            "match_code": match.match_code,
            "status": match.status,
            "game_mode": match.game_mode,
            "difficulty": match.difficulty,
            "player_limit": match.player_limit,
            "solo_bots": match.solo_bots,
            "host_user_id": match.host_user_id,
            "group_id": match.group_id,
            "collapse_seconds_left": match.collapse_seconds_left,
            "instability_countdown": match.instability_countdown,
            "extraction_progress": match.extraction_progress,
        },
        "self": {
            "user_id": viewer.user_id,
            "assigned_role": viewer.assigned_role,
            "secondary_role": viewer.secondary_role,
            "is_ready": viewer.is_ready,
            "energy": viewer.energy,
            "hp": viewer.hp,
            "current_room_id": viewer.current_room_id,
            "player_status": viewer.player_status,
        },
        "team": [
            {
                "user_id": p.user_id,
                "username": p.user.username if getattr(p, "user", None) else f"Operative #{p.user_id}",
                "assigned_role": p.assigned_role,
                "secondary_role": p.secondary_role,
                "is_ready": p.is_ready,
                "energy": p.energy,
                "hp": p.hp,
                "player_status": p.player_status,
            }
            for p in players
        ],
        "layers": {"cartographer": None, "seer": None, "decoder": None, "architect": None},
        "recent_events": [],
    }


def _gen_match_code(db: Session) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    for _ in range(10):
        code = "".join(secrets.choice(alphabet) for _ in range(6))
        if not db.query(NullNorthMatch).filter(NullNorthMatch.match_code == code).first():
            return code
    return secrets.token_hex(3).upper()


async def _post_chat_invitation(
    db: Session,
    match: NullNorthMatch,
    host: User,
    group_id: Optional[int],
    dm_partner_id: Optional[int],
) -> None:
    invite_payload = {
        "type": "NULLNORTH_INVITE",
        "match_id": match.id,
        "match_code": match.match_code,
        "host_id": host.id,
        "host_username": host.username,
        "difficulty": match.difficulty,
        "player_limit": match.player_limit,
        "joined_count": 1,
        "status": match.status,
    }
    text_body = "🎮 GAME:" + json.dumps(invite_payload)

    if group_id:
        member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == host.id,
        ).first()
        if not member:
            return
        msg = Message(
            sender_id=host.id,
            group_id=group_id,
            message=text_body,
            created_at=datetime.utcnow(),
            read_state="sent",
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        members = db.query(GroupMember.user_id).filter(GroupMember.group_id == group_id).all()
        packet = {
            "type": "group_message",
            "id": msg.id,
            "sender_id": host.id,
            "sender_name": host.username,
            "group_id": group_id,
            "message": text_body,
            "created_at": msg.created_at.isoformat(),
            "read_state": "sent",
            "reactions": [],
        }
        for (uid,) in members:
            await manager.send_personal_message(uid, packet)
    elif dm_partner_id and dm_partner_id != host.id:
        msg = Message(
            sender_id=host.id,
            receiver_id=dm_partner_id,
            message=text_body,
            created_at=datetime.utcnow(),
            read_state="sent",
        )
        db.add(msg)
        db.flush()
        db.add(MessageVisibility(message_id=msg.id, user_id=host.id, visible=True))
        db.add(MessageVisibility(message_id=msg.id, user_id=dm_partner_id, visible=True))
        db.commit()
        db.refresh(msg)
        packet = {
            "type": "private_message",
            "id": msg.id,
            "sender_id": host.id,
            "receiver_id": dm_partner_id,
            "message": text_body,
            "created_at": msg.created_at.isoformat(),
            "read_state": "sent",
            "reactions": [],
        }
        await manager.send_personal_message(dm_partner_id, packet)
        await manager.send_personal_message(host.id, packet)


# ============================================================================
# REST Endpoints
# ============================================================================

@router.post("/matches")
async def create_match(
    req: CreateMatchRequest,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    cfg = DIFFICULTY_CFG.get(req.difficulty, DIFFICULTY_CFG["standard"])
    seed = secrets.token_hex(8)
    world_data = generate_labyrinth(seed, req.difficulty)
    code = _gen_match_code(db)

    match = NullNorthMatch(
        match_code=code,
        host_user_id=user.id,
        group_id=req.group_id,
        dm_partner_id=req.dm_partner_id,
        status="lobby",
        game_mode=req.game_mode,
        difficulty=req.difficulty,
        player_limit=req.player_limit,
        solo_bots=req.solo_bots,
        world_seed=seed,
        collapse_seconds_left=cfg["collapse_sec"],
        instability_countdown=cfg["shift_interval"],
    )
    db.add(match)
    db.commit()
    db.refresh(match)

    host_player = NullNorthPlayer(
        match_id=match.id,
        user_id=user.id,
        assigned_role="CARTOGRAPHER",
        is_ready=True,
    )
    db.add(host_player)

    world_row = NullNorthWorldState(
        match_id=match.id,
        state_version=1,
        current_tick=0,
        world_data=world_data,
    )
    db.add(world_row)
    db.commit()
    db.refresh(host_player)

    if req.group_id or req.dm_partner_id:
        try:
            await _post_chat_invitation(db, match, user, req.group_id, req.dm_partner_id)
        except Exception as err:
            print(f"[NULL//NORTH INVITE WARNING] {err}")

    players = [host_player]
    return {
        "success": True,
        "match_id": match.id,
        "match_code": match.match_code,
        "state": _project_lobby_state(match, host_player, players),
    }


@router.get("/matches")
def list_open_matches(
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(NullNorthMatch)
        .filter(NullNorthMatch.status.in_(["lobby", "active"]))
        .order_by(NullNorthMatch.id.desc())
        .limit(20)
        .all()
    )
    out = []
    for m in rows:
        plist = db.query(NullNorthPlayer).filter(NullNorthPlayer.match_id == m.id).all()
        is_member = any(p.user_id == user.id for p in plist)
        if m.status == "active" and not is_member:
            continue
        out.append({
            "id": m.id,
            "match_code": m.match_code,
            "host_user_id": m.host_user_id,
            "host_username": m.host.username if m.host else "Operative",
            "status": m.status,
            "difficulty": m.difficulty,
            "game_mode": m.game_mode,
            "player_limit": m.player_limit,
            "joined_count": len(plist),
            "is_member": is_member,
            "created_at": m.created_at.isoformat(),
        })
    return {"matches": out}


@router.get("/matches/{match_ref}")
def get_match_details(
    match_ref: str,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    match = resolve_match(db, match_ref)
    players = db.query(NullNorthPlayer).filter(NullNorthPlayer.match_id == match.id).all()
    me = next((p for p in players if p.user_id == user.id), None)

    summary = {
        "id": match.id,
        "match_code": match.match_code,
        "status": match.status,
        "difficulty": match.difficulty,
        "game_mode": match.game_mode,
        "player_limit": match.player_limit,
        "joined_count": len(players),
        "host_username": match.host.username if match.host else "Operative",
        "is_member": me is not None,
    }
    if not me:
        return {"summary": summary, "state": None}

    events = (
        db.query(NullNorthEvent)
        .filter(NullNorthEvent.match_id == match.id)
        .order_by(NullNorthEvent.id.desc())
        .limit(15)
        .all()
    )
    events = list(reversed(events))
    state = (
        project_state_for_player(match, match.world_state.world_data, me, players, events)
        if (match.status != "lobby" and match.world_state)
        else _project_lobby_state(match, me, players)
    )
    return {"summary": summary, "state": state}


@router.post("/matches/{match_ref}/join")
async def join_match(
    match_ref: str,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    match = resolve_match(db, match_ref)
    players = db.query(NullNorthPlayer).filter(NullNorthPlayer.match_id == match.id).all()
    existing = next((p for p in players if p.user_id == user.id), None)
    if existing:
        if existing.player_status == "disconnected":
            existing.player_status = "active"
            db.commit()
        state = (
            project_state_for_player(match, match.world_state.world_data, existing, players, [])
            if (match.status != "lobby" and match.world_state)
            else _project_lobby_state(match, existing, players)
        )
        return {"joined": True, "state": state}

    if match.status != "lobby":
        raise HTTPException(status_code=400, detail="Match is already underway or finished.")
    if len(players) >= match.player_limit:
        raise HTTPException(status_code=400, detail="Match lobby is full.")

    taken = {p.assigned_role for p in players if p.assigned_role in ROLES}
    next_role = next((r for r in ROLES if r not in taken), "AUTO")
    new_player = NullNorthPlayer(
        match_id=match.id,
        user_id=user.id,
        assigned_role=next_role,
        is_ready=False,
    )
    db.add(new_player)
    db.commit()
    db.refresh(new_player)

    players = db.query(NullNorthPlayer).filter(NullNorthPlayer.match_id == match.id).all()
    await broadcast_filtered_match_state(db, match, "MATCH_JOINED")
    return {"joined": True, "state": _project_lobby_state(match, new_player, players)}


@router.post("/matches/{match_ref}/role")
async def select_role(
    match_ref: str,
    req: SelectRoleRequest,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    match = resolve_match(db, match_ref)
    if match.status != "lobby":
        raise HTTPException(status_code=400, detail="Roles can only be changed in the lobby.")

    players = db.query(NullNorthPlayer).filter(NullNorthPlayer.match_id == match.id).all()
    me = next((p for p in players if p.user_id == user.id), None)
    if not me:
        raise HTTPException(status_code=403, detail="Not a member of this match.")

    if req.role != "AUTO":
        clash = next((p for p in players if p.user_id != user.id and p.assigned_role == req.role), None)
        if clash:
            raise HTTPException(status_code=409, detail=f"{req.role} is already claimed by {clash.user.username}.")

    me.assigned_role = req.role
    db.commit()
    await broadcast_filtered_match_state(db, match, "ROLE_ASSIGNED")
    return {"success": True, "state": _project_lobby_state(match, me, players)}


@router.post("/matches/{match_ref}/ready")
async def toggle_ready(
    match_ref: str,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    match = resolve_match(db, match_ref)
    if match.status != "lobby":
        raise HTTPException(status_code=400, detail="Match already started.")

    players = db.query(NullNorthPlayer).filter(NullNorthPlayer.match_id == match.id).all()
    me = next((p for p in players if p.user_id == user.id), None)
    if not me:
        raise HTTPException(status_code=403, detail="Not a member of this match.")

    me.is_ready = not me.is_ready
    db.commit()
    await broadcast_filtered_match_state(db, match, "PLAYER_READY")
    return {"is_ready": me.is_ready, "state": _project_lobby_state(match, me, players)}


@router.post("/matches/{match_ref}/invite")
async def send_match_invite(
    match_ref: str,
    req: InviteTargetRequest,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    match = resolve_match(db, match_ref)
    players = db.query(NullNorthPlayer).filter(NullNorthPlayer.match_id == match.id).all()
    if not any(p.user_id == user.id for p in players):
        raise HTTPException(status_code=403, detail="Only match members can invite players.")
    await _post_chat_invitation(db, match, user, req.group_id, req.dm_partner_id)
    return {"invited": True, "match_code": match.match_code}


@router.post("/matches/{match_ref}/start")
async def start_match(
    match_ref: str,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    match = resolve_match(db, match_ref)
    if match.host_user_id != user.id:
        raise HTTPException(status_code=403, detail="Only the match host can initiate deployment.")
    if match.status != "lobby":
        raise HTTPException(status_code=400, detail="Match is not in lobby state.")

    players = db.query(NullNorthPlayer).filter(NullNorthPlayer.match_id == match.id).all()
    if len(players) < 2 and not match.solo_bots:
        raise HTTPException(status_code=400, detail="At least 2 operatives (or Solo Training mode) are required.")

    assign_balanced_roles(players)
    match.status = "active"
    match.started_at = datetime.utcnow()

    ev = NullNorthEvent(
        match_id=match.id,
        event_type="MATCH_STARTED",
        event_payload={"message": "Dimensional link stabilized. Communicate via ChatTornado to escape!"},
        tick=0,
    )
    db.add(ev)
    db.commit()

    world_data = match.world_state.world_data
    await broadcast_filtered_match_state(db, match, "MATCH_STARTED", world_data=world_data)
    me = next(p for p in players if p.user_id == user.id)
    return {
        "started": True,
        "state": project_state_for_player(match, world_data, me, players, [ev]),
    }


@router.post("/matches/{match_ref}/actions")
async def submit_action(
    match_ref: str,
    req: SubmitActionRequest,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    match = resolve_match(db, match_ref)
    players = db.query(NullNorthPlayer).filter(NullNorthPlayer.match_id == match.id).all()
    me = next((p for p in players if p.user_id == user.id), None)
    if not me:
        raise HTTPException(status_code=403, detail="Unauthorized: not a match operative.")
    if match.status != "active" or not match.world_state:
        raise HTTPException(status_code=400, detail="Match is not active.")

    ws = match.world_state
    world_data = json.loads(json.dumps(ws.world_data))  # safe working copy
    accepted, feedback, emitted = resolve_player_action(
        match, world_data, me, players, req.action_type, req.payload
    )

    action_log = NullNorthAction(
        match_id=match.id,
        user_id=user.id,
        action_type=req.action_type.upper(),
        action_payload=req.payload,
        tick=match.current_tick,
        status="accepted" if accepted else "rejected",
        reason=feedback,
    )
    db.add(action_log)

    if not accepted:
        db.commit()
        raise HTTPException(status_code=400, detail=feedback)

    # Track solved puzzles stat cleanly
    if req.action_type.upper() == "DECODE_DOOR" and any(e_t == "PUZZLE_UPDATED" and e_p.get("solved") for e_t, e_p in emitted):
        st = ensure_stats_row(db, user.id)
        st.puzzles_solved += 1
        st.xp += 40

    ws.world_data = world_data
    ws.state_version += 1
    ws.current_tick = match.current_tick
    flag_modified(ws, "world_data")

    last_ev_name = "WORLD_UPDATED"
    for etype, epayload in emitted:
        last_ev_name = etype
        db.add(NullNorthEvent(match_id=match.id, event_type=etype, event_payload=epayload, tick=match.current_tick))

    if match.status in ("completed", "failed"):
        finalize_match_statistics(db, match, players, victory=(match.status == "completed"))

    db.commit()
    await broadcast_filtered_match_state(db, match, last_ev_name, world_data=world_data)

    events = (
        db.query(NullNorthEvent)
        .filter(NullNorthEvent.match_id == match.id)
        .order_by(NullNorthEvent.id.desc())
        .limit(15)
        .all()
    )
    events = list(reversed(events))
    return {
        "accepted": True,
        "feedback": feedback,
        "state": project_state_for_player(match, world_data, me, players, events),
    }


@router.get("/matches/{match_ref}/state")
def get_player_filtered_state(
    match_ref: str,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    match = resolve_match(db, match_ref)
    players = db.query(NullNorthPlayer).filter(NullNorthPlayer.match_id == match.id).all()
    me = next((p for p in players if p.user_id == user.id), None)
    if not me:
        raise HTTPException(status_code=403, detail="Unauthorized: not a match operative.")

    if match.status == "lobby" or not match.world_state:
        return {"state": _project_lobby_state(match, me, players)}

    events = (
        db.query(NullNorthEvent)
        .filter(NullNorthEvent.match_id == match.id)
        .order_by(NullNorthEvent.id.desc())
        .limit(15)
        .all()
    )
    events = list(reversed(events))
    return {"state": project_state_for_player(match, match.world_state.world_data, me, players, events)}


@router.get("/profile")
def get_null_north_profile(
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    st = ensure_stats_row(db, user.id)
    db.commit()
    recent = (
        db.query(NullNorthPlayer)
        .filter(NullNorthPlayer.user_id == user.id)
        .order_by(NullNorthPlayer.id.desc())
        .limit(8)
        .all()
    )
    history = [
        {
            "match_id": p.match.id,
            "match_code": p.match.match_code,
            "status": p.match.status,
            "difficulty": p.match.difficulty,
            "role": p.assigned_role,
            "created_at": p.match.created_at.isoformat(),
        }
        for p in recent
        if p.match is not None
    ]
    return {
        "stats": {
            "matches_played": st.matches_played,
            "victories": st.victories,
            "defeats": st.defeats,
            "puzzles_solved": st.puzzles_solved,
            "rooms_explored": st.rooms_explored,
            "xp": st.xp,
            "best_escape_seconds": st.best_escape_seconds,
        },
        "recent_matches": history,
    }


@router.get("/leaderboard")
def get_null_north_leaderboard(
    db: Session = Depends(get_db),
):
    rows = (
        db.query(NullNorthStatistics)
        .order_by(NullNorthStatistics.victories.desc(), NullNorthStatistics.xp.desc())
        .limit(15)
        .all()
    )
    return {
        "leaderboard": [
            {
                "user_id": r.user_id,
                "username": r.user.username if r.user else f"Operative #{r.user_id}",
                "victories": r.victories,
                "matches_played": r.matches_played,
                "puzzles_solved": r.puzzles_solved,
                "xp": r.xp,
                "best_escape_seconds": r.best_escape_seconds,
            }
            for r in rows
        ]
    }


# ============================================================================
# Background Authoritative Match Tick Loop (Dimension Collapse & Shifts)
# ============================================================================

async def null_north_tick_worker() -> None:
    """Runs continuously in FastAPI lifespan to tick active NULL//NORTH matches every 5s."""
    while True:
        await asyncio.sleep(5)
        db = None
        try:
            db = SessionLocal()
            active_matches = db.query(NullNorthMatch).filter(NullNorthMatch.status == "active").all()
            for match in active_matches:
                if not match.world_state:
                    continue
                players = db.query(NullNorthPlayer).filter(NullNorthPlayer.match_id == match.id).all()
                world_data = json.loads(json.dumps(match.world_state.world_data))
                emitted = step_dimension_tick(match, world_data, players, dt_seconds=5)
                match.world_state.world_data = world_data
                match.world_state.current_tick = match.current_tick
                match.world_state.state_version += 1
                flag_modified(match.world_state, "world_data")

                last_ev = "WORLD_UPDATED"
                for etype, epayload in emitted:
                    last_ev = etype
                    db.add(NullNorthEvent(match_id=match.id, event_type=etype, event_payload=epayload, tick=match.current_tick))

                if match.status == "failed":
                    finalize_match_statistics(db, match, players, victory=False)

                db.commit()
                await broadcast_filtered_match_state(db, match, last_ev, world_data=world_data)
        except asyncio.CancelledError:
            raise
        except Exception as err:
            if db:
                db.rollback()
            print(f"[NULL//NORTH TICK ERROR] {err}")
        finally:
            if db:
                db.close()
