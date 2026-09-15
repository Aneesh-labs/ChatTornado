import pytest
import datetime
from unittest.mock import patch, MagicMock
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

@pytest.fixture()
def mock_email_service():
    """Patch send_verification_email so auth route tests never send real emails."""
    with patch("email_service.send_verification_email", return_value=None) as mock:
        yield mock

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

def test_signup_creates_unverified_user(mock_email_service):
    response = create_unverified_user()
    assert response.status_code == 200
    user = get_user_by_username("testuser")
    assert user.email_verified is False
    assert user.verification_token_hash is not None

def test_login_returns_email_verified_status(mock_email_service):
    create_unverified_user()
    response = client.post("/login", json={"email": "test@example.com", "password": "strongpassword123!"})
    assert response.status_code == 200
    assert response.json()["email_verified"] is False

def test_backend_enforces_verification(mock_email_service):
    create_unverified_user()
    login_response = client.post("/login", json={"email": "test@example.com", "password": "strongpassword123!"})
    token = login_response.json()["access_token"]

    # Attempt to hit protected route
    res = client.get(f"/online-users?token={token}")
    assert res.status_code == 403
    assert "Email not verified" in res.json()["detail"]

def test_token_lifecycle(mock_email_service):
    # signup generates the token but doesn't return it (security).
    # Manually set a known token hash in the DB.
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

    # 3. Same token twice -> returns already verified success gracefully
    res_twice = client.get(f"/verify-email?token={raw_token}")
    assert res_twice.status_code == 200
    assert "already verified" in res_twice.json()["message"].lower()

    # Now backend enforcement should let them through
    login_response = client.post("/login", json={"email": "test@example.com", "password": "strongpassword123!"})
    token = login_response.json()["access_token"]
    res_protected = client.get(f"/online-users?token={token}")
    assert res_protected.status_code == 200

def test_expired_token(mock_email_service):
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

def test_resend_invalidates_old_and_rate_limit(mock_email_service):
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


# ---------------------------------------------------------------------------
# email_service unit tests
# ---------------------------------------------------------------------------

class TestEmailService:
    """Unit tests for email_service.send_verification_email — no real emails sent."""

    def _call(self, to="user@example.com", token="tok123", env=None):
        import email_service
        env = env or {}
        with patch.dict("os.environ", env, clear=False):
            email_service.send_verification_email(to, token)

    def test_resend_path_called_when_api_key_set(self):
        """When RESEND_API_KEY is set, Resend SDK should be called."""
        import email_service
        fake_result = {"id": "fake-id-123"}
        with patch.dict("os.environ", {"RESEND_API_KEY": "re_test_key", "ENVIRONMENT": "production", "FRONTEND_URL": "https://chat-tornado.vercel.app"}):
            with patch("email_service._send_via_resend") as mock_resend:
                email_service.send_verification_email("user@example.com", "tok")
                mock_resend.assert_called_once()

    def test_smtp_fallback_when_no_resend_key(self):
        """When no RESEND_API_KEY but SMTP is configured, SMTP path is used."""
        import email_service
        smtp_env = {
            "RESEND_API_KEY": "",
            "SMTP_SERVER": "smtp.example.com",
            "SMTP_PORT": "587",
            "SMTP_USER": "user",
            "SMTP_PASSWORD": "pass",
            "ENVIRONMENT": "production",
        }
        with patch.dict("os.environ", smtp_env):
            with patch("email_service._send_via_smtp") as mock_smtp:
                email_service.send_verification_email("user@example.com", "tok")
                mock_smtp.assert_called_once()

    def test_dev_mock_when_no_provider(self, capsys):
        """In development with no provider, prints mock URL to stdout."""
        import email_service
        env = {"RESEND_API_KEY": "", "SMTP_SERVER": "", "SMTP_USER": "", "ENVIRONMENT": "development", "FRONTEND_URL": "http://localhost:5173"}
        with patch.dict("os.environ", env):
            email_service.send_verification_email("dev@example.com", "mytok")
        captured = capsys.readouterr()
        assert "mytok" in captured.out
        assert "dev@example.com" in captured.out

    def test_production_crash_when_no_provider(self):
        """In production with no provider, raises RuntimeError."""
        import email_service
        env = {"RESEND_API_KEY": "", "SMTP_SERVER": "", "SMTP_USER": "", "ENVIRONMENT": "production"}
        with patch.dict("os.environ", env):
            with pytest.raises(RuntimeError, match="No email provider configured"):
                email_service.send_verification_email("prod@example.com", "tok")

    def test_verification_link_uses_frontend_url(self):
        """Verification link in email must use FRONTEND_URL, not localhost."""
        import email_service
        vercel_url = "https://chat-tornado.vercel.app"
        captured_html = {}
        def capture_resend(to, html, plain):
            captured_html["html"] = html
            captured_html["plain"] = plain
        with patch.dict("os.environ", {"RESEND_API_KEY": "re_test", "FRONTEND_URL": vercel_url, "ENVIRONMENT": "production"}):
            with patch("email_service._send_via_resend", side_effect=capture_resend):
                email_service.send_verification_email("u@example.com", "abc123")
        assert vercel_url in captured_html["html"]
        assert "abc123" in captured_html["html"]
        assert "localhost" not in captured_html["html"]
        assert vercel_url in captured_html["plain"]
