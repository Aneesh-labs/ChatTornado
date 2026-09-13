from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Text,
    Integer,
    UniqueConstraint,
    Index,
    JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


# ============================================================================
# USER MODEL
# ============================================================================

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="offline", nullable=False)
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    sent_messages: Mapped[List["Message"]] = relationship(
        "Message",
        foreign_keys="Message.sender_id",
        back_populates="sender"
    )
    
    received_messages: Mapped[List["Message"]] = relationship(
        "Message",
        foreign_keys="Message.receiver_id",
        back_populates="receiver"
    )


# ============================================================================
# MESSAGE MODEL
# ============================================================================

class Message(Base):
    __tablename__ = "messages"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    receiver_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    read_state: Mapped[str] = mapped_column(String(20), default="sent", nullable=False)
    
    # Relationships
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver: Mapped["User"] = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")
    visibility: Mapped[List["MessageVisibility"]] = relationship(
        "MessageVisibility",
        back_populates="message",
        cascade="all, delete-orphan"
    )
    reactions: Mapped[List["MessageReaction"]] = relationship(
        "MessageReaction",
        back_populates="message",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


# ============================================================================
# MESSAGE REACTION MODEL
# ============================================================================

class MessageReaction(Base):
    __tablename__ = "message_reactions"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reaction: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    message: Mapped["Message"] = relationship("Message", back_populates="reactions")
    user: Mapped["User"] = relationship("User")
    
    __table_args__ = (
        UniqueConstraint('message_id', 'user_id', name='uq_message_user_reaction'),
    )


# ============================================================================
# MESSAGE VISIBILITY MODEL
# ============================================================================

class MessageVisibility(Base):
    __tablename__ = "message_visibility"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("messages.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Relationships
    message: Mapped["Message"] = relationship("Message", back_populates="visibility")
    
    __table_args__ = (
        UniqueConstraint('message_id', 'user_id', name='uq_message_user_visibility'),
    )

# ============================================================================
# REFRESH TOKEN MODEL (For token rotation)
# ============================================================================

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    token_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    client_fingerprint: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    previous_token_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    
    __table_args__ = (
        UniqueConstraint('token_id', name='uq_refresh_token_id'),
        Index('idx_refresh_tokens_user_revoked', 'user_id', 'revoked'),
        Index('idx_refresh_tokens_expires', 'expires_at'),
    )    