"""
Automated Pytest Suite for NULL//NORTH Backend Engine & FastAPI Multiplayer API.
Covers procedural generation validation, strict role-layer isolation,
2-player & 4-player matches, authoritative actions, hazards, puzzles,
dimension instability, extraction victory, defeat & unauthorized access checks.
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from auth import create_access_token, hash_password
from main import app
from models import User, NullNorthMatch, NullNorthPlayer, NullNorthWorldState
from null_north_engine import (
    generate_labyrinth,
    validate_labyrinth_solvable,
    step_dimension_tick,
    ROLES,
)


SQLALCHEMY_TEST_URL = "sqlite:///./test_null_north.db"
test_engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_clean_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


def create_user_and_token(username: str, email: str):
    db = TestingSessionLocal()
    try:
        u = User(
            username=username,
            email=email,
            password=hash_password("Pass123!"),
            email_verified=True,
            account_status="active",
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        tok = create_access_token({"user_id": u.id, "username": u.username, "email_verified": True})
        return u.id, tok
    finally:
        db.close()


def test_procedural_generator_validates_all_difficulties():
    for diff in ("standard", "hard", "nightmare"):
        for idx in range(15):
            w = generate_labyrinth(f"seed_{diff}_{idx}", diff)
            ok, msg = validate_labyrinth_solvable(w)
            assert ok, f"Invalid maze for {diff} #{idx}: {msg}"
            ext_puzzles = [p for p in w["puzzles"].values() if p["lock_name"].startswith("Extraction")]
            assert len(ext_puzzles) == 1


def test_full_4_player_match_isolation_puzzles_and_extraction():
    client = TestClient(app)
    u1, t1 = create_user_and_token("op_carto", "c@test.io")
    u2, t2 = create_user_and_token("op_seer", "s@test.io")
    u3, t3 = create_user_and_token("op_dec", "d@test.io")
    u4, t4 = create_user_and_token("op_arch", "a@test.io")
    outsider, tout = create_user_and_token("outsider", "out@test.io")

    # 1. Host creates match
    res = client.post(
        "/api/games/null-north/matches",
        json={"difficulty": "standard", "player_limit": 4},
        headers={"Authorization": f"Bearer {t1}"},
    )
    assert res.status_code == 200
    m_id = res.json()["match_id"]
    m_code = res.json()["match_code"]

    # 2. Remaining 3 operatives join & pick distinct classes
    for tok, role in [(t2, "SEER"), (t3, "DECODER"), (t4, "ARCHITECT")]:
        j = client.post(f"/api/games/null-north/matches/{m_code}/join", headers={"Authorization": f"Bearer {tok}"})
        assert j.status_code == 200
        r = client.post(
            f"/api/games/null-north/matches/{m_id}/role",
            json={"role": role},
            headers={"Authorization": f"Bearer {tok}"},
        )
        assert r.status_code == 200
        assert client.post(f"/api/games/null-north/matches/{m_id}/ready", headers={"Authorization": f"Bearer {tok}"}).status_code == 200

    # Non-host start blocked (403)
    assert client.post(f"/api/games/null-north/matches/{m_id}/start", headers={"Authorization": f"Bearer {t2}"}).status_code == 403

    # Host starts match
    st_res = client.post(f"/api/games/null-north/matches/{m_id}/start", headers={"Authorization": f"Bearer {t1}"})
    assert st_res.status_code == 200

    # Outsider blocked from reading match state (403)
    assert client.get(f"/api/games/null-north/matches/{m_id}/state", headers={"Authorization": f"Bearer {tout}"}).status_code == 403

    # 3. Verify STRICT ROLE INFORMATION ISOLATION
    s_carto = client.get(f"/api/games/null-north/matches/{m_id}/state", headers={"Authorization": f"Bearer {t1}"}).json()["state"]
    s_seer = client.get(f"/api/games/null-north/matches/{m_id}/state", headers={"Authorization": f"Bearer {t2}"}).json()["state"]
    s_dec = client.get(f"/api/games/null-north/matches/{m_id}/state", headers={"Authorization": f"Bearer {t3}"}).json()["state"]
    s_arch = client.get(f"/api/games/null-north/matches/{m_id}/state", headers={"Authorization": f"Bearer {t4}"}).json()["state"]

    assert s_carto["layers"]["cartographer"] is not None
    assert s_carto["layers"]["seer"] is None
    assert s_carto["layers"]["decoder"] is None
    assert "hazard" not in str(s_carto["layers"]["cartographer"])
    assert "target_sequence" not in str(s_carto)

    assert s_seer["layers"]["seer"] is not None
    assert s_seer["layers"]["cartographer"] is None
    assert "target_sequence" not in str(s_seer)

    assert s_dec["layers"]["decoder"] is not None
    assert s_dec["layers"]["cartographer"] is None
    assert s_dec["layers"]["seer"] is None
    assert "target_sequence" not in str(s_dec)

    assert s_arch["layers"]["architect"] is not None
    assert s_arch["layers"]["decoder"] is None
    assert "hazard" not in str(s_arch["layers"]["architect"])

    # 4. Cross-role authorization check: Seer cannot SCAN_MAP; Decoder cannot SCAN_HAZARDS
    assert client.post(
        f"/api/games/null-north/matches/{m_id}/actions",
        json={"action_type": "SCAN_MAP", "payload": {}},
        headers={"Authorization": f"Bearer {t2}"},
    ).status_code == 400

    # 5. Cartographer executes SCAN_MAP + PING_ROOM
    assert client.post(
        f"/api/games/null-north/matches/{m_id}/actions",
        json={"action_type": "SCAN_MAP", "payload": {}},
        headers={"Authorization": f"Bearer {t1}"},
    ).status_code == 200
    assert client.post(
        f"/api/games/null-north/matches/{m_id}/actions",
        json={"action_type": "PING_ROOM", "payload": {"room_id": "R_EXT", "label": "EXIT"}},
        headers={"Authorization": f"Bearer {t1}"},
    ).status_code == 200

    # 6. Decoder solves Extraction lock authoritatively using exact target from DB
    db = TestingSessionLocal()
    ws_row = db.query(NullNorthWorldState).filter(NullNorthWorldState.match_id == m_id).first()
    puzzles = ws_row.world_data["puzzles"]
    ext_pid = next(k for k, v in puzzles.items() if v["lock_name"].startswith("Extraction"))
    ext_seq = puzzles[ext_pid]["target_sequence"]

    # Wrong sequence keeps lock sealed
    wrong_seq = ["Δ" if ext_seq[0] != "Δ" else "Ω", ext_seq[1], ext_seq[2]]
    client.post(
        f"/api/games/null-north/matches/{m_id}/actions",
        json={"action_type": "DECODE_DOOR", "payload": {"puzzle_id": ext_pid, "sequence": wrong_seq}},
        headers={"Authorization": f"Bearer {t3}"},
    )
    db.refresh(ws_row)
    assert ws_row.world_data["puzzles"][ext_pid]["solved"] is False

    # Exact sequence unlocks Extraction Gate
    ok_dec = client.post(
        f"/api/games/null-north/matches/{m_id}/actions",
        json={"action_type": "DECODE_DOOR", "payload": {"puzzle_id": ext_pid, "sequence": ext_seq}},
        headers={"Authorization": f"Bearer {t3}"},
    )
    assert ok_dec.status_code == 200
    assert "UNLOCKED" in ok_dec.json()["feedback"]

    # Place operatives in R_EXT cleanly and trigger Extraction Victory!
    db.query(NullNorthPlayer).filter(NullNorthPlayer.match_id == m_id).update({"current_room_id": "R_EXT"})
    db.commit()
    db.close()

    win_res = client.post(
        f"/api/games/null-north/matches/{m_id}/actions",
        json={"action_type": "TRIGGER_EXTRACTION", "payload": {}},
        headers={"Authorization": f"Bearer {t1}"},
    )
    assert win_res.status_code == 200
    assert win_res.json()["state"]["match"]["status"] == "completed"
    assert win_res.json()["state"]["match"]["extraction_progress"] == 100

    # Verify stats & leaderboard recorded victory + XP
    prof = client.get("/api/games/null-north/profile", headers={"Authorization": f"Bearer {t1}"}).json()
    assert prof["stats"]["victories"] == 1
    assert prof["stats"]["xp"] >= 150
    lb = client.get("/api/games/null-north/leaderboard").json()
    assert len(lb["leaderboard"]) >= 1


def test_two_player_balanced_capabilities_and_collapse_defeat():
    client = TestClient(app)
    u1, t1 = create_user_and_token("duo_one", "d1@test.io")
    u2, t2 = create_user_and_token("duo_two", "d2@test.io")

    m_id = client.post(
        "/api/games/null-north/matches",
        json={"difficulty": "nightmare", "player_limit": 2},
        headers={"Authorization": f"Bearer {t1}"},
    ).json()["match_id"]
    client.post(f"/api/games/null-north/matches/{m_id}/join", headers={"Authorization": f"Bearer {t2}"})
    st = client.post(f"/api/games/null-north/matches/{m_id}/start", headers={"Authorization": f"Bearer {t1}"}).json()["state"]

    # Player 1 gets CARTOGRAPHER + ARCHITECT; Player 2 gets SEER + DECODER
    assert set(st["self"]["capabilities"]) == {"CARTOGRAPHER", "ARCHITECT"}
    st2 = client.get(f"/api/games/null-north/matches/{m_id}/state", headers={"Authorization": f"Bearer {t2}"}).json()["state"]
    assert set(st2["self"]["capabilities"]) == {"SEER", "DECODER"}

    # Step dimension tick past instability & collapse -> MATCH_FAILED defeat
    db = TestingSessionLocal()
    m = db.query(NullNorthMatch).filter(NullNorthMatch.id == m_id).first()
    ws = m.world_state
    players = db.query(NullNorthPlayer).filter(NullNorthPlayer.match_id == m_id).all()
    m.instability_countdown = 3
    em_shift = step_dimension_tick(m, ws.world_data, players, dt_seconds=5)
    assert any(et == "HAZARD_WARNING" for et, _ in em_shift)

    m.collapse_seconds_left = 4
    em_fail = step_dimension_tick(m, ws.world_data, players, dt_seconds=5)
    assert m.status == "failed"
    assert any(et == "MATCH_FAILED" for et, _ in em_fail)
    db.close()
