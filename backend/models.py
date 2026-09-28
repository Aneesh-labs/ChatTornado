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
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verification_token_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    verification_token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="offline", nullable=False)
    custom_status: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="USER", nullable=False)  # "USER", "SUPER_ADMIN"
    account_status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)  # "active", "restricted", "permanently_blocked"
    restricted_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    restriction_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
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
    receiver_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    group_id: Mapped[Optional[int]] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=True, index=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    read_state: Mapped[str] = mapped_column(String(20), default="sent", nullable=False)
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Shield Feature
    is_shielded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    shield_mode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    unlock_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")
    group: Mapped[Optional["Group"]] = relationship("Group", back_populates="messages")
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

# ============================================================================
# CONNECTION MODEL
# ============================================================================

class Connection(Base):
    __tablename__ = "connections"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False) # pending, accepted, declined
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
    receiver: Mapped["User"] = relationship("User", foreign_keys=[receiver_id])
    
    __table_args__ = (
        UniqueConstraint('sender_id', 'receiver_id', name='uq_connection'),
    )

# ============================================================================
# USER AI PERSONA MODEL (Memory & Personalization)
# ============================================================================

class UserAIPersona(Base):
    __tablename__ = "user_ai_personas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    persona_summary: Mapped[str] = mapped_column(Text, nullable=False)
    message_count_analyzed: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


# ============================================================================
# USER BLOCK MODEL
# ============================================================================

class UserBlock(Base):
    __tablename__ = "user_blocks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    blocker_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    blocked_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    blocker: Mapped["User"] = relationship("User", foreign_keys=[blocker_id])
    blocked: Mapped["User"] = relationship("User", foreign_keys=[blocked_id])

    __table_args__ = (
        UniqueConstraint('blocker_id', 'blocked_id', name='uq_user_block'),
        Index('idx_user_blocks_pair', 'blocker_id', 'blocked_id'),
    )


# ============================================================================
# GROUP & GROUP MEMBERS MODELS
# ============================================================================

class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    members: Mapped[List["GroupMember"]] = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    messages: Mapped[List["Message"]] = relationship("Message", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), default="MEMBER", nullable=False)  # "OWNER", "ADMIN", "MEMBER"
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    group: Mapped["Group"] = relationship("Group", back_populates="members")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        UniqueConstraint('group_id', 'user_id', name='uq_group_member'),
        Index('idx_group_members_group_user', 'group_id', 'user_id'),
    )


# ============================================================================
# REPORT & MODERATION MODELS
# ============================================================================

class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    reporter_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reported_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reason_category: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    message_id: Mapped[Optional[int]] = mapped_column(ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)  # "pending", "reviewed", "action_taken", "dismissed"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    reporter: Mapped["User"] = relationship("User", foreign_keys=[reporter_id])
    reported_user: Mapped["User"] = relationship("User", foreign_keys=[reported_user_id])
    message: Mapped[Optional["Message"]] = relationship("Message", foreign_keys=[message_id])
    case: Mapped[Optional["ModerationCase"]] = relationship("ModerationCase", back_populates="report", uselist=False, cascade="all, delete-orphan")


class ModerationCase(Base):
    __tablename__ = "moderation_cases"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ai_severity: Mapped[str] = mapped_column(String(20), default="low", nullable=False)  # "low", "medium", "high", "critical"
    ai_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ai_confidence: Mapped[float] = mapped_column(nullable=False, default=0.0)
    ai_explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    auto_restricted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    restricted_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)  # "pending", "confirmed", "rejected", "resolved"
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    report: Mapped["Report"] = relationship("Report", back_populates="case")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    actions: Mapped[List["ModerationAction"]] = relationship("ModerationAction", back_populates="case", cascade="all, delete-orphan")


class ModerationAction(Base):
    __tablename__ = "moderation_actions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    case_id: Mapped[Optional[int]] = mapped_column(ForeignKey("moderation_cases.id", ondelete="SET NULL"), nullable=True, index=True)
    admin_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action_type: Mapped[str] = mapped_column(String(40), nullable=False)  # "temporary_restriction", "permanent_block", "lift_restriction", "dismiss"
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    case: Mapped[Optional["ModerationCase"]] = relationship("ModerationCase", back_populates="actions")
    admin: Mapped["User"] = relationship("User", foreign_keys=[admin_id])
    target_user: Mapped["User"] = relationship("User", foreign_keys=[target_user_id])


# ============================================================================
# ANNOUNCEMENTS (ADMIN BROADCAST MESSAGES)
# ============================================================================

class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="General", nullable=False)  # "Maintenance", "Feature", "Security", "Policy", "General"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    author: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    reads: Mapped[List["AnnouncementRead"]] = relationship("AnnouncementRead", back_populates="announcement", cascade="all, delete-orphan")


class AnnouncementRead(Base):
    __tablename__ = "announcement_reads"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    announcement_id: Mapped[int] = mapped_column(ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    read_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    announcement: Mapped["Announcement"] = relationship("Announcement", back_populates="reads")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        UniqueConstraint('announcement_id', 'user_id', name='uq_announcement_read'),
        Index('idx_announcement_reads_user', 'user_id', 'announcement_id'),
    )


# ============================================================================
# USER LOGIN HISTORY
# ============================================================================

class LoginHistory(Base):
    __tablename__ = "login_history"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="success", nullable=False)  # "success", "failed"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


# ============================================================================
# ADMIN AUDIT LOGS
# ============================================================================

class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    admin_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    target_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    admin: Mapped["User"] = relationship("User", foreign_keys=[admin_id])