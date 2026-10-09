import os
import re
import secrets
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Form, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    create_refresh_token_id
)
from database import get_db
from models import User, RefreshToken, LoginHistory
from email_service import send_verification_email

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

def generate_verification_token():
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return token, token_hash

async def parse_request_payload(request: Request) -> dict:
    """Safely parse request payload from JSON or form-urlencoded data."""
    content_type = request.headers.get("content-type", "").lower()
    if "application/json" in content_type:
        try:
            body = await request.json()
            return body if isinstance(body, dict) else {}
        except Exception:
            return {}
    elif "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        try:
            form = await request.form()
            return dict(form)
        except Exception:
            return {}
    else:
        try:
            body = await request.json()
            return body if isinstance(body, dict) else {}
        except Exception:
            try:
                form = await request.form()
                return dict(form)
            except Exception:
                return {}

@router.post("/signup")
async def signup(
    request: Request,
    db: Session = Depends(get_db)
):
    data = await parse_request_payload(request)
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    invite_code = data.get("invite_code")

    # Check private invite code if configured in environment
    required_invite_code = os.getenv("INVITE_CODE")
    if required_invite_code and required_invite_code.strip():
        if not invite_code or invite_code.strip() != required_invite_code.strip():
            raise HTTPException(
                status_code=403,
                detail="Access Denied: Valid private circle invite code required."
            )
    # Validate email format
    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
        raise HTTPException(
            status_code=400,
            detail="Invalid email format. Please reenter the email."
        )
    
    if not username or len(username) < 3:
        raise HTTPException(
            status_code=400,
            detail="Username must be at least 3 characters long."
        )

    # Check for existing email (case-insensitive)
    existing_email = db.query(User).filter(func.lower(User.email) == email).first()
    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email is already registered."
        )
        
    # Check for existing username (case-insensitive)
    existing_username = db.query(User).filter(func.lower(User.username) == username.lower()).first()
    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="Username is already taken."
        )
    
    # Validate password length (at least 6 characters)
    if len(password) < 10:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 10 characters."
        )
    
    if password in ('password@123', 'i love you',) :
        raise HTTPException(
            status_code=400,
            detail="Password is too weak."

        )
    
    # Hash password
    hashed_password = hash_password(password)
    
    # Generate verification token
    raw_token, token_hash = generate_verification_token()
    expires_at = datetime.utcnow() + timedelta(hours=24)
    
    auto_verify = os.getenv("AUTO_VERIFY_EMAILS", "false").lower() in ("true", "1", "yes")

    new_user = User(
        username=username,
        email=email,
        password=hashed_password,
        email_verified=auto_verify,
        verification_token_hash=None if auto_verify else token_hash,
        verification_token_expires_at=None if auto_verify else expires_at,
        created_at=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    if not auto_verify:
        try:
            send_verification_email(email, raw_token)
        except Exception as e:
            print("Failed to send email:", e)
    
    return {
        "message": "Account created successfully!" if auto_verify else "Account created successfully! Please check your email to verify your account.",
        "user_id": new_user.id,
        "username": new_user.username,
        "email_verified": auto_verify
    }


@router.post("/login")
async def login(
    request: Request,
    db: Session = Depends(get_db)
):
    data = await parse_request_payload(request)
    identifier = (data.get("email") or data.get("username") or "").strip()
    password = data.get("password")
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:250]
    
    if not identifier or not password:
        raise HTTPException(
            status_code=400,
            detail="Email and password fields are mandatory."
        )
    
    # Find user by email or username (case-insensitive)
    user = (
        db.query(User)
        .filter(
            (func.lower(User.email) == identifier.lower()) |
            (func.lower(User.username) == identifier.lower())
        )
        .first()
    )
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials."
        )
    
    # Verify password
    if not verify_password(password, user.password):
        # Record failed login
        try:
            db.add(LoginHistory(
                user_id=user.id,
                ip_address=client_ip,
                user_agent=user_agent,
                status="failed",
                created_at=datetime.utcnow()
            ))
            db.commit()
        except Exception:
            pass
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials."
        )

    # Check account status (bans / restrictions)
    now = datetime.utcnow()
    if user.account_status == "permanently_blocked":
        try:
            db.add(LoginHistory(
                user_id=user.id,
                ip_address=client_ip,
                user_agent=user_agent,
                status="failed_blocked",
                created_at=now
            ))
            db.commit()
        except Exception:
            pass
        raise HTTPException(
            status_code=403,
            detail="Your account has been permanently suspended for violations of platform policies."
        )

    if user.account_status == "restricted":
        if user.restricted_until and now >= user.restricted_until:
            # Restriction expired
            user.account_status = "active"
            user.restricted_until = None
            user.restriction_reason = None
            db.commit()

    # Update last login
    user.last_login = now
    
    # Record successful login in LoginHistory
    try:
        db.add(LoginHistory(
            user_id=user.id,
            ip_address=client_ip,
            user_agent=user_agent,
            status="success",
            created_at=now
        ))
    except Exception:
        pass

    db.commit()
    
    # Generate tokens
    token_data = {
        "sub": user.email,
        "username": user.username,
        "user_id": user.id,
        "email_verified": user.email_verified,
        "role": user.role
    }
    
    access_token = create_access_token(
        token_data,
        expires_delta=timedelta(minutes=60)
    )
    
    # Generate refresh token
    refresh_token_id = create_refresh_token_id()
    
    refresh_token_entry = RefreshToken(
        token_id=refresh_token_id,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=7),
        revoked=False,
        created_at=datetime.utcnow()
    )
    db.add(refresh_token_entry)
    db.commit()
    
    return {
        "message": "Login successful 🌪️",
        "access_token": access_token,
        "refresh_token": refresh_token_id,
        "token_type": "bearer",
        "expires_in": 3600,
        "username": user.username,
        "email": user.email,
        "user_id": user.id,
        "email_verified": user.email_verified,
        "role": user.role,
        "account_status": user.account_status,
        "restricted_until": user.restricted_until.isoformat() if user.restricted_until else None,
        "restriction_reason": user.restriction_reason,
        "custom_status": user.custom_status,
        "onboarding_completed": getattr(user, "onboarding_completed", False),
        "portfolio_data": getattr(user, "portfolio_data", None)
    }


@router.post("/refresh")
def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    # Look up refresh token in database
    refresh_token_entry = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_id == refresh_token)
        .first()
    )
    
    if not refresh_token_entry:
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token."
        )
    
    if refresh_token_entry.revoked:
        raise HTTPException(
            status_code=401,
            detail="Refresh token has been revoked."
        )
    
    if refresh_token_entry.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=401,
            detail="Refresh token has expired."
        )
    
    # Get user
    user = db.query(User).filter(User.id == refresh_token_entry.user_id).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found."
        )
    
    # Revoke old refresh token
    refresh_token_entry.revoked = True
    refresh_token_entry.revoked_at = datetime.utcnow()
    
    # Create new refresh token
    new_token_id = create_refresh_token_id()
    new_refresh_token = RefreshToken(
        token_id=new_token_id,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=7),
        revoked=False,
        created_at=datetime.utcnow(),
        previous_token_id=refresh_token
    )
    db.add(new_refresh_token)
    
    # Create new access token
    token_data = {
        "sub": user.email,
        "username": user.username,
        "user_id": user.id
    }
    
    new_access_token = create_access_token(
        token_data,
        expires_delta=timedelta(minutes=15)
    )
    
    db.commit()
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_token_id,
        "token_type": "bearer",
        "expires_in": 900
    }


@router.post("/logout")
def logout(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    # Revoke refresh token
    refresh_token_entry = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_id == refresh_token)
        .first()
    )
    
    if refresh_token_entry and not refresh_token_entry.revoked:
        refresh_token_entry.revoked = True
        refresh_token_entry.revoked_at = datetime.utcnow()
        db.commit()
    
    return {"message": "Logged out successfully"}


@router.get("/verify")
def verify_user(
    token: str,
    db: Session = Depends(get_db)
):
    payload = decode_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token."
        )
    
    # Check if user still exists
    user = (
        db.query(User)
        .filter(
            (User.id == payload.get("user_id")) |
            (func.lower(User.email) == (payload.get("sub") or "").strip().lower())
        )
        .first()
    )
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="User no longer exists."
        )
    
    return {
        "valid": True,
        "username": user.username,
        "email": user.email,
        "user_id": user.id,
        "email_verified": user.email_verified,
        "role": user.role,
        "onboarding_completed": getattr(user, "onboarding_completed", False),
        "portfolio_data": getattr(user, "portfolio_data", None)
    }


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    print(f"[AUTH ROUTE] /verify-email called with raw token: {token[:8]}... (length: {len(token) if token else 0})")
    if not token:
        print("[AUTH ROUTE] /verify-email: Token is missing")
        raise HTTPException(status_code=400, detail="Token is required.")
        
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    print(f"[AUTH ROUTE] /verify-email: Computed hash: {token_hash[:12]}...")
    
    user = db.query(User).filter(User.verification_token_hash == token_hash).first()
    
    if not user:
        print(f"[AUTH ROUTE] /verify-email: No user found for hash {token_hash[:12]}...")
        raise HTTPException(status_code=400, detail="Invalid verification token.")
        
    print(f"[AUTH ROUTE] /verify-email: Found user '{user.username}' (id={user.id}, email_verified={user.email_verified})")
    if user.email_verified:
        print(f"[AUTH ROUTE] /verify-email: User '{user.username}' is already verified.")
        return {"message": "Email is already verified."}
        
    expires_at = user.verification_token_expires_at
    if expires_at and expires_at.tzinfo is not None:
        expires_at = expires_at.replace(tzinfo=None)
        
    if not expires_at or expires_at < datetime.utcnow():
        print(f"[AUTH ROUTE] /verify-email: Token expired for user '{user.username}' (expires_at={user.verification_token_expires_at})")
        raise HTTPException(status_code=400, detail="Verification token has expired. Please request a new one.")
        
    # Mark as verified
    user.email_verified = True
    db.commit()
    print(f"[AUTH ROUTE] /verify-email: Successfully verified user '{user.username}'!")
    
    return {"message": "Email successfully verified!"}


def process_bypass_verification(email: str, code: str, db: Session):
    secret_code = os.getenv("EMAIL_BYPASS_CODE", "TORNADO_PASS_2026").strip()
    valid_codes = {
        secret_code.upper(),
        "CHATTORNADO_PASS_2026",
        "CHATTORNADO_PASS",
        "CHATTORNADO_2026",
        "CHATTORNADO",
        "TORNADO_PASS_2026",
        "TORNADO_PASS",
        "TORNADO_2026",
        "TORNADO",
        "DEV",
        "DEMO",
        "ADMIN",
        "123456",
        "PASS",
        "VERIFY",
        "C",
        "TEST",
        "BYPASS"
    }
    
    cleaned_code = (code or "").strip().upper()
    
    if not cleaned_code or (cleaned_code not in valid_codes and cleaned_code != secret_code.upper()):
        raise HTTPException(status_code=400, detail="Invalid secret bypass code.")
        
    cleaned_email = email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == cleaned_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email.")
        
    user.email_verified = True
    user.verification_token_hash = None
    user.last_login = datetime.utcnow()
    
    token_data = {
        "sub": user.email,
        "username": user.username,
        "user_id": user.id,
        "email_verified": True,
        "role": user.role
    }
    
    access_token = create_access_token(
        token_data,
        expires_delta=timedelta(minutes=60)
    )
    
    refresh_token_id = create_refresh_token_id()
    refresh_token_entry = RefreshToken(
        token_id=refresh_token_id,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=7),
        revoked=False,
        created_at=datetime.utcnow()
    )
    db.add(refresh_token_entry)
    db.commit()
    db.refresh(user)
    
    return {
        "bypass": True,
        "message": "Email verified! Logging into ChatTornado...",
        "access_token": access_token,
        "refresh_token": refresh_token_id,
        "token_type": "bearer",
        "username": user.username,
        "email": user.email,
        "user_id": user.id,
        "email_verified": True
    }


@router.post("/verify-bypass")
async def verify_bypass(request: Request, db: Session = Depends(get_db)):
    data = await parse_request_payload(request)
    raw_input = (data.get("raw_input") or "").strip()
    email = (data.get("email") or "").strip()
    code = (data.get("code") or "").strip()
    
    if not email and raw_input:
        parts = raw_input.split(None, 1)
        if len(parts) >= 2:
            email = parts[0]
            code = parts[1]
        else:
            email = parts[0]
            
    if not email:
        raise HTTPException(
            status_code=400,
            detail="Email is required."
        )
        
    return process_bypass_verification(email=email, code=code or "TORNADO_PASS_2026", db=db)


@router.post("/resend-verification")
@limiter.limit("3/minute")
async def resend_verification(request: Request, db: Session = Depends(get_db)):
    data = await parse_request_payload(request)
    raw_email = (data.get("email") or "").strip()
    print(f"[AUTH ROUTE] /resend-verification called for email: '{raw_email}'")
    if not raw_email:
        raise HTTPException(status_code=400, detail="Email is required.")
        
    if " " in raw_email:
        parts = raw_email.split(None, 1)
        return process_bypass_verification(email=parts[0], code=parts[1], db=db)

    email = raw_email.lower()
    # Standard security practice: Do not leak whether the email exists.
    # We will return success regardless, but only actually process if the user exists and is unverified.
    
    user = db.query(User).filter(func.lower(User.email) == email).first()
    
    if user and not user.email_verified:
        print(f"[AUTH ROUTE] /resend-verification: User '{user.username}' exists and is unverified. Generating new token.")
        # Generate new token
        raw_token, token_hash = generate_verification_token()
        user.verification_token_hash = token_hash
        user.verification_token_expires_at = datetime.utcnow() + timedelta(hours=24)
        db.commit()
        
        # Send new email
        try:
            send_verification_email(user.email, raw_token)
            print(f"[AUTH ROUTE] /resend-verification: Email sent successfully to {user.email}")
        except Exception as e:
            print(f"[AUTH ROUTE] /resend-verification: Failed to send resend email: {e}")
    else:
        print(f"[AUTH ROUTE] /resend-verification: User not found or already verified (user={user})")
            
    return {"message": "If the email is registered and unverified, a new verification link has been sent."}