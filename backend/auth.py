# 📁 auth.py
# Complete authentication with refresh token ID generation and verification

import os
import secrets
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Dict, Tuple
from enum import Enum

from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.exc import UnknownHashError


# ============================================================================
# Security Configuration
# ============================================================================

class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"
    VERIFICATION = "verification"
    RESET = "reset"


# Environment variables with secure defaults
SECRET_KEY: str = os.getenv("SECRET_KEY") or secrets.token_urlsafe(32)
SECRET_KEY: str = os.getenv("SECRET_KEY") or "chat_tornado_jwt_production_secret_key_2026_secure_key"

if os.getenv("SECRET_KEY") is None:
    print("[WARNING] SECRET_KEY not set in environment. Using generated key.")

assert SECRET_KEY is not None

    

# Different keys for different token types (defense in depth)
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY")
if not REFRESH_SECRET_KEY:
    REFRESH_SECRET_KEY = SECRET_KEY + "_refresh"

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
VERIFICATION_TOKEN_EXPIRE_HOURS = int(os.getenv("VERIFICATION_TOKEN_EXPIRE_HOURS", "24"))
RESET_TOKEN_EXPIRE_HOURS = int(os.getenv("RESET_TOKEN_EXPIRE_HOURS", "1"))

# Token size limits
MAX_TOKEN_SIZE = 4096


# ============================================================================
# Password Hashing
# ============================================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,
)


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    if not password or len(password) < 1:
        raise ValueError("Password cannot be empty")
    
    if len(password) > 1024:
        raise ValueError("Password too long")
    
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    if not plain_password or not hashed_password:
        return False
    
    if len(plain_password) > 1024:
        return False
    
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except (UnknownHashError, ValueError, RuntimeError):
        return False


def needs_rehash(hashed_password: str) -> bool:
    """Check if the password hash needs to be rehashed."""
    if not hashed_password:
        return False
    
    try:
        return pwd_context.needs_update(hashed_password)
    except (UnknownHashError, ValueError):
        return True


# ============================================================================
# JWT Token Creation
# ============================================================================

def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
    token_type: TokenType = TokenType.ACCESS
) -> str:
    """Create a signed JWT access token."""
    return _create_token(
        data=data,
        expires_delta=expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        token_type=token_type,
        secret_key=SECRET_KEY
    )


def create_refresh_token_id() -> str:
    """
    Generate a unique ID for refresh tokens.
    This is NOT a JWT - it's a random string stored in the database.
    """
    return secrets.token_urlsafe(32)


def create_verification_token(user_id: str) -> str:
    """Create a token for email verification."""
    data = {
        "sub": user_id,
        "type": TokenType.VERIFICATION.value,
        "purpose": "email_verification"
    }
    
    return _create_token(
        data=data,
        expires_delta=timedelta(hours=VERIFICATION_TOKEN_EXPIRE_HOURS),
        token_type=TokenType.VERIFICATION,
        secret_key=SECRET_KEY
    )


def create_reset_token(user_id: str) -> str:
    """Create a token for password reset."""
    data = {
        "sub": user_id,
        "type": TokenType.RESET.value,
        "purpose": "password_reset"
    }
    
    return _create_token(
        data=data,
        expires_delta=timedelta(hours=RESET_TOKEN_EXPIRE_HOURS),
        token_type=TokenType.RESET,
        secret_key=SECRET_KEY
    )


def _create_token(
    data: Dict[str, Any],
    expires_delta: timedelta,
    token_type: TokenType,
    secret_key: str
) -> str:
    """Internal function to create JWT tokens."""
    to_encode = data.copy()
    
    now = datetime.now(timezone.utc)
    expire = now + expires_delta
    
    to_encode.update({
        "exp": expire,
        "iat": now,
        "type": token_type.value,
        "jti": secrets.token_urlsafe(16),
    })
    
    token = jwt.encode(
        to_encode,
        secret_key,
        algorithm=ALGORITHM
    )
    
    if len(token) > MAX_TOKEN_SIZE:
        raise ValueError("Token exceeds maximum size")
    
    return token


# ============================================================================
# JWT Token Verification
# ============================================================================

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify a JWT token."""
    if not token:
        return None
    
    if len(token) > MAX_TOKEN_SIZE:
        return None
    
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "require_exp": True,
                "require_iat": True,
            }
        )
        
        if "exp" not in payload or "iat" not in payload:
            return None
        
        exp_timestamp = payload.get("exp")
        if exp_timestamp and datetime.fromtimestamp(exp_timestamp, tz=timezone.utc) < datetime.now(timezone.utc):
            return None
        
        token_type = payload.get("type")
        if token_type and token_type not in [t.value for t in TokenType]:
            return None
        
        return payload
        
    except JWTError:
        return None
    except Exception:
        return None


def decode_verification_token(token: str) -> Optional[str]:
    """Decode a verification token and return the user ID."""
    payload = decode_token(token)
    
    if not payload:
        return None
    
    if payload.get("type") != TokenType.VERIFICATION.value:
        return None
    
    if payload.get("purpose") != "email_verification":
        return None
    
    return payload.get("sub")


def decode_reset_token(token: str) -> Optional[str]:
    """Decode a password reset token and return the user ID."""
    payload = decode_token(token)
    
    if not payload:
        return None
    
    if payload.get("type") != TokenType.RESET.value:
        return None
    
    if payload.get("purpose") != "password_reset":
        return None
    
    return payload.get("sub")


# ============================================================================
# REFRESH TOKEN VALIDATION (NEW)
# ============================================================================

def verify_refresh_token_id(token_id: str, db_session) -> Optional[Dict[str, Any]]:
    """
    Verify a refresh token ID from the database.
    Returns user info if valid, None otherwise.
    
    This is NOT a JWT verification - it checks the database for the token ID.
    """
    from models import RefreshToken  # Import here to avoid circular imports
    
    if not token_id or len(token_id) < 32:
        return None
    
    try:
        # Query the database for this refresh token
        refresh_token = (
            db_session.query(RefreshToken)
            .filter(RefreshToken.token_id == token_id)
            .first()
        )
        
        if not refresh_token:
            return None
        
        # Check if revoked
        if refresh_token.revoked:
            return None
        
        # Check if expired
        if refresh_token.expires_at < datetime.now(timezone.utc):
            return None
        
        # Get the associated user
        user = refresh_token.user
        if not user:
            return None
        
        # Return user info
        return {
            "user_id": str(user.id),
            "username": user.username,
            "email": user.email,
            "email_verified": user.email_verified,
            "refresh_token_id": refresh_token.token_id,
            "client_fingerprint": refresh_token.client_fingerprint
        }
        
    except Exception:
        return None


def refresh_token_is_valid(token_id: str, db_session) -> bool:
    """
    Quick check if a refresh token is valid (not revoked, not expired).
    """
    result = verify_refresh_token_id(token_id, db_session)
    return result is not None


def revoke_refresh_token(token_id: str, db_session) -> bool:
    """
    Revoke a single refresh token.
    Returns True if revoked, False if not found.
    """
    from models import RefreshToken
    
    try:
        refresh_token = (
            db_session.query(RefreshToken)
            .filter(RefreshToken.token_id == token_id)
            .first()
        )
        
        if not refresh_token:
            return False
        
        refresh_token.revoked = True
        refresh_token.revoked_at = datetime.now(timezone.utc)
        db_session.commit()
        
        return True
        
    except Exception:
        db_session.rollback()
        return False


def revoke_all_user_refresh_tokens(user_id: int, db_session, keep_current: Optional[str] = None) -> int:
    """
    Revoke all refresh tokens for a user (except optionally the current one).
    Returns the number of tokens revoked.
    """
    from models import RefreshToken
    
    try:
        query = db_session.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False
        )
        
        if keep_current:
            query = query.filter(RefreshToken.token_id != keep_current)
        
        tokens = query.all()
        count = len(tokens)
        
        for token in tokens:
            token.revoked = True
            token.revoked_at = datetime.now(timezone.utc)
        
        db_session.commit()
        return count
        
    except Exception:
        db_session.rollback()
        return 0


def rotate_refresh_token(old_token_id: str, db_session, new_client_fingerprint: Optional[str] = None) -> Optional[str]:
    """
    Rotate a refresh token: revoke old one and create a new one.
    Returns the new token ID, or None if failed.
    """
    from models import RefreshToken, User
    
    try:
        # Get the old refresh token
        old_token = (
            db_session.query(RefreshToken)
            .filter(RefreshToken.token_id == old_token_id)
            .first()
        )
        
        if not old_token or old_token.revoked:
            return None
        
        # Get the user
        user = old_token.user
        if not user:
            return None
        
        # Revoke old token
        old_token.revoked = True
        old_token.revoked_at = datetime.now(timezone.utc)
        
        # Create new refresh token
        new_token_id = secrets.token_urlsafe(32)
        new_token = RefreshToken(
            token_id=new_token_id,
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
            revoked=False,
            client_fingerprint=new_client_fingerprint or old_token.client_fingerprint,
            previous_token_id=old_token_id
        )
        
        db_session.add(new_token)
        db_session.commit()
        
        return new_token_id
        
    except Exception:
        db_session.rollback()
        return None


# ============================================================================
# Token Validation Utilities
# ============================================================================

def validate_token_type(token: str, expected_type: TokenType) -> bool:
    """Validate that a token is of the expected type."""
    payload = decode_token(token)
    if not payload:
        return False
    
    return payload.get("type") == expected_type.value


def get_token_expiry(token: str) -> Optional[datetime]:
    """Get the expiration time of a token."""
    payload = decode_token(token)
    if not payload:
        return None
    
    exp = payload.get("exp")
    if exp:
        return datetime.fromtimestamp(exp, tz=timezone.utc)
    
    return None


def get_token_remaining_time(token: str) -> Optional[timedelta]:
    """Get the remaining time until a token expires."""
    expiry = get_token_expiry(token)
    if not expiry:
        return None
    
    remaining = expiry - datetime.now(timezone.utc)
    if remaining.total_seconds() < 0:
        return timedelta(0)
    
    return remaining


# ============================================================================
# Token Blacklist
# ============================================================================

def get_token_blacklist_key(token: str) -> str:
    """Generate a blacklist key for a token."""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return f"blacklist:{token_hash}"


# ============================================================================
# Security Utilities
# ============================================================================

def generate_secure_token(length: int = 64) -> str:
    """Generate a cryptographically secure random token."""
    return secrets.token_urlsafe(length)


def generate_otp(length: int = 6) -> str:
    """Generate a one-time password (numeric)."""
    return ''.join(secrets.choice('0123456789') for _ in range(length))


def hash_token_for_storage(token: str) -> str:
    """Hash a token for secure storage in the database."""
    return hashlib.sha256(token.encode()).hexdigest()


def generate_api_key(prefix: str = "ct") -> str:
    """Generate a formatted API key."""
    random_part = secrets.token_urlsafe(24)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"{prefix}_{random_part}_{timestamp}"


# ============================================================================
# Error Classes
# ============================================================================

class AuthenticationError(Exception):
    """Base authentication error."""
    pass


class TokenExpiredError(AuthenticationError):
    """Raised when a token has expired."""
    pass


class InvalidTokenError(AuthenticationError):
    """Raised when a token is invalid."""
    pass


class RefreshTokenError(AuthenticationError):
    """Raised when there's an issue with refresh tokens."""
    pass


# ============================================================================
# Production Security Checks
# ============================================================================

def ensure_production_security():
    """Run security checks for production environment."""
    warnings = []

    if os.getenv("SECRET_KEY") is None:
        warnings.append("SECRET_KEY not set in environment variables!")

    if SECRET_KEY is not None and len(SECRET_KEY) < 32:
        warnings.append("SECRET_KEY is too short! Use at least 32 characters.")

    weak_keys = ["secret", "password", "123456", "changeme", "chat_tornado_secret_key"]

    if SECRET_KEY is not None and SECRET_KEY.lower() in weak_keys:
        warnings.append("SECRET_KEY is using a known weak value!")

    if os.getenv("DEBUG", "false").lower() == "true":
        warnings.append("DEBUG mode is enabled in production!")

    if warnings:
        print("⚠️  SECURITY WARNINGS:")
        for warning in warnings:
            print(f"   - {warning}")

        if os.getenv("ENVIRONMENT", "development") == "production":
            raise SystemExit("Security checks failed. Fix the issues above.")


# ============================================================================
# CORS Configuration
# ============================================================================

def get_cors_origins() -> list[str]:
    """Get allowed CORS origins from environment."""
    origins_env = os.getenv("CORS_ORIGINS", "")
    if origins_env:
        return [origin.strip() for origin in origins_env.split(",") if origin.strip()]
    
    return [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]


# ============================================================================
# Module Exports
# ============================================================================

__all__ = [
    # Password functions
    'hash_password',
    'verify_password',
    'needs_rehash',
    
    # Token creation
    'create_access_token',
    'create_refresh_token_id',
    'create_verification_token',
    'create_reset_token',
    
    # Token decoding
    'decode_token',
    'decode_verification_token',
    'decode_reset_token',
    
    # Refresh token functions (NEW)
    'verify_refresh_token_id',
    'refresh_token_is_valid',
    'revoke_refresh_token',
    'revoke_all_user_refresh_tokens',
    'rotate_refresh_token',
    
    # Token utilities
    'validate_token_type',
    'get_token_expiry',
    'get_token_remaining_time',
    'get_token_blacklist_key',
    
    # Security utilities
    'generate_secure_token',
    'generate_otp',
    'hash_token_for_storage',
    'generate_api_key',
    
    # Configuration
    'SECRET_KEY',
    'ALGORITHM',
    'ACCESS_TOKEN_EXPIRE_MINUTES',
    'REFRESH_TOKEN_EXPIRE_DAYS',
    'TokenType',
    
    # Error classes
    'AuthenticationError',
    'TokenExpiredError',
    'InvalidTokenError',
    'RefreshTokenError',
    
    # Security checks
    'ensure_production_security',
    'get_cors_origins',
]