# 📁 schemas.py
# Complete schemas with all auth, messages, and WebRTC support

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


# ============================================================================
# AUTH SCHEMAS
# ============================================================================

class SignupData(BaseModel):
    username: str = Field(
        ...,
        min_length=3,
        max_length=30,
        pattern=r"^[a-zA-Z0-9_]+$"
    )
    email: EmailStr
    password: str = Field(..., min_length=12)  # NIST recommends 12+ chars
    
    @validator('username')
    def validate_username(cls, v):
        if not v.replace('_', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, and underscores')
        return v.lower()


class LoginData(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenData(BaseModel):
    refresh_token: str = Field(..., min_length=32)


class LogoutData(BaseModel):
    access_token: str
    refresh_token: str


class EmailVerificationData(BaseModel):
    token: str = Field(..., min_length=32)


class ResetPasswordData(BaseModel):
    token: str = Field(..., min_length=32)
    new_password: str = Field(..., min_length=12)


class ForgotPasswordData(BaseModel):
    email: EmailStr


# ============================================================================
# MESSAGE SCHEMAS
# ============================================================================

class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    FILE = "file"
    VOICE = "voice"
    LOCATION = "location"
    CONTACT = "contact"


class MessageData(BaseModel):
    receiver_id: int
    message: Optional[str] = None
    message_type: MessageType = MessageType.TEXT
    reply_to_id: Optional[int] = None
    media_url: Optional[str] = None
    media_metadata: Optional[dict] = None  # For image/video dimensions, etc.


class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    message: Optional[str]
    message_type: MessageType
    reply_to_id: Optional[int]
    media_url: Optional[str]
    media_metadata: Optional[dict]
    read_state: str  # sent, delivered, read
    created_at: datetime
    sender_username: Optional[str] = None
    sender_avatar: Optional[str] = None
    
    class Config:
        from_attributes = True


class MessageDeleteData(BaseModel):
    message_id: int
    delete_type: str = Field(..., pattern=r"^(me|receiver|everyone)$")

class ChatDeleteData(BaseModel):
    user_id: int


class MessageReactionData(BaseModel):
    message_id: int
    reaction: str = Field(..., max_length=10)


# ============================================================================
# USER SCHEMAS
# ============================================================================

class UserStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    AWAY = "away"
    BUSY = "busy"


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    avatar_url: Optional[str] = None
    status: UserStatus
    last_seen: Optional[datetime]
    email_verified: bool = False
    
    class Config:
        from_attributes = True


class UserUpdateData(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=30)
    avatar_url: Optional[str] = None
    status: Optional[UserStatus] = None


# ============================================================================
# WEBSOCKET / REALTIME SCHEMAS
# ============================================================================

class WebSocketMessage(BaseModel):
    type: str  # "message", "typing", "read_receipt", "reaction", "call"
    data: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TypingData(BaseModel):
    receiver_id: int
    is_typing: bool


class ReadReceiptData(BaseModel):
    message_id: int


# ============================================================================
# WEBRTC / CALL SCHEMAS
# ============================================================================

class CallType(str, Enum):
    VOICE = "voice"
    VIDEO = "video"


class CallSignalData(BaseModel):
    receiver_id: int
    call_type: CallType
    signal_data: dict  # WebRTC SDP or ICE candidate


class CallResponse(BaseModel):
    call_id: str
    caller_id: int
    receiver_id: int
    call_type: CallType
    status: str  # "initiating", "ringing", "connected", "ended"
    started_at: datetime
    ended_at: Optional[datetime] = None


# ============================================================================
# FILE UPLOAD SCHEMAS
# ============================================================================

class FileUploadResponse(BaseModel):
    filename: str
    url: str
    size: int
    mime_type: str
    thumbnail_url: Optional[str] = None


# ============================================================================
# SEARCH / FILTER SCHEMAS
# ============================================================================

class MessageSearchData(BaseModel):
    query: str = Field(..., min_length=1)
    user_id: Optional[int] = None
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)


# ============================================================================
# PAGINATION
# ============================================================================

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    limit: int
    offset: int
    has_more: bool

# ============================================================================
# CONNECTION SCHEMAS
# ============================================================================

class ConnectionCreate(BaseModel):
    receiver_id: int

class ConnectionAction(BaseModel):
    action: str = Field(..., pattern=r"^(accept|decline)$")

class ConnectionResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True