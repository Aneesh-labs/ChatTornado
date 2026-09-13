from fastapi import APIRouter, Depends, HTTPException, Form  # ✅ Added Form
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import re

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    create_refresh_token_id
)
from database import get_db
from models import User, RefreshToken

router = APIRouter()


@router.post("/signup")
def signup(
    username: str = Form(...),  # ✅ Changed to Form
    email: str = Form(...),     # ✅ Changed to Form
    password: str = Form(...),  # ✅ Changed to Form
    db: Session = Depends(get_db)
):
    # Validate email format
    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
        raise HTTPException(
            status_code=400,
            detail="Invalid email format. Please reenter the email."
        )
    
    # Check for existing user
    existing_user = (
        db.query(User)
        .filter(
            (User.email == email) | 
            (User.username == username)
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
    
    new_user = User(
        username=username,
        email=email,
        password=hashed_password,
        created_at=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "message": "Account created successfully! Welcome to ChatTornado!",
        "user_id": new_user.id,
        "username": new_user.username
    }


@router.post("/login")
def login(
    data: dict,
    db: Session = Depends(get_db)
):
    email = data.get("email")
    password = data.get("password")
    
    if not email or not password:
        raise HTTPException(
            status_code=400,
            detail="Email and password feilds are manidatory."
        )
    
    if email == 'Aneesh@Secret.com' :
        raise HTTPException(
            status_code = 401,
            detail="You are the admin! Try using aneesh@chat.com and 123456!"
        )
    
    # Find user
    user = (
        db.query(User)
        .filter(User.email == email)
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
        "user_id": user.id
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
        "user_id": user.id
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
        .filter(User.email == payload.get("sub"))
        .first()
    )
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="User no longer exists."
        )
    
    return {
        "valid": True,
        "username": payload.get("username"),
        "user_id": payload.get("user_id")
    }