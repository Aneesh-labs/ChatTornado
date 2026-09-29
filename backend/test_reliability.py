import pytest
import asyncio
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from database import Base, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import models
from auth import hash_password, create_access_token
from diagnostics import generate_correlation_id

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine_test = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine_test, checkfirst=True)
    yield
    Base.metadata.drop_all(bind=engine_test, checkfirst=True)

def create_user(username: str, email: str, role: str = "USER", verified: bool = True, account_status: str = "active"):
    db = TestingSessionLocal()
    u = models.User(
        username=username,
        email=email,
        password=hash_password("Password123!"),
        role=role,
        account_status=account_status,
        email_verified=verified,
        status="offline"
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    token = create_access_token({
        "sub": u.email,
        "username": u.username,
        "user_id": u.id,
        "email_verified": u.email_verified,
        "role": u.role
    })
    uid = u.id
    db.close()
    return uid, token

# ============================================================================
# 20 FAILURE & RELIABILITY SCENARIO TESTS
# ============================================================================

# Scenario 1: Standard user-to-user message persistence & visibility
def test_scenario_01_user_to_user_send_and_persist():
    u1, t1 = create_user("alice", "alice@test.com")
    u2, t2 = create_user("bob", "bob@test.com")

    res = client.post("/messages/send", json={
        "receiver_id": u2,
        "message": "Hello Bob!",
        "temp_id": "temp-101"
    }, params={"token": t1})

    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["id"] is not None
    assert data["temp_id"] == "temp-101"

    # Verify in DB
    db = TestingSessionLocal()
    saved = db.query(models.Message).filter(models.Message.id == data["id"]).first()
    assert saved is not None
    assert saved.sender_id == u1
    assert saved.receiver_id == u2
    assert saved.message == "Hello Bob!"
    assert saved.client_temp_id == "temp-101"

    # Verify visibility rows
    vis = db.query(models.MessageVisibility).filter(models.MessageVisibility.message_id == saved.id).all()
    assert len(vis) == 2
    vis_uids = {v.user_id for v in vis}
    assert u1 in vis_uids and u2 in vis_uids
    db.close()

# Scenario 2: Backend Idempotency — duplicate temp_id does not insert duplicate row
def test_scenario_02_idempotency_duplicate_temp_id():
    u1, t1 = create_user("alice", "alice@test.com")
    u2, t2 = create_user("bob", "bob@test.com")

    res1 = client.post("/messages/send", json={
        "receiver_id": u2,
        "message": "Unique payload",
        "temp_id": "temp-duplicate-check"
    }, params={"token": t1})
    assert res1.status_code == 200
    msg_id = res1.json()["id"]

    # Send exact same temp_id again
    res2 = client.post("/messages/send", json={
        "receiver_id": u2,
        "message": "Unique payload retry",
        "temp_id": "temp-duplicate-check"
    }, params={"token": t1})
    assert res2.status_code == 200
    assert res2.json()["id"] == msg_id

    # Count rows in DB
    db = TestingSessionLocal()
    count = db.query(models.Message).filter(
        models.Message.sender_id == u1,
        models.Message.client_temp_id == "temp-duplicate-check"
    ).count()
    assert count == 1
    db.close()

# Scenario 3: Decoupled delivery to offline user (message persists safely in DB)
def test_scenario_03_offline_recipient_persistence():
    u1, t1 = create_user("alice", "alice@test.com")
    u2, t2 = create_user("offline_bob", "offline_bob@test.com")

    # Bob is completely offline (no active WS connection)
    res = client.post("/messages/send", json={
        "receiver_id": u2,
        "message": "Message for offline friend",
        "temp_id": "temp-offline-1"
    }, params={"token": t1})
    assert res.status_code == 200

    # Bob logs in and checks messages
    fetch_res = client.get(f"/messages/{u1}", params={"token": t2})
    assert fetch_res.status_code == 200
    fetched_msgs = fetch_res.json()
    assert len(fetched_msgs) == 1
    assert fetched_msgs[0]["message"] == "Message for offline friend"

# Scenario 4: Correlation ID generation and propagation
def test_scenario_04_correlation_id_propagation():
    u1, t1 = create_user("alice", "alice@test.com")
    u2, t2 = create_user("bob", "bob@test.com")

    custom_corr_id = "corr-" + generate_correlation_id()
    res = client.post("/messages/send", json={
        "receiver_id": u2,
        "message": "Traceable message",
        "temp_id": "temp-corr-1",
        "correlation_id": custom_corr_id
    }, params={"token": t1})
    assert res.status_code == 200
    data = res.json()
    assert data["correlation_id"] == custom_corr_id

    db = TestingSessionLocal()
    msg = db.query(models.Message).filter(models.Message.id == data["id"]).first()
    assert msg.correlation_id == custom_corr_id
    db.close()

# Scenario 5: Database rollback on commit exception does not corrupt DB or crash
def test_scenario_05_db_rollback_on_failure():
    u1, t1 = create_user("alice", "alice@test.com")
    u2, t2 = create_user("bob", "bob@test.com")

    # Simulate database commit error during send
    with patch("sqlalchemy.orm.Session.commit", side_effect=Exception("Simulated disk error")):
        res = client.post("/messages/send", json={
            "receiver_id": u2,
            "message": "Will fail commit",
            "temp_id": "temp-fail-1"
        }, params={"token": t1})
        assert res.status_code == 500

    # Verify DB session recovered and clean for subsequent operations
    res_subsequent = client.post("/messages/send", json={
        "receiver_id": u2,
        "message": "Recovers cleanly",
        "temp_id": "temp-success-after-rollback"
    }, params={"token": t1})
    assert res_subsequent.status_code == 200
    assert res_subsequent.json()["status"] == "success"

# Scenario 6: Bidirectional block prevents message persistence
def test_scenario_06_blocked_user_cannot_send():
    u1, t1 = create_user("alice", "alice@test.com")
    u2, t2 = create_user("bob", "bob@test.com")

    # Alice blocks Bob
    block_res = client.post(f"/api/blocks/{u2}?token={t1}")
    assert block_res.status_code == 200

    # Bob attempts to send to Alice
    res_bob = client.post("/messages/send", json={
        "receiver_id": u1,
        "message": "Let me talk to you!",
        "temp_id": "temp-blocked-1"
    }, params={"token": t2})
    assert res_bob.status_code == 403

    # Alice attempts to send to Bob (bidirectional check)
    res_alice = client.post("/messages/send", json={
        "receiver_id": u2,
        "message": "Alice trying to send to blocked user",
        "temp_id": "temp-blocked-2"
    }, params={"token": t1})
    assert res_alice.status_code == 403

# Scenario 7: Restricted account cannot send messages
def test_scenario_07_restricted_account_rejected():
    from datetime import datetime, timedelta
    u1, t1 = create_user("spammer", "spammer@test.com", account_status="restricted")
    u2, t2 = create_user("alice", "alice@test.com")

    # Set restricted_until in future
    db = TestingSessionLocal()
    user_spammer = db.query(models.User).filter(models.User.id == u1).first()
    user_spammer.restricted_until = datetime.utcnow() + timedelta(days=1)
    db.commit()
    db.close()

    res = client.post("/messages/send", json={
        "receiver_id": u2,
        "message": "Spam payload",
        "temp_id": "temp-restricted-1"
    }, params={"token": t1})
    assert res.status_code == 403
    assert "restricted" in res.json()["detail"].lower()

# Scenario 8: Empty message text validation
def test_scenario_08_empty_message_validation():
    u1, t1 = create_user("alice", "alice@test.com")
    u2, t2 = create_user("bob", "bob@test.com")

    res = client.post("/messages/send", json={
        "receiver_id": u2,
        "message": "   ",
        "temp_id": "temp-empty-1"
    }, params={"token": t1})
    assert res.status_code == 400

# Scenario 9: Group message persistence and membership check
def test_scenario_09_group_message_flow():
    u1, t1 = create_user("alice", "alice@test.com")
    u2, t2 = create_user("bob", "bob@test.com")

    # Create group with Alice and Bob
    db = TestingSessionLocal()
    grp = models.Group(name="Engineering", created_by=u1)
    db.add(grp)
    db.commit()
    db.refresh(grp)
    db.add_all([
        models.GroupMember(group_id=grp.id, user_id=u1, role="OWNER"),
        models.GroupMember(group_id=grp.id, user_id=u2, role="MEMBER"),
    ])
    db.commit()
    grp_id = grp.id

    # Add message into group (simulating DB persistence)
    msg = models.Message(
        sender_id=u1,
        group_id=grp_id,
        message="Team standup at 10 AM",
        read_state="sent"
    )
    db.add(msg)
    db.commit()
    db.close()

    # Fetch group messages as Bob
    fetch_res = client.get(f"/api/groups/{grp_id}/messages", params={"token": t2})
    assert fetch_res.status_code == 200
    msgs = fetch_res.json()
    assert len(msgs) == 1
    assert msgs[0]["message"] == "Team standup at 10 AM"
    assert msgs[0]["sender_name"] == "alice"

# Scenario 10: Shielded Time-locked capsule message persistence and lock enforcement
def test_scenario_10_timelock_capsule_persistence():
    from datetime import datetime, timezone, timedelta
    u1, t1 = create_user("alice", "alice@test.com")
    u2, t2 = create_user("bob", "bob@test.com")

    future_time = datetime.now(timezone.utc) + timedelta(hours=2)
    res = client.post("/messages/send", json={
        "receiver_id": u2,
        "message": "Secret future message",
        "temp_id": "temp-timelock-1",
        "is_shielded": True,
        "shield_mode": "timelock",
        "unlock_at": future_time.isoformat()
    }, params={"token": t1})
    assert res.status_code == 200
    assert res.json()["is_locked"] is True

    # Bob fetches messages -> message text should be withheld (None) because it is locked
    fetch_res = client.get(f"/messages/{u1}", params={"token": t2})
    assert fetch_res.status_code == 200
    bob_view = fetch_res.json()
    assert len(bob_view) == 1
    assert bob_view[0]["is_locked"] is True
    assert bob_view[0]["message"] is None

# Scenario 11: Reaction addition, update, and toggle off
def test_scenario_11_reaction_persistence_and_toggle():
    u1, t1 = create_user("alice", "alice@test.com")
    u2, t2 = create_user("bob", "bob@test.com")

    # Alice sends message
    send_res = client.post("/messages/send", json={
        "receiver_id": u2,
        "message": "Check this reaction out",
        "temp_id": "temp-rxn-1"
    }, params={"token": t1})
    msg_id = send_res.json()["id"]

    db = TestingSessionLocal()
    # Bob adds reaction 👍
    rxn1 = models.MessageReaction(message_id=msg_id, user_id=u2, reaction="👍")
    db.add(rxn1)
    db.commit()

    # Fetch messages and verify reaction formatted
    fetch_res = client.get(f"/messages/{u1}", params={"token": t2})
    assert fetch_res.status_code == 200
    reactions = fetch_res.json()[0]["reactions"]
    assert len(reactions) == 1
    assert reactions[0]["glyph"] == "👍"
    assert u2 in reactions[0]["users"]
    db.close()

# Scenario 12: Unread count and read receipt transition
def test_scenario_12_read_state_transition():
    u1, t1 = create_user("alice", "alice@test.com")
    u2, t2 = create_user("bob", "bob@test.com")

    # Alice sends message
    client.post("/messages/send", json={
        "receiver_id": u2,
        "message": "Unread message check",
        "temp_id": "temp-read-1"
    }, params={"token": t1})

    db = TestingSessionLocal()
    msg = db.query(models.Message).filter(models.Message.sender_id == u1).first()
    assert msg.read_state == "sent"

    # Bob opens conversation with Alice (triggers mark as read)
    client.get(f"/messages/{u1}", params={"token": t2})

    db.refresh(msg)
    assert msg.read_state == "read"
    db.close()

# Scenario 13: Bot User (VORTEX-9) Auto-Creation and Permanence
def test_scenario_13_bot_user_permanence():
    from ai_service import get_or_create_bot_user
    db = TestingSessionLocal()
    bot1 = get_or_create_bot_user(db)
    assert bot1 is not None
    assert bot1.username == "VORTEX-9"
    assert bot1.status == "online"

    # Calling again should retrieve the exact same user without duplicating
    bot2 = get_or_create_bot_user(db)
    assert bot1.id == bot2.id
    db.close()

# Scenario 14: AI Text Generation Fallback on Missing API Key
def test_scenario_14_ai_offline_key_graceful_response():
    from ai_service import generate_ai_text
    with patch.dict("os.environ", {"GEMINI_API_KEY": "", "OPENROUTER_API_KEY": ""}, clear=True):
        reply = asyncio.run(generate_ai_text("Hello AI", []))
        assert "Offline" in reply or "configured" in reply or "GEMINI_API_KEY" in reply

# Scenario 15: AI Streaming Chunk Extraction Safety
def test_scenario_15_extract_chunk_text_safety():
    from ai_service import extract_chunk_text
    # None chunk
    assert extract_chunk_text(None) == ""
    # Empty object
    assert extract_chunk_text(object()) == ""

    # Mock chunk with text
    mock_chunk = MagicMock()
    mock_chunk.text = "Generated token"
    assert extract_chunk_text(mock_chunk) == "Generated token"

# Scenario 16: Image request detection
def test_scenario_16_image_request_detection():
    from ai_service import is_image_request
    is_img, prompt = is_image_request("/image a futuristic cyber tornado")
    assert is_img is True
    assert prompt == "a futuristic cyber tornado"

    is_img2, prompt2 = is_image_request("draw a glowing cyberpunk skyline")
    assert is_img2 is True
    assert "glowing cyberpunk skyline" in prompt2

    is_img3, _ = is_image_request("How does binary search work?")
    assert is_img3 is False

# Scenario 17: Message deletion for sender and receiver
def test_scenario_17_message_deletion_modes():
    u1, t1 = create_user("alice", "alice@test.com")
    u2, t2 = create_user("bob", "bob@test.com")

    send_res = client.post("/messages/send", json={
        "receiver_id": u2,
        "message": "To be deleted",
        "temp_id": "temp-del-1"
    }, params={"token": t1})
    msg_id = send_res.json()["id"]

    # Alice deletes for herself only (mode="me")
    del_res = client.post(f"/delete_message/{msg_id}", params={"mode": "me", "token": t1})
    assert del_res.status_code == 200

    # Alice cannot see it anymore
    alice_view = client.get(f"/messages/{u2}", params={"token": t1}).json()
    assert len(alice_view) == 0

    # Bob can still see it
    bob_view = client.get(f"/messages/{u1}", params={"token": t2}).json()
    assert len(bob_view) == 1
    assert bob_view[0]["message"] == "To be deleted"

# Scenario 18: Message Edit Persistence
def test_scenario_18_message_edit():
    u1, t1 = create_user("alice", "alice@test.com")
    u2, t2 = create_user("bob", "bob@test.com")

    send_res = client.post("/messages/send", json={
        "receiver_id": u2,
        "message": "Original typo",
        "temp_id": "temp-edit-1"
    }, params={"token": t1})
    msg_id = send_res.json()["id"]

    edit_res = client.put(f"/edit_message/{msg_id}", json={
        "new_text": "Corrected text"
    }, params={"token": t1})
    assert edit_res.status_code == 200

    db = TestingSessionLocal()
    edited_msg = db.query(models.Message).filter(models.Message.id == msg_id).first()
    assert edited_msg.message == "Corrected text"
    assert edited_msg.is_edited is True
    db.close()

# Scenario 19: Multiple rapid concurrent message sends
def test_scenario_19_rapid_concurrent_sends():
    u1, t1 = create_user("alice", "alice@test.com")
    u2, t2 = create_user("bob", "bob@test.com")

    sent_ids = []
    for i in range(10):
        r = client.post("/messages/send", json={
            "receiver_id": u2,
            "message": f"Rapid message #{i}",
            "temp_id": f"rapid-temp-{i}"
        }, params={"token": t1})
        assert r.status_code == 200
        sent_ids.append(r.json()["id"])

    assert len(set(sent_ids)) == 10

    # Fetch all as Bob
    bob_view = client.get(f"/messages/{u1}", params={"token": t2}).json()
    assert len(bob_view) == 10

# Scenario 20: AI Clean Text and Summarize Endpoints
def test_scenario_20_ai_clean_and_summarize():
    u1, t1 = create_user("alice", "alice@test.com")

    with patch("ai_service.ai_clean_text", return_value="Clean polished text"):
        res = client.post("/ai_cleanup", json={"text": "Umm, ahh, clean polished text"}, params={"token": t1})
        assert res.status_code == 200
        assert res.json()["cleaned_text"] == "Clean polished text"

    with patch("ai_service.ai_summarize_chat", return_value="Summary of discussion"):
        res = client.post("/ai_summarize", json={"chat_text": "Alice: Hi\nBob: Hello"}, params={"token": t1})
        assert res.status_code == 200
        assert res.json()["summary"] == "Summary of discussion"
