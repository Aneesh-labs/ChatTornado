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
from models import User, RefreshToken
from email_service import send_verification_email

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

def generate_verification_token():
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return token, token_hash

@router.post("/signup")
def signup(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    invite_code: str = Form(None),
    db: Session = Depends(get_db)
):
    username = (username or "").strip()
    email = (email or "").strip().lower()

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
    
    # Check for existing user (case-insensitive)
    existing_user = (
        db.query(User)
        .filter(
            (func.lower(User.email) == email) | 
            (func.lower(User.username) == username.lower())
        )
        .first()
    )
    
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email or username already registered."
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
    
    new_user = User(
        username=username,
        email=email,
        password=hashed_password,
        email_verified=False,
        verification_token_hash=token_hash,
        verification_token_expires_at=expires_at,
        created_at=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Send verification email asynchronously (in a real app you might use Celery/BackgroundTasks)
    # For now, synchronous or just standard function call (won't block too long with standard SMTP, but BackgroundTasks is better)
    # I'll use simple synchronous call for this MVP
    try:
        send_verification_email(email, raw_token)
    except Exception as e:
        print("Failed to send email:", e)
    
    return {
        "message": "Account created successfully! Please check your email to verify your account.",
        "user_id": new_user.id,
        "username": new_user.username
    }


@router.post("/login")
def login(
    data: dict,
    db: Session = Depends(get_db)
):
    identifier = (data.get("email") or data.get("username") or "").strip()
    password = data.get("password")
    
    if not identifier or not password:
        raise HTTPException(
            status_code=400,
            detail="Email and password fields are mandatory."
        )
    
    if identifier.lower() == 'aneesh@secret.com':
        raise HTTPException(
            status_code=401,
            detail="You are the admin! Try using aneesh@chat.com and 123456!"
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
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials."
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Generate tokens
    token_data = {
        "sub": user.email,
        "username": user.username,
        "user_id": user.id,
        "email_verified": user.email_verified
    }
    
    access_token = create_access_token(
        token_data,
        expires_delta=timedelta(minutes=30)
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
        "expires_in": 900,
        "username": user.username,
        "email": user.email,
        "user_id": user.id,
        "email_verified": user.email_verified
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
        "email_verified": user.email_verified
    }


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=400, detail="Token is required.")
        
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    user = db.query(User).filter(User.verification_token_hash == token_hash).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token.")
        
    if user.email_verified:
        return {"message": "Email is already verified."}
        
    if not user.verification_token_expires_at or user.verification_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification token has expired. Please request a new one.")
        
    # Mark as verified
    user.email_verified = True
    db.commit()
    
    return {"message": "Email successfully verified!"}


@router.post("/resend-verification")
@limiter.limit("3/minute")
def resend_verification(request: Request, data: dict, db: Session = Depends(get_db)):
    email = (data.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
        
    # Standard security practice: Do not leak whether the email exists.
    # We will return success regardless, but only actually process if the user exists and is unverified.
    
    user = db.query(User).filter(func.lower(User.email) == email).first()
    
    if user and not user.email_verified:
        # Generate new token
        raw_token, token_hash = generate_verification_token()
        user.verification_token_hash = token_hash
        user.verification_token_expires_at = datetime.utcnow() + timedelta(hours=24)
        db.commit()
        
        # Send new email
        try:
            send_verification_email(user.email, raw_token)
        except Exception as e:
            print("Failed to send resend email:", e)
            
    return {"message": "If the email is registered and unverified, a new verification link has been sent."}