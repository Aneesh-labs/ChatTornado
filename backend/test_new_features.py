import pytest
import io
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app
from database import Base, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from auth import hash_password, create_access_token

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_new.db"
engine_test = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

Base.metadata.create_all(bind=engine_test)

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
    Base.metadata.drop_all(bind=engine_test)
    Base.metadata.create_all(bind=engine_test)

def create_user(username: str, email: str, role: str = "USER", verified: bool = True):
    db = TestingSessionLocal()
    u = models.User(
        username=username,
        email=email,
        password=hash_password("Password123!"),
        role=role,
        account_status="active",
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

# ── 1. User Blocking Tests ──────────────────────────────────────────────────

def test_user_blocking_and_unblocking():
    u1_id, u1_token = create_user("alice", "alice@example.com")
    u2_id, u2_token = create_user("bob", "bob@example.com")

    # Cannot block self
    res = client.post(f"/api/blocks/{u1_id}?token={u1_token}")
    assert res.status_code == 400
    assert "cannot block yourself" in res.json()["detail"].lower()

    # Alice blocks Bob
    res = client.post(f"/api/blocks/{u2_id}?token={u1_token}")
    assert res.status_code == 200
    assert res.json()["status"] == "success"

    # Check block status
    res = client.get(f"/api/blocks/check/{u2_id}?token={u1_token}")
    assert res.status_code == 200
    assert res.json()["is_blocked"] is True
    assert res.json()["i_blocked"] is True

    # Bob's perspective
    res = client.get(f"/api/blocks/check/{u1_id}?token={u2_token}")
    assert res.status_code == 200
    assert res.json()["is_blocked"] is True
    assert res.json()["they_blocked"] is True

    # List blocked users
    res = client.get(f"/api/blocks?token={u1_token}")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["id"] == u2_id

    # Unblock
    res = client.delete(f"/api/blocks/{u2_id}?token={u1_token}")
    assert res.status_code == 200

    # Verify unblocked
    res = client.get(f"/api/blocks/check/{u2_id}?token={u1_token}")
    assert res.json()["is_blocked"] is False

# ── 2. User Status Tests ────────────────────────────────────────────────────

def test_user_status_update_and_presence_privacy():
    u1_id, u1_token = create_user("user1", "user1@example.com")
    u2_id, u2_token = create_user("user2", "user2@example.com")

    # Update status to Away with custom status
    res = client.put(
        f"/api/user/status?token={u1_token}",
        json={"status": "away", "custom_status": "Coding Tornado"}
    )
    assert res.status_code == 200
    assert res.json()["user_status"] == "away"
    assert res.json()["custom_status"] == "Coding Tornado"

    # User 2 reads User 1 status
    res = client.get(f"/api/user/status/{u1_id}?token={u2_token}")
    assert res.status_code == 200
    assert res.json()["custom_status"] == "Coding Tornado"

    # User 1 blocks User 2
    client.post(f"/api/blocks/{u2_id}?token={u1_token}")

    # Now User 2 cannot see User 1's real status (hidden for privacy)
    res = client.get(f"/api/user/status/{u1_id}?token={u2_token}")
    assert res.status_code == 200
    assert res.json()["status"] == "offline"
    assert res.json()["custom_status"] is None

# ── 3. Group Creation & Permission RBAC Tests ───────────────────────────────

def test_groups_management_and_rbac():
    owner_id, owner_token = create_user("groupowner", "owner@example.com")
    member_id, member_token = create_user("groupmember", "member@example.com")
    other_id, other_token = create_user("groupother", "other@example.com")

    # Create Group
    res = client.post(
        f"/api/groups?token={owner_token}",
        json={"name": "Alpha Team", "initial_member_ids": [member_id]}
    )
    assert res.status_code == 200
    group_id = res.json()["group"]["id"]
    assert res.json()["group"]["name"] == "Alpha Team"

    # List groups for member
    res = client.get(f"/api/groups?token={member_token}")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["id"] == group_id
    assert res.json()[0]["my_role"] == "MEMBER"

    # Member cannot add other member (only OWNER/ADMIN can)
    res = client.post(
        f"/api/groups/{group_id}/members?token={member_token}",
        json={"user_ids": [other_id]}
    )
    assert res.status_code == 403

    # Owner promotes member to ADMIN
    res = client.put(
        f"/api/groups/{group_id}/members/{member_id}/role?token={owner_token}",
        json={"role": "ADMIN"}
    )
    assert res.status_code == 200
    assert res.json()["new_role"] == "ADMIN"

    # Now Admin can add other member
    res = client.post(
        f"/api/groups/{group_id}/members?token={member_token}",
        json={"user_ids": [other_id]}
    )
    assert res.status_code == 200
    assert res.json()["added_count"] == 1

    # Member can leave group
    res = client.delete(f"/api/groups/{group_id}/members/{other_id}?token={other_token}")
    assert res.status_code == 200
    assert "left" in res.json()["message"].lower()

# ── 4. Image Upload Limit Tests ─────────────────────────────────────────────

def test_image_upload_batch_limit():
    u_id, u_token = create_user("uploader", "uploader@example.com")

    # Test exceeding 5 images in batch
    dummy_files = [
        ("files", (f"img_{i}.jpg", io.BytesIO(b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xDB"), "image/jpeg"))
        for i in range(6)
    ]
    res = client.post(f"/uploads/images?token={u_token}", files=dummy_files)
    assert res.status_code == 400
    assert "maximum 5 images" in res.json()["detail"].lower()

# ── 5. User Report & Moderation Tests ───────────────────────────────────────

@pytest.mark.anyio
async def test_report_submission_and_case_creation():
    u1_id, u1_token = create_user("reporter", "reporter@example.com")
    u2_id, u2_token = create_user("spammer", "spammer@example.com")

    # Submit report
    res = client.post(
        f"/api/reports?token={u1_token}",
        json={
            "reported_user_id": u2_id,
            "reason_category": "Spam",
            "description": "Sending unwanted automated messages continuously."
        }
    )
    assert res.status_code == 200
    assert res.json()["status"] == "success"

    db = TestingSessionLocal()
    report = db.query(models.Report).filter_by(reported_user_id=u2_id).first()
    assert report is not None
    assert report.reason_category == "Spam"

    case = db.query(models.ModerationCase).filter_by(report_id=report.id).first()
    assert case is not None
    assert case.user_id == u2_id
    db.close()

# ── 6. Super Admin Security & Invisibility Tests ────────────────────────────

def test_super_admin_rbac_and_invisibility():
    admin_id, admin_token = create_user("BlackShadow-ChatTornado", "admin@chattornado.internal", role="SUPER_ADMIN")
    user_id, user_token = create_user("regularuser", "reg@example.com", role="USER")

    # 1. Regular user trying to access admin stats -> 403 Forbidden
    res = client.get(f"/api/admin/stats?token={user_token}")
    assert res.status_code == 403

    # 2. Super Admin accessing stats -> 200 OK
    res = client.get(f"/api/admin/stats?token={admin_token}")
    assert res.status_code == 200
    assert "users" in res.json()
    assert "messaging" in res.json()

    # 3. Regular user discovery (/users) MUST NOT include BlackShadow-ChatTornado
    res = client.get(f"/users?token={user_token}")
    assert res.status_code == 200
    discovered_usernames = [u["username"] for u in res.json()]
    assert "BlackShadow-ChatTornado" not in discovered_usernames

    # 4. Search users MUST NOT return BlackShadow-ChatTornado to regular user
    res = client.get(f"/search-users?q=BlackShadow&token={user_token}")
    assert res.status_code == 200
    assert len(res.json()) == 0

    # 5. Direct /user/{id} lookup of admin by regular user -> 404
    res = client.get(f"/user/{admin_id}?token={user_token}")
    assert res.status_code == 404

# ── 7. Announcement Tests ───────────────────────────────────────────────────

def test_announcements_broadcast_and_reads():
    admin_id, admin_token = create_user("BlackShadow-ChatTornado", "admin@chattornado.internal", role="SUPER_ADMIN")
    user_id, user_token = create_user("ann_user", "ann_user@example.com")

    # Admin creates announcement
    res = client.post(
        f"/api/admin/announcements?token={admin_token}",
        json={
            "title": "Scheduled Maintenance Notice",
            "content": "Database upgrade tonight at 02:00 UTC.",
            "category": "Maintenance",
            "expires_in_hours": 24
        }
    )
    assert res.status_code == 200
    ann_id = res.json()["announcement"]["id"]

    # User fetches announcements
    res = client.get(f"/api/announcements?token={user_token}")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["id"] == ann_id
    assert res.json()[0]["is_read"] is False

    # User marks as read
    res = client.post(f"/api/announcements/{ann_id}/read?token={user_token}")
    assert res.status_code == 200

    # Fetch again -> is_read is True
    res = client.get(f"/api/announcements?token={user_token}")
    assert res.status_code == 200
    assert res.json()[0]["is_read"] is True

# ── 8. Login History Tracking ───────────────────────────────────────────────

def test_login_history_tracked_on_login():
    u_id, _ = create_user("historyuser", "history@example.com")

    # Login
    res = client.post(
        "/login",
        json={"email": "history@example.com", "password": "Password123!"}
    )
    assert res.status_code == 200

    db = TestingSessionLocal()
    history = db.query(models.LoginHistory).filter_by(user_id=u_id).first()
    assert history is not None
    assert history.status == "success"
    db.close()
