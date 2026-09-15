import pytest
import datetime
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine_test = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

Base.metadata.create_all(bind=engine_test)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine_test)
    Base.metadata.create_all(bind=engine_test)
    
def get_user_by_username(username):
    db = TestingSessionLocal()
    user = db.query(models.User).filter_by(username=username).first()
    db.close()
    return user

def create_unverified_user(username="testuser", email="test@example.com"):
    response = client.post(
        "/signup",
        data={"username": username, "email": email, "password": "strongpassword123!"}
    )
    return response

def test_signup_creates_unverified_user():
    response = create_unverified_user()
    assert response.status_code == 200
    user = get_user_by_username("testuser")
    assert user.email_verified is False
    assert user.verification_token_hash is not None

def test_login_returns_email_verified_status():
    create_unverified_user()
    response = client.post("/login", json={"email": "test@example.com", "password": "strongpassword123!"})
    assert response.status_code == 200
    assert response.json()["email_verified"] is False
    
def test_backend_enforces_verification():
    create_unverified_user()
    login_response = client.post("/login", json={"email": "test@example.com", "password": "strongpassword123!"})
    token = login_response.json()["access_token"]
    
    # Attempt to hit protected route
    res = client.get(f"/online-users?token={token}")
    assert res.status_code == 403
    assert "Email not verified" in res.json()["detail"]

def test_token_lifecycle():
    # Unfortunately, signup generates the token and doesn't return it in the response (for security).
    # To test the lifecycle, we'll manually set a known token hash in the DB.
    create_unverified_user()
    db = TestingSessionLocal()
    user = db.query(models.User).filter_by(username="testuser").first()
    
    import hashlib
    raw_token = "mysecrettoken"
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    user.verification_token_hash = token_hash
    user.verification_token_expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    db.commit()
    db.close()
    
    # 1. Random token -> fails
    res_random = client.get("/verify-email?token=invalidtoken")
    assert res_random.status_code == 400
    
    # 2. Valid token -> succeeds
    res_valid = client.get(f"/verify-email?token={raw_token}")
    assert res_valid.status_code == 200
    assert get_user_by_username("testuser").email_verified is True
    
    # 3. Same token twice -> already verified msg or fails
    res_twice = client.get(f"/verify-email?token={raw_token}")
    assert res_twice.status_code == 400
    assert "Invalid verification token" in res_twice.json()["detail"]
    
    # Now backend enforcement should let them through
    login_response = client.post("/login", json={"email": "test@example.com", "password": "strongpassword123!"})
    token = login_response.json()["access_token"]
    res_protected = client.get(f"/online-users?token={token}")
    assert res_protected.status_code == 200

def test_expired_token():
    create_unverified_user()
    db = TestingSessionLocal()
    user = db.query(models.User).filter_by(username="testuser").first()
    import hashlib
    raw_token = "mysecrettoken"
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    user.verification_token_hash = token_hash
    user.verification_token_expires_at = datetime.datetime.utcnow() - datetime.timedelta(hours=1) # Expired
    db.commit()
    db.close()
    
    res = client.get(f"/verify-email?token={raw_token}")
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower()

def test_resend_invalidates_old_and_rate_limit():
    create_unverified_user()
    db = TestingSessionLocal()
    user = db.query(models.User).filter_by(username="testuser").first()
    old_hash = user.verification_token_hash
    db.close()
    
    # Hit resend
    res = client.post("/resend-verification", json={"email": "test@example.com"})
    assert res.status_code == 200
    
    db = TestingSessionLocal()
    user = db.query(models.User).filter_by(username="testuser").first()
    new_hash = user.verification_token_hash
    db.close()
    
    # Hash should change
    assert old_hash != new_hash
    
    # Check rate limit (limit is 3/minute)
    client.post("/resend-verification", json={"email": "test@example.com"})
    client.post("/resend-verification", json={"email": "test@example.com"})
    res_limit = client.post("/resend-verification", json={"email": "test@example.com"})
    # 4th should be 429 Too Many Requests
    assert res_limit.status_code == 429
