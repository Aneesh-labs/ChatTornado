"""
NULL//NORTH Authoritative Game Engine
- Deterministic Seeded Procedural Graph Generator + BFS Solvability Validator
- Balanced 2-4 Player Asymmetric Capability Assignment
- Strict Server-Side Filtered State Projections (zero information leakage across roles)
- Deterministic Action Resolution + Periodic Dimension Instability Shifts
"""

from __future__ import annotations

import hashlib
import random
from collections import deque
from typing import Any, Dict, List, Optional, Tuple

ROLES = ["CARTOGRAPHER", "SEER", "DECODER", "ARCHITECT"]
GLYPHS = ["Δ", "Ω", "Ψ", "◈", "⬡", "✧"]
HAZARD_TYPES = ["distortion", "instability", "false_passage", "lockdown"]

CHAMBER_NAMES = [
    "Null Anchor",
    "Tessera Drift",
    "Prism Corridor",
    "Ion Relay",
    "Phase Conduit",
    "Echo Vault",
    "Obsidian Span",
    "Cipher Nexus",
    "Helix Chamber",
    "Pulse Well",
    "Quantum Rift",
    "Vortex Bridge",
    "Aether Archive",
    "Chrono Bastion",
    "Extraction Core",
]

DIFFICULTY_CFG = {
    "standard": {"room_count": 10, "collapse_sec": 780, "shift_interval": 45, "lock_count": 2, "hazard_ratio": 0.34},
    "hard": {"room_count": 12, "collapse_sec": 660, "shift_interval": 35, "lock_count": 3, "hazard_ratio": 0.45},
    "nightmare": {"room_count": 14, "collapse_sec": 540, "shift_interval": 26, "lock_count": 3, "hazard_ratio": 0.56},
}


def _rng_from_seed(seed: str, salt: str = "") -> random.Random:
    digest = hashlib.sha256(f"{seed}:{salt}".encode("utf-8")).hexdigest()
    return random.Random(int(digest[:16], 16))


def validate_labyrinth_solvable(world_data: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Checks structural integrity:
    1. Start room R0 and extraction room R_EXT exist
    2. No duplicate undirected edges
    3. Extraction room R_EXT is reachable via existing edges (even if locked/bridged)
    4. Every locked edge references a valid cipher puzzle
    """
    rooms = {r["id"]: r for r in world_data.get("rooms", [])}
    edges = world_data.get("edges", [])
    puzzles = world_data.get("puzzles", {})

    if "R0" not in rooms or "R_EXT" not in rooms:
        return False, "Missing R0 or R_EXT chamber"

    seen_pairs = set()
    adj: Dict[str, List[str]] = {rid: [] for rid in rooms}
    for e in edges:
        a, b = e["a"], e["b"]
        if a not in rooms or b not in rooms or a == b:
            return False, f"Invalid endpoints on edge {e.get('id')}"
        pair = tuple(sorted((a, b)))
        if pair in seen_pairs:
            return False, f"Duplicate connection between {a} and {b}"
        seen_pairs.add(pair)

        # Edge is structurally passable if active OR activatable via bridge/unlock
        if e.get("active", True) or e.get("bridge_required", False) or e.get("locked", False):
            adj[a].append(b)
            adj[b].append(a)

        if e.get("locked") and e.get("puzzle_id") not in puzzles:
            return False, f"Locked edge {e.get('id')} missing valid puzzle reference"

    # BFS reachability from R0 -> R_EXT
    q = deque(["R0"])
    visited = {"R0"}
    while q:
        curr = q.popleft()
        if curr == "R_EXT":
            return True, "Valid"
        for nxt in adj.get(curr, []):
            if nxt not in visited:
                visited.add(nxt)
                q.append(nxt)

    return False, "No valid path from R0 to R_EXT"


def generate_labyrinth(seed: str, difficulty: str = "standard") -> Dict[str, Any]:
    """Generates and validates a procedurally linked spatial labyrinth."""
    cfg = DIFFICULTY_CFG.get(difficulty, DIFFICULTY_CFG["standard"])
    rng = _rng_from_seed(seed, "layout")
    room_count = cfg["room_count"]

    # Place rooms onto clean spatial grid coordinates without overlap
    grid_coords: List[Tuple[int, int]] = [(0, 1)]  # R0 start
    used = {(0, 1)}
    frontier = [(1, 1), (0, 0), (0, 2)]
    while len(grid_coords) < room_count - 1 and frontier:
        rng.shuffle(frontier)
        cx, cy = frontier.pop()
        if (cx, cy) in used or cx < 0 or cx > 4 or cy < 0 or cy > 3:
            continue
        used.add((cx, cy))
        grid_coords.append((cx, cy))
        for dx, dy in [(1, 0), (0, 1), (0, -1), (-1, 0)]:
            nx, ny = cx + dx, cy + dy
            if (nx, ny) not in used and 0 <= nx <= 4 and 0 <= ny <= 3:
                frontier.append((nx, ny))

    # Ensure Extraction sits furthest right for dramatic progression
    far_x = max(x for x, _ in grid_coords) + 1
    ext_coord = (min(5, far_x), 1)
    while ext_coord in used:
        ext_coord = (ext_coord[0], (ext_coord[1] + 1) % 4)
    grid_coords.append(ext_coord)

    rooms: List[Dict[str, Any]] = []
    for idx, (gx, gy) in enumerate(grid_coords):
        if idx == 0:
            rid = "R0"
            rtype = "start"
            rname = "Arrival Pod R0"
        elif idx == len(grid_coords) - 1:
            rid = "R_EXT"
            rtype = "extraction"
            rname = "Extraction Gate"
        else:
            rid = f"R{idx}"
            if idx % 4 == 2:
                rtype = "recharge"
            elif idx % 3 == 1:
                rtype = "cipher_vault"
            elif idx % 2 == 0:
                rtype = "junction"
            else:
                rtype = "corridor"
            rname = f"{CHAMBER_NAMES[idx % len(CHAMBER_NAMES)]} ({rid})"

        rooms.append({
            "id": rid,
            "name": rname,
            "gx": gx,
            "gy": gy,
            "type": rtype,
            "orientation": rng.choice([0, 90, 180, 270]),
            "rotatable": rtype in ("junction", "corridor") and rid not in ("R0", "R_EXT"),
            "charge_ready": rtype == "recharge",
            "rune_inscription": f"Glyph {rng.choice(GLYPHS)} resonates in Sector {rid}",
            "scanned": idx == 0,
        })

    # Connect spanning tree ordered nearest neighbor for spatial sense
    edges: List[Dict[str, Any]] = []
    connected = {rooms[0]["id"]}
    pair_set = set()
    edge_seq = 1

    def add_edge(ra: Dict[str, Any], rb: Dict[str, Any], is_bridge: bool = False) -> None:
        nonlocal edge_seq
        pair = tuple(sorted((ra["id"], rb["id"])))
        if pair in pair_set:
            return
        pair_set.add(pair)
        edges.append({
            "id": f"E{edge_seq}",
            "a": ra["id"],
            "b": rb["id"],
            "active": not is_bridge,
            "bridge_required": is_bridge,
            "locked": False,
            "puzzle_id": None,
            "hazard": "none",
            "stabilized": False,
            "cooldown_lock_ticks": 0,
        })
        edge_seq += 1

    for i in range(1, len(rooms)):
        cand = rooms[i]
        # Connect to closest already-connected room
        prev_rooms = [r for r in rooms[:i] if r["id"] in connected]
        prev_rooms.sort(key=lambda r: abs(r["gx"] - cand["gx"]) + abs(r["gy"] - cand["gy"]))
        parent = prev_rooms[0]
        add_edge(parent, cand, is_bridge=(i % 5 == 3))
        connected.add(cand["id"])

    # Add cross-links for multiple routes / Architect switches
    for i, ra in enumerate(rooms[:-1]):
        for rb in rooms[i + 1 :]:
            dist = abs(ra["gx"] - rb["gx"]) + abs(ra["gy"] - rb["gy"])
            if dist <= 2 and rng.random() < 0.32:
                add_edge(ra, rb, is_bridge=(rng.random() < 0.35))

    # Pick locked doors (always including Extraction entry edge!)
    ext_edges = [e for e in edges if "R_EXT" in (e["a"], e["b"])]
    non_start_edges = [e for e in edges if "R0" not in (e["a"], e["b"]) and "R_EXT" not in (e["a"], e["b"])]
    rng.shuffle(non_start_edges)

    lock_targets = ext_edges[:1] + non_start_edges[: max(0, cfg["lock_count"] - 1)]
    puzzles: Dict[str, Any] = {}
    for p_idx, edge in enumerate(lock_targets):
        pid = f"PZ_{p_idx + 1}"
        seq = [rng.choice(GLYPHS) for _ in range(3)]
        clue_room_id = rooms[min(len(rooms) - 2, 1 + p_idx * 2)]["id"]
        edge["locked"] = True
        edge["puzzle_id"] = pid
        puzzles[pid] = {
            "id": pid,
            "edge_id": edge["id"],
            "lock_name": "Extraction Gate Seal" if "R_EXT" in (edge["a"], edge["b"]) else f"Cipher Lock {edge['id']}",
            "target_sequence": seq,
            "clue_room_id": clue_room_id,
            "partial_hint": f"Slot 1 uses {seq[0]} • Contains {seq[2]}",
            "solved": False,
            "attempts": [],
        }

    # Place hazards on edges NOT directly touching R0 start pod
    for edge in edges:
        if "R0" in (edge["a"], edge["b"]):
            continue
        if rng.random() < cfg["hazard_ratio"]:
            edge["hazard"] = rng.choice(HAZARD_TYPES)

    # Identify first upcoming shift target for advance warning
    shift_candidates = [e["id"] for e in edges if "R0" not in (e["a"], e["b"]) and "R_EXT" not in (e["a"], e["b"])]
    next_shift_edge = rng.choice(shift_candidates) if shift_candidates else None

    world_data = {
        "seed": seed,
        "difficulty": difficulty,
        "rooms": rooms,
        "edges": edges,
        "puzzles": puzzles,
        "pings": {},  # room_id -> {label, by, tick}
        "seer_scans": [],  # edge_ids deeply scanned
        "next_shift_edge_id": next_shift_edge,
    }

    ok, err = validate_labyrinth_solvable(world_data)
    if not ok:
        raise ValueError(f"Generated invalid labyrinth: {err}")

    return world_data


def assign_balanced_roles(players: List[Any]) -> None:
    """
    Assigns balanced primary and secondary roles so:
    - 4 players: 1 unique class each (secondary_role=None)
    - 3 players: 3 primary classes + 1 player carries 4th as secondary_role
    - 2 players: Cartographer+Architect vs Seer+Decoder (strict separation preserved)
    - 1 player (solo training): balanced fallback
    """
    count = len(players)
    if count >= 4:
        used = {p.assigned_role for p in players if p.assigned_role in ROLES}
        avail = [r for r in ROLES if r not in used]
        seen = set()
        for p in players:
            if p.assigned_role in ROLES and p.assigned_role not in seen:
                seen.add(p.assigned_role)
                p.secondary_role = None
            else:
                p.assigned_role = avail.pop(0) if avail else ROLES[len(seen) % 4]
                seen.add(p.assigned_role)
                p.secondary_role = None
        return

    if count == 3:
        chosen = []
        avail = list(ROLES)
        for p in players:
            if p.assigned_role in avail:
                avail.remove(p.assigned_role)
                chosen.append(p.assigned_role)
            else:
                r = avail.pop(0)
                p.assigned_role = r
                chosen.append(r)
            p.secondary_role = None
        if avail:
            players[0].secondary_role = avail[0]
        return

    if count == 2:
        players[0].assigned_role = "CARTOGRAPHER"
        players[0].secondary_role = "ARCHITECT"
        players[1].assigned_role = "SEER"
        players[1].secondary_role = "DECODER"
        return

    if count == 1:
        players[0].assigned_role = "CARTOGRAPHER"
        players[0].secondary_role = "DECODER"


def get_player_capabilities(player: Any) -> set[str]:
    caps = set()
    if getattr(player, "assigned_role", None) in ROLES:
        caps.add(player.assigned_role)
    if getattr(player, "secondary_role", None) in ROLES:
        caps.add(player.secondary_role)
    return caps


def project_state_for_player(
    match: Any,
    world_data: Dict[str, Any],
    viewer: Any,
    all_players: List[Any],
    events: List[Any],
) -> Dict[str, Any]:
    """
    STRICT INFORMATION ISOLATION PROJECTION.
    Filters rooms, edges, hazards, and puzzle answers by the viewer's server-assigned classes.
    Never exposes unauthorized map layout, hidden hazard coordinates, or puzzle answers!
    """
    caps = get_player_capabilities(viewer)
    is_carto = "CARTOGRAPHER" in caps
    is_seer = "SEER" in caps
    is_decoder = "DECODER" in caps
    is_arch = "ARCHITECT" in caps

    rooms_by_id = {r["id"]: r for r in world_data.get("rooms", [])}
    my_room_id = viewer.current_room_id
    my_room = rooms_by_id.get(my_room_id)

    # Local edges directly touching the viewer's current room (navigation affordances)
    local_edges = []
    neighbor_ids = {my_room_id}
    for e in world_data.get("edges", []):
        if my_room_id in (e["a"], e["b"]):
            other = e["b"] if e["a"] == my_room_id else e["a"]
            neighbor_ids.add(other)
            edge_view = {
                "id": e["id"],
                "a": e["a"],
                "b": e["b"],
                "target_room_id": other,
                "active": e.get("active", True),
                "bridge_required": e.get("bridge_required", False),
                "locked": e.get("locked", False),
                "puzzle_id": e.get("puzzle_id") if e.get("locked") else None,
                "cooldown_lock_ticks": e.get("cooldown_lock_ticks", 0),
            }
            # Seer sees hazards on adjacent edges! Non-Seers do NOT receive hidden hazard fields!
            if is_seer:
                edge_view["hazard"] = e.get("hazard", "none")
                edge_view["stabilized"] = e.get("stabilized", False)
            local_edges.append(edge_view)

    # 1. CARTOGRAPHER LAYER: Full room topology & connections, zero hazards/solutions
    map_layer = None
    if is_carto:
        map_layer = {
            "rooms": [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "gx": r["gx"],
                    "gy": r["gy"],
                    "type": r["type"] if (r.get("scanned") or r["id"] in ("R0", "R_EXT")) else "unscanned",
                    "scanned": bool(r.get("scanned")),
                }
                for r in world_data.get("rooms", [])
            ],
            "edges": [
                {
                    "id": e["id"],
                    "a": e["a"],
                    "b": e["b"],
                    "active": e.get("active", True),
                    "bridge_required": e.get("bridge_required", False),
                    "locked": e.get("locked", False),
                }
                for e in world_data.get("edges", [])
            ],
        }

    # 2. SEER LAYER: Threat radar & stability forecast (NO full global map coords)
    seer_layer = None
    if is_seer:
        scanned_set = set(world_data.get("seer_scans", []))
        visible_hazards = []
        for e in world_data.get("edges", []):
            is_adj = my_room_id in (e["a"], e["b"])
            if is_adj or e["id"] in scanned_set:
                if e.get("hazard", "none") != "none":
                    visible_hazards.append({
                        "edge_id": e["id"],
                        "between": f"{e['a']} ↔ {e['b']}",
                        "a": e["a"],
                        "b": e["b"],
                        "hazard": e["hazard"],
                        "stabilized": bool(e.get("stabilized", False)),
                    })
        next_shift_id = world_data.get("next_shift_edge_id")
        next_edge = next((x for x in world_data.get("edges", []) if x["id"] == next_shift_id), None)
        seer_layer = {
            "hazards": visible_hazards,
            "next_shift_warning": (
                f"Dimensional flux detected along {next_edge['a']} ↔ {next_edge['b']}"
                if next_edge
                else "Flux readings nominal"
            ),
            "instability_countdown": match.instability_countdown,
        }

    # 3. DECODER LAYER: Locked door ciphers & Mastermind feedback (NEVER exposes raw solution unless solved!)
    decoder_layer = None
    if is_decoder:
        puzzles_view = []
        for pid, pdata in world_data.get("puzzles", {}).items():
            target = pdata["target_sequence"]
            attempts_view = []
            for att in pdata.get("attempts", []):
                exact = sum(1 for i, g in enumerate(att) if i < len(target) and g == target[i])
                # count misplaced symbols carefully
                t_counts: Dict[str, int] = {}
                a_counts: Dict[str, int] = {}
                for i in range(len(target)):
                    if i < len(att) and att[i] != target[i]:
                        t_counts[target[i]] = t_counts.get(target[i], 0) + 1
                        a_counts[att[i]] = a_counts.get(att[i], 0) + 1
                misplaced = sum(min(t_counts.get(sym, 0), cnt) for sym, cnt in a_counts.items())
                attempts_view.append({"sequence": att, "exact": exact, "misplaced": misplaced})

            clue_room = rooms_by_id.get(pdata.get("clue_room_id", "R0"))
            is_clue_accessible = bool(clue_room and (clue_room.get("scanned") or pdata.get("solved")))
            puzzles_view.append({
                "id": pid,
                "edge_id": pdata["edge_id"],
                "lock_name": pdata["lock_name"],
                "solved": bool(pdata.get("solved", False)),
                "clue": pdata["partial_hint"] if is_clue_accessible else f"Scan or reach {pdata.get('clue_room_id')} for cipher resonance",
                "attempts": attempts_view[-6:],
                "glyph_options": GLYPHS,
            })
        decoder_layer = {
            "puzzles": puzzles_view,
            "current_room_inscription": my_room.get("rune_inscription") if my_room else "",
        }

    # 4. ARCHITECT LAYER: Rotatable rooms & bridges + energy status (zero hazards/solutions)
    architect_layer = None
    if is_arch:
        architect_layer = {
            "bridges": [
                {
                    "edge_id": e["id"],
                    "a": e["a"],
                    "b": e["b"],
                    "active": bool(e.get("active", True)),
                    "bridge_required": bool(e.get("bridge_required", False)),
                }
                for e in world_data.get("edges", [])
                if e.get("bridge_required") or not e.get("active", True)
            ],
            "rotatable_chambers": [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "orientation": r["orientation"],
                }
                for r in world_data.get("rooms", [])
                if r.get("rotatable")
            ],
        }

    # Squad visibility: Cartographer sees exact room_ids; others only see co-located or pinged teammates
    team_view = []
    for p in all_players:
        team_view.append({
            "user_id": p.user_id,
            "username": p.user.username if getattr(p, "user", None) else f"Operative #{p.user_id}",
            "assigned_role": p.assigned_role,
            "secondary_role": p.secondary_role,
            "energy": p.energy,
            "hp": p.hp,
            "is_ready": p.is_ready,
            "player_status": p.player_status,
            "room_id": p.current_room_id if (is_carto or p.user_id == viewer.user_id or p.current_room_id == my_room_id) else "UNKNOWN",
        })

    # Visible minimal node neighborhood (just current room + adjacent node stubs so non-Cartographers can click Move!)
    visible_rooms = []
    for rid in neighbor_ids:
        r = rooms_by_id.get(rid)
        if r:
            visible_rooms.append({
                "id": r["id"],
                "name": r["name"],
                "gx": r["gx"],
                "gy": r["gy"],
                "type": r["type"] if (rid == my_room_id or r.get("scanned") or rid in ("R0", "R_EXT")) else "adjacent",
                "charge_ready": bool(r.get("charge_ready", False)) if rid == my_room_id else False,
            })

    return {
        "match": {
            "id": match.id,
            "match_code": match.match_code,
            "status": match.status,
            "game_mode": match.game_mode,
            "difficulty": match.difficulty,
            "player_limit": match.player_limit,
            "host_user_id": match.host_user_id,
            "group_id": match.group_id,
            "current_tick": match.current_tick,
            "collapse_seconds_left": match.collapse_seconds_left,
            "instability_countdown": match.instability_countdown,
            "extraction_progress": match.extraction_progress,
        },
        "self": {
            "user_id": viewer.user_id,
            "assigned_role": viewer.assigned_role,
            "secondary_role": viewer.secondary_role,
            "capabilities": sorted(caps),
            "energy": viewer.energy,
            "hp": viewer.hp,
            "current_room_id": viewer.current_room_id,
            "player_status": viewer.player_status,
            "is_ready": viewer.is_ready,
        },
        "current_room": {
            "id": my_room["id"],
            "name": my_room["name"],
            "type": my_room["type"],
            "gx": my_room["gx"],
            "gy": my_room["gy"],
            "charge_ready": bool(my_room.get("charge_ready", False)),
            "adjacent_edges": local_edges,
            "adjacent_rooms": visible_rooms,
        } if my_room else None,
        "pings": world_data.get("pings", {}),
        "team": team_view,
        "layers": {
            "cartographer": map_layer,
            "seer": seer_layer,
            "decoder": decoder_layer,
            "architect": architect_layer,
        },
        "recent_events": [
            {
                "id": ev.id,
                "type": ev.event_type,
                "payload": ev.event_payload,
                "tick": ev.tick,
            }
            for ev in events[-15:]
        ],
    }


def resolve_player_action(
    match: Any,
    world_data: Dict[str, Any],
    actor: Any,
    all_players: List[Any],
    action_type: str,
    payload: Dict[str, Any],
) -> Tuple[bool, str, List[Tuple[str, Dict[str, Any]]]]:
    """
    Validates permissions, energy, adjacency & puzzle/hazard outcomes authoritatively.
    Returns: (accepted, message, emitted_events)
    """
    if match.status != "active":
        return False, "Match is not active", []
    if actor.player_status == "incapacitated":
        return False, "You are stabilized/incapacitated; wait for a teammate assist", []

    caps = get_player_capabilities(actor)
    rooms = {r["id"]: r for r in world_data["rooms"]}
    edges = world_data["edges"]
    puzzles = world_data["puzzles"]
    emitted: List[Tuple[str, Dict[str, Any]]] = []
    act = action_type.upper().strip()

    if act == "MOVE":
        target_id = str(payload.get("target_room_id", ""))
        if actor.energy < 4:
            return False, "Not enough energy to move (requires 4)", []
        edge = next(
            (e for e in edges if actor.current_room_id in (e["a"], e["b"]) and target_id in (e["a"], e["b"]) and target_id != actor.current_room_id),
            None,
        )
        if not edge:
            return False, "No corridor connects to that room", []
        if not edge.get("active", True):
            return False, "Bridge is dormant — ask Architect to activate it", []
        if edge.get("cooldown_lock_ticks", 0) > 0:
            return False, "Corridor is temporarily locked down", []
        if edge.get("locked", False):
            return False, "Sealed cipher gate — ask Decoder to unlock it", []

        actor.energy = max(0, actor.energy - 4)
        actor.actions_taken += 1

        # Resolve active hazard on edge if unstabilized
        haz = edge.get("hazard", "none")
        if haz != "none" and not edge.get("stabilized", False):
            if haz == "false_passage":
                actor.hp = max(0, actor.hp - 1)
                if actor.hp == 0:
                    actor.player_status = "incapacitated"
                emitted.append(("HAZARD_TRIGGERED", {"user_id": actor.user_id, "hazard": haz, "message": f"False passage threw Operative back into {actor.current_room_id}!"}))
                return True, "Triggered False Passage hazard!", emitted

            if haz == "instability":
                actor.energy = max(0, actor.energy - 18)
                actor.hp = max(0, actor.hp - 1)
                if actor.hp == 0:
                    actor.player_status = "incapacitated"
                actor.current_room_id = target_id
                rooms[target_id]["scanned"] = True
                emitted.append(("HAZARD_TRIGGERED", {"user_id": actor.user_id, "hazard": haz, "message": f"Unstable field burned {actor.user_id} entering {target_id}"}))
                return True, f"Moved to {target_id} through Instability (-1 HP, -18 Energy)", emitted

            if haz == "distortion":
                # Warp actor to another valid neighbor if possible, keeping movement exciting & non-lethal
                alt = next((r["id"] for r in world_data["rooms"] if r["id"] not in (actor.current_room_id, target_id, "R_EXT")), target_id)
                actor.current_room_id = alt
                rooms[alt]["scanned"] = True
                emitted.append(("HAZARD_TRIGGERED", {"user_id": actor.user_id, "hazard": haz, "message": f"Spatial distortion warped operative to {alt}!"}))
                return True, f"Spatial distortion displaced you to {alt}!", emitted

            if haz == "lockdown":
                edge["cooldown_lock_ticks"] = 2
                emitted.append(("HAZARD_TRIGGERED", {"user_id": actor.user_id, "hazard": haz, "message": f"Lockdown sealed corridor {edge['id']} for 2 cycles!"}))
                return True, "Passage slammed into temporary lockdown!", emitted

        actor.current_room_id = target_id
        rooms[target_id]["scanned"] = True
        if rooms[target_id].get("type") == "extraction":
            emitted.append(("EXTRACTION_REACHED", {"user_id": actor.user_id, "room_id": target_id}))
        else:
            emitted.append(("WORLD_UPDATED", {"user_id": actor.user_id, "moved_to": target_id}))
        return True, f"Entered {rooms[target_id]['name']}", emitted

    if act == "SCAN_MAP":
        if "CARTOGRAPHER" not in caps:
            return False, "Only Cartographer can execute global Map Scan", []
        if actor.energy < 15:
            return False, "Requires 15 energy", []
        actor.energy -= 15
        actor.actions_taken += 1
        for r in world_data["rooms"]:
            r["scanned"] = True
        emitted.append(("WORLD_UPDATED", {"message": "Cartographer scanned full labyrinth sectors & vault clues!"}))
        return True, "Full chamber signatures mapped", emitted

    if act == "PING_ROOM":
        if "CARTOGRAPHER" not in caps:
            return False, "Only Cartographer can broadcast beacons", []
        rid = str(payload.get("room_id", actor.current_room_id))
        label = str(payload.get("label", "SAFE"))[:20]
        if rid not in rooms:
            return False, "Invalid chamber", []
        actor.energy = max(0, actor.energy - 5)
        actor.actions_taken += 1
        world_data["pings"][rid] = {"label": label, "by": actor.user_id, "tick": match.current_tick}
        emitted.append(("WORLD_UPDATED", {"message": f"Cartographer marked {rid} as [{label}]"}))
        return True, f"Beacon placed on {rid}", emitted

    if act == "SCAN_HAZARDS":
        if "SEER" not in caps:
            return False, "Only Seer can execute Hazard Scan", []
        if actor.energy < 15:
            return False, "Requires 15 energy", []
        actor.energy -= 15
        actor.actions_taken += 1
        scans = set(world_data.get("seer_scans", []))
        for e in edges:
            scans.add(e["id"])
        world_data["seer_scans"] = list(scans)
        emitted.append(("HAZARD_WARNING", {"message": "Seer revealed all active dimensional hazards!"}))
        return True, "All hazard signatures exposed on radar", emitted

    if act == "STABILIZE_HAZARD":
        if "SEER" not in caps:
            return False, "Only Seer can stabilize dimensional hazards", []
        edge_id = str(payload.get("edge_id", ""))
        edge = next((e for e in edges if e["id"] == edge_id), None)
        if not edge:
            return False, "Invalid corridor edge", []
        if actor.energy < 18:
            return False, "Requires 18 energy", []
        actor.energy -= 18
        actor.actions_taken += 1
        edge["stabilized"] = True
        edge["cooldown_lock_ticks"] = 0
        # Also revive incapacitated allies in adjacent rooms
        for p in all_players:
            if p.player_status == "incapacitated" and p.current_room_id in (edge["a"], edge["b"]):
                p.player_status = "active"
                p.hp = 2
        emitted.append(("WORLD_UPDATED", {"message": f"Seer stabilized corridor {edge['a']} ↔ {edge['b']}!"}))
        return True, f"Stabilized corridor {edge_id}", emitted

    if act == "DECODE_DOOR":
        if "DECODER" not in caps:
            return False, "Only Decoder can solve cipher locks", []
        pid = str(payload.get("puzzle_id", ""))
        seq = payload.get("sequence", [])
        pz = puzzles.get(pid)
        if not pz:
            return False, "Invalid cipher lock", []
        if pz.get("solved"):
            return False, "Cipher lock already solved", []
        if not isinstance(seq, list) or len(seq) != 3:
            return False, "Sequence must have 3 glyphs", []
        if actor.energy < 12:
            return False, "Requires 12 energy", []

        actor.energy -= 12
        actor.actions_taken += 1
        pz["attempts"].append(seq)
        if seq == pz["target_sequence"]:
            pz["solved"] = True
            target_edge = next((e for e in edges if e["id"] == pz["edge_id"]), None)
            if target_edge:
                target_edge["locked"] = False
            emitted.append(("PUZZLE_UPDATED", {"puzzle_id": pid, "solved": True, "message": f"Decoder unlocked {pz['lock_name']}!"}))
            return True, f"{pz['lock_name']} UNLOCKED!", emitted
        else:
            emitted.append(("PUZZLE_UPDATED", {"puzzle_id": pid, "solved": False, "message": f"Decoder tested cipher on {pz['lock_name']}"}))
            return True, "Sequence incorrect — check exact/misplaced resonance hints", emitted

    if act in ("TOGGLE_BRIDGE", "ROTATE_ROOM"):
        if "ARCHITECT" not in caps:
            return False, "Only Architect can manipulate labyrinth structure", []
        if actor.energy < 16:
            return False, "Requires 16 energy", []

        if act == "TOGGLE_BRIDGE":
            edge_id = str(payload.get("edge_id", ""))
            edge = next((e for e in edges if e["id"] == edge_id), None)
            if not edge:
                return False, "Invalid bridge edge", []
            prev_active = edge["active"]
            edge["active"] = not prev_active
            ok, _ = validate_labyrinth_solvable(world_data)
            if not ok:
                edge["active"] = prev_active
                return False, "Safety interlock: toggling this bridge isolates Extraction Gate!", []
            actor.energy -= 16
            actor.actions_taken += 1
            state_word = "ACTIVATED" if edge["active"] else "RETRACTED"
            emitted.append(("WORLD_UPDATED", {"message": f"Architect {state_word} bridge {edge['a']} ↔ {edge['b']}"}))
            return True, f"Bridge {edge['id']} {state_word}", emitted

        room_id = str(payload.get("room_id", actor.current_room_id))
        room = rooms.get(room_id)
        if not room or not room.get("rotatable"):
            return False, "Chamber cannot be rotated", []
        actor.energy -= 16
        actor.actions_taken += 1
        room["orientation"] = (room["orientation"] + 90) % 360
        # Side effect: activates one dormant bridge & clears lockdowns adjacent to rotated hub
        for e in edges:
            if room_id in (e["a"], e["b"]):
                e["active"] = True
                e["cooldown_lock_ticks"] = 0
        emitted.append(("WORLD_UPDATED", {"message": f"Architect rotated chamber {room_id} to {room['orientation']}° — adjacent bridges aligned!"}))
        return True, f"Rotated {room_id} to {room['orientation']}°", emitted

    if act == "RECHARGE":
        curr_room = rooms.get(actor.current_room_id)
        gain = 45 if (curr_room and curr_room.get("charge_ready")) else 22
        if curr_room and curr_room.get("charge_ready"):
            curr_room["charge_ready"] = False
        actor.energy = min(100, actor.energy + gain)
        if actor.hp < 3 and gain >= 40:
            actor.hp += 1
        actor.actions_taken += 1
        emitted.append(("WORLD_UPDATED", {"message": f"Operative recharged +{gain} energy at {actor.current_room_id}"}))
        return True, f"Recharged +{gain} energy", emitted

    if act == "TRIGGER_EXTRACTION":
        if actor.current_room_id != "R_EXT":
            return False, "Must stand inside Extraction Gate R_EXT", []
        ext_puzzles = [p for p in puzzles.values() if p["lock_name"].startswith("Extraction Gate")]
        if any(not p.get("solved") for p in ext_puzzles):
            return False, "Extraction Gate cipher lock is still sealed!", []

        in_ext = sum(1 for p in all_players if p.current_room_id == "R_EXT" and p.player_status != "incapacitated")
        active_total = max(1, sum(1 for p in all_players if p.player_status != "incapacitated"))
        actor.actions_taken += 1

        if in_ext >= active_total or (len(all_players) > 2 and in_ext >= 2):
            match.extraction_progress = 100
            match.status = "completed"
            emitted.append(("MATCH_COMPLETED", {"message": "TEAM EXTRACTED! Labyrinth cipher bypassed cleanly."}))
            return True, "EXTRACTION COMPLETE — VICTORY!", emitted
        else:
            match.extraction_progress = min(85, int((in_ext / active_total) * 100))
            emitted.append(("EXTRACTION_STARTED", {"progress": match.extraction_progress, "message": f"{in_ext}/{active_total} operatives at Extraction Gate!"}))
            return True, f"Beacon armed ({in_ext}/{active_total} operatives inside gate)", emitted

    return False, f"Unknown action: {action_type}", []


def step_dimension_tick(
    match: Any,
    world_data: Dict[str, Any],
    all_players: List[Any],
    dt_seconds: int = 5,
) -> List[Tuple[str, Dict[str, Any]]]:
    """
    Advances dimension collapse clock, restores passive energy trickle,
    and triggers validated periodic environmental instability shifts.
    """
    if match.status != "active":
        return []

    emitted: List[Tuple[str, Dict[str, Any]]] = []
    match.current_tick += 1
    match.collapse_seconds_left = max(0, match.collapse_seconds_left - dt_seconds)
    match.instability_countdown = max(0, match.instability_countdown - dt_seconds)

    # Check defeat if collapse timer hits 0 OR all players incapacitated
    if match.collapse_seconds_left <= 0:
        match.status = "failed"
        emitted.append(("MATCH_FAILED", {"reason": "Dimension collapsed before extraction!"}))
        return emitted

    if all_players and all(p.player_status == "incapacitated" for p in all_players):
        match.status = "failed"
        emitted.append(("MATCH_FAILED", {"reason": "All operatives incapacitated inside the labyrinth."}))
        return emitted

    # Gentle passive energy recovery (+3 per tick) + decrement lockdown cooldowns
    for p in all_players:
        if p.player_status == "active":
            p.energy = min(100, p.energy + 3)

    for e in world_data.get("edges", []):
        if e.get("cooldown_lock_ticks", 0) > 0:
            e["cooldown_lock_ticks"] -= 1

    # Periodic Dimension Instability Shift
    if match.instability_countdown <= 0:
        cfg = DIFFICULTY_CFG.get(match.difficulty, DIFFICULTY_CFG["standard"])
        match.instability_countdown = cfg["shift_interval"]
        rng = _rng_from_seed(world_data["seed"], f"shift_{match.current_tick}")

        target_id = world_data.get("next_shift_edge_id")
        edges = world_data.get("edges", [])
        target_edge = next((e for e in edges if e["id"] == target_id), None)
        if target_edge:
            # Shift hazard type or reset charge readiness without bricking extraction
            target_edge["stabilized"] = False
            if rng.random() < 0.5:
                target_edge["hazard"] = rng.choice(HAZARD_TYPES)
            else:
                prev = target_edge.get("active", True)
                target_edge["active"] = not prev
                ok, _ = validate_labyrinth_solvable(world_data)
                if not ok:
                    target_edge["active"] = prev
                    target_edge["hazard"] = "instability"

        # Queue next warning for Seer
        cands = [e["id"] for e in edges if "R0" not in (e["a"], e["b"]) and "R_EXT" not in (e["a"], e["b"])]
        world_data["next_shift_edge_id"] = rng.choice(cands) if cands else None
        emitted.append(("HAZARD_WARNING", {"message": "DIMENSION SHIFT OCCURRED — Sector pathways & hazards re-aligned!"}))

    return emitted
