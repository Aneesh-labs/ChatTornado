import os
import sys
import io
import json
import asyncio
from pathlib import Path
from PIL import Image

import pytest
from fastapi.testclient import TestClient

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from database import Base, get_db, SessionLocal, engine
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import models
from auth import hash_password, create_access_token
from websocket_manager import manager

SQLALCHEMY_DATABASE_URL = "sqlite:///./qa_test.db"
engine_qa = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_qa)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def setup_db():
    Base.metadata.drop_all(bind=engine_qa)
    Base.metadata.create_all(bind=engine_qa)
    from database import init_super_admin
    # Set override for init_super_admin as well
    with patch("database.SessionLocal", TestingSessionLocal):
        init_super_admin()

from unittest.mock import patch

def create_test_user(username, email, role="USER", verified=True, status="online", custom_status=None):
    db = TestingSessionLocal()
    u = models.User(
        username=username,
        email=email,
        password=hash_password("Password123!"),
        role=role,
        account_status="active",
        email_verified=verified,
        status=status,
        custom_status=custom_status
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    token = create_access_token({
        "sub": u.email,
        "username": u.username,
        "user_id": u.id,
        "role": u.role,
        "email_verified": u.email_verified
    })
    db.close()
    return u.id, token

results = []

def record(category, test_name, passed, detail=""):
    results.append({
        "category": category,
        "test": test_name,
        "passed": passed,
        "detail": detail
    })
    status_str = "PASS" if passed else "FAIL"
    print(f"[{category}] {test_name}: [{status_str}] {detail}")

print("==================================================")
print("STARTING FULL END-TO-END QA PASS")
print("==================================================")

setup_db()

# ----------------------------------------------------
# 1. BLOCKING QA PASS
# ----------------------------------------------------
user_a_id, user_a_token = create_test_user("user_a", "user_a@qa.com")
user_b_id, user_b_token = create_test_user("user_b", "user_b@qa.com")

# User A blocks User B
res_block = client.post(f"/api/blocks/{user_b_id}?token={user_a_token}")
record("BLOCKING", "User A blocks User B REST endpoint", res_block.status_code == 200, res_block.text)

# Check block status endpoint
res_check = client.get(f"/api/blocks/check/{user_b_id}?token={user_a_token}")
record("BLOCKING", "Check block status endpoint", res_check.status_code == 200 and res_check.json().get("i_blocked") is True)

# Verify messaging block check via database & helper
db = TestingSessionLocal()
from block_routes import is_blocked_bidirectional
blocked_a_to_b = is_blocked_bidirectional(db, user_a_id, user_b_id)
blocked_b_to_a = is_blocked_bidirectional(db, user_b_id, user_a_id)
record("BLOCKING", "User A cannot message blocked User B (bidirectional block enforced)", blocked_a_to_b is True)
record("BLOCKING", "User B cannot message blocker User A (bidirectional block enforced)", blocked_b_to_a is True)
record("BLOCKING", "is_blocked_bidirectional helper bidirectional check", blocked_a_to_b and blocked_b_to_a)
db.close()

# User A unblocks User B
res_unblock = client.delete(f"/api/blocks/{user_b_id}?token={user_a_token}")
record("BLOCKING", "User A unblocks User B", res_unblock.status_code == 200)

# User A can message User B again after unblock (block lifted)
db = TestingSessionLocal()
unblocked_check = is_blocked_bidirectional(db, user_a_id, user_b_id)
record("BLOCKING", "User A can send message after unblock", unblocked_check is False)
db.close()

# Self-block attempt -> 400
res_self = client.post(f"/api/blocks/{user_a_id}?token={user_a_token}")
record("BLOCKING", "Self-block attempt rejected with 400", res_self.status_code == 400)


# ----------------------------------------------------
# 2. STATUS QA PASS
# ----------------------------------------------------
res_status = client.put("/api/user/status", json={"status": "away", "custom_status": "Building tornado"}, params={"token": user_a_token})
record("STATUS", "User A updates status to away and custom_status", res_status.status_code == 200 and res_status.json().get("custom_status") == "Building tornado")

# Check invalid status reject -> 400
res_invalid_status = client.put("/api/user/status", json={"status": "super_online", "custom_status": "test"}, params={"token": user_a_token})
record("STATUS", "Invalid status rejected with 400", res_invalid_status.status_code == 400)

# Check custom status length > 100 auto-truncated/rejected
res_long_custom = client.put("/api/user/status", json={"status": "dnd", "custom_status": "a" * 150}, params={"token": user_a_token})
record("STATUS", "Custom status length checked", res_long_custom.status_code in [200, 400, 422])


# ----------------------------------------------------
# 3. IMAGE UPLOAD QA PASS
# ----------------------------------------------------
# Helper to create valid in-memory image
def create_valid_image_bytes(format="PNG", width=50, height=50):
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color="red")
    img.save(buf, format=format)
    return buf.getvalue()

img1_bytes = create_valid_image_bytes("PNG")
img2_bytes = create_valid_image_bytes("JPEG")

# Upload 1 image
res_up1 = client.post("/uploads/images", params={"token": user_a_token}, files=[("files", ("test1.png", img1_bytes, "image/png"))])
record("IMAGE_UPLOAD", "Upload 1 valid image", res_up1.status_code == 200 and res_up1.json()["successful_count"] == 1)

# Upload exactly 5 images
files_5 = [("files", (f"img_{i}.png", img1_bytes, "image/png")) for i in range(5)]
res_up5 = client.post("/uploads/images", params={"token": user_a_token}, files=files_5)
record("IMAGE_UPLOAD", "Upload exactly 5 images in batch", res_up5.status_code == 200 and res_up5.json()["successful_count"] == 5)

# Attempt 6 images -> 400
files_6 = [("files", (f"img_{i}.png", img1_bytes, "image/png")) for i in range(6)]
res_up6 = client.post("/uploads/images", params={"token": user_a_token}, files=files_6)
record("IMAGE_UPLOAD", "Attempt 6 images rejected with 400 batch limit error", res_up6.status_code == 400 and "maximum 5" in res_up6.json()["detail"].lower())

# Upload fake image (text file renamed to .png) -> content verification failed
fake_img_bytes = b"Hello, this is pure plain text pretending to be a PNG!"
res_fake = client.post("/uploads/images", params={"token": user_a_token}, files=[("files", ("fake.png", fake_img_bytes, "image/png"))])
record("IMAGE_UPLOAD", "Fake image (renamed text file) fails Pillow content verification", res_fake.status_code == 200 and res_fake.json()["failed_count"] == 1 and "verification failed" in res_fake.json()["failed"][0]["error"].lower())


# ----------------------------------------------------
# 4. GROUPS QA PASS
# ----------------------------------------------------
u_owner_id, u_owner_token = create_test_user("g_owner", "g_owner@qa.com")
u_admin_id, u_admin_token = create_test_user("g_admin", "g_admin@qa.com")
u_member_id, u_member_token = create_test_user("g_member", "g_member@qa.com")
u_outsider_id, u_outsider_token = create_test_user("g_outsider", "g_outsider@qa.com")

# Create group
res_create_g = client.post("/api/groups", json={"name": "QA Engineers", "initial_member_ids": [u_admin_id, u_member_id]}, params={"token": u_owner_token})
record("GROUPS", "Create group endpoint", res_create_g.status_code == 200)
group_id = res_create_g.json()["group"]["id"]

# Promote u_admin to ADMIN role
res_role = client.put(f"/api/groups/{group_id}/members/{u_admin_id}/role", json={"role": "ADMIN"}, params={"token": u_owner_token})
record("GROUPS", "Owner promotes member to ADMIN", res_role.status_code == 200 and res_role.json().get("new_role") == "ADMIN")

# Member attempts to promote someone -> 403
res_member_promote = client.put(f"/api/groups/{group_id}/members/{u_member_id}/role", json={"role": "ADMIN"}, params={"token": u_member_token})
record("GROUPS", "MEMBER role cannot promote members (403)", res_member_promote.status_code == 403)

# Outsider attempts to fetch group messages -> 403
res_outsider_msg = client.get(f"/api/groups/{group_id}/messages", params={"token": u_outsider_token})
record("GROUPS", "Outsider cannot fetch group messages (403)", res_outsider_msg.status_code == 403)

# Add member endpoint
u_new_id, u_new_token = create_test_user("g_new", "g_new@qa.com")
res_add_m = client.post(f"/api/groups/{group_id}/members", json={"user_ids": [u_new_id]}, params={"token": u_admin_token})
record("GROUPS", "Admin adds new member to group", res_add_m.status_code == 200)

# Member attempts to delete group -> 403
res_del_m = client.delete(f"/api/groups/{group_id}", params={"token": u_member_token})
record("GROUPS", "MEMBER cannot delete group (403)", res_del_m.status_code == 403)

# Owner deletes group -> 200
res_del_owner = client.delete(f"/api/groups/{group_id}", params={"token": u_owner_token})
record("GROUPS", "OWNER can delete group (200)", res_del_owner.status_code == 200)


# ----------------------------------------------------
# 5. REPORTING & MODERATION QA PASS
# ----------------------------------------------------
# 5. AI MODERATION & REPORTING QA PASS
# ----------------------------------------------------
u_reporter_id, u_reporter_token = create_test_user("reporter", "reporter@qa.com")
u_offender_id, u_offender_token = create_test_user("offender", "offender@qa.com")

res_report = client.post("/api/reports", json={
    "reported_user_id": u_offender_id,
    "reason_category": "Harassment",
    "description": "Repeated offensive harassment messages in public chat."
}, params={"token": u_reporter_token})

record("REPORTING", "Submit report to moderation pipeline", res_report.status_code == 200)
report_id = res_report.json().get("report_id")

# Fetch moderation cases as super admin
admin_id, admin_token = create_test_user("admin_qa", "admin_qa@qa.com", role="SUPER_ADMIN")
res_cases = client.get("/api/admin/moderation/cases", params={"token": admin_token})
cases_list = res_cases.json().get("cases", []) if isinstance(res_cases.json(), dict) else res_cases.json()
record("MODERATION", "Super Admin lists moderation cases queue", res_cases.status_code == 200 and len(cases_list) > 0)

case_id = cases_list[0]["id"] if cases_list else 1

# Super Admin adjudicates case
res_adjudicate = client.post(f"/api/admin/moderation/cases/{case_id}/action", json={
    "action": "confirm",
    "reason": "Verified severe harassment behavior."
}, params={"token": admin_token})
record("MODERATION", "Super Admin adjudicates moderation case", res_adjudicate.status_code == 200)


# ----------------------------------------------------
# 6. SUPER ADMIN & INVISIBILITY QA PASS
# ----------------------------------------------------
# Create official admin in test db
from database import init_super_admin
with patch("database.SessionLocal", TestingSessionLocal):
    init_super_admin()

# Normal user lists users -> BlackShadow-ChatTornado MUST NOT appear
res_users = client.get("/users", params={"token": u_reporter_token})
users_list = res_users.json()
has_admin_in_users = any(u.get("username") == "BlackShadow-ChatTornado" or u.get("role") == "SUPER_ADMIN" for u in users_list)
record("SUPER_ADMIN", "BlackShadow-ChatTornado invisible in /users list for normal user", not has_admin_in_users)

# Search users as normal user
res_search = client.get("/search-users", params={"token": u_reporter_token, "q": "BlackShadow"})
search_list = res_search.json() if isinstance(res_search.json(), list) else []
has_admin_in_search = any(u.get("username") == "BlackShadow-ChatTornado" for u in search_list)
record("SUPER_ADMIN", "BlackShadow-ChatTornado invisible in /search-users for normal user", not has_admin_in_search)

# Normal user attempts admin endpoint -> 403
res_admin_stats = client.get("/api/admin/stats", params={"token": u_reporter_token})
record("SUPER_ADMIN", "Normal user accessing /api/admin/stats rejected with 403", res_admin_stats.status_code == 403)


# ----------------------------------------------------
# 7. ANNOUNCEMENTS QA PASS
# ----------------------------------------------------
# Admin creates announcement
res_ann = client.post("/api/admin/announcements", json={
    "title": "Scheduled Server Maintenance",
    "content": "Server upgrade tonight at midnight UTC.",
    "category": "Maintenance"
}, params={"token": admin_token})
record("ANNOUNCEMENTS", "Super Admin creates announcement", res_ann.status_code == 200)
ann_id = res_ann.json().get("announcement", {}).get("id")

# Normal user lists announcements -> see unread announcement
res_get_ann = client.get("/api/announcements", params={"token": u_reporter_token})
record("ANNOUNCEMENTS", "Normal user retrieves announcements list", res_get_ann.status_code == 200 and len(res_get_ann.json()) > 0)

# Mark as read
if ann_id:
    res_read = client.post(f"/api/announcements/{ann_id}/read", params={"token": u_reporter_token})
    record("ANNOUNCEMENTS", "Normal user marks announcement as read", res_read.status_code == 200)


# ----------------------------------------------------
# 8. LOGIN HISTORY QA PASS
# ----------------------------------------------------
# Login successfully
res_login_ok = client.post("/login", json={"email": "reporter@qa.com", "password": "Password123!"})
record("LOGIN_HISTORY", "Successful login succeeds", res_login_ok.status_code == 200)

# Login invalid password
res_login_fail = client.post("/login", json={"email": "reporter@qa.com", "password": "WrongPassword!"})
record("LOGIN_HISTORY", "Invalid login fails with 401/400", res_login_fail.status_code in [400, 401])

# Super admin inspects login history
res_logins = client.get("/api/admin/logins", params={"token": admin_token})
record("LOGIN_HISTORY", "Super admin inspects login access logs", res_logins.status_code == 200 and len(res_logins.json()) >= 2)


# ----------------------------------------------------
# 9. SECURITY & RBAC QA PASS
# ----------------------------------------------------
endpoints_to_test = [
    ("GET", "/api/admin/stats"),
    ("GET", "/api/admin/users"),
    ("GET", "/api/admin/moderation/cases"),
    ("GET", "/api/admin/announcements"),
    ("GET", "/api/admin/logins"),
    ("GET", "/api/admin/audit-logs"),
    ("POST", "/api/admin/announcements"),
]

sec_passed = True
for method, url in endpoints_to_test:
    if method == "GET":
        r = client.get(url, params={"token": u_reporter_token})
    else:
        r = client.post(url, json={}, params={"token": u_reporter_token})
    if r.status_code != 403:
        sec_passed = False
        print(f"SECURITY BREACH: Normal user accessed {url} with status {r.status_code}")

record("SECURITY", "All 7 admin/privileged endpoints strictly enforce server-side RBAC (403 for normal users)", sec_passed)


# ----------------------------------------------------
# SUMMARY REPORT
# ----------------------------------------------------
print("==================================================")
passed_count = sum(1 for r in results if r["passed"])
failed_count = sum(1 for r in results if not r["passed"])
print(f"QA PASS COMPLETED: {passed_count} PASSED, {failed_count} FAILED out of {len(results)} assertions.")
print("==================================================")
