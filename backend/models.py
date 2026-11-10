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
    JSON,
    LargeBinary
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
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    portfolio_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    game_stats: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    e2ee_public_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
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
    
    # Idempotency & Observability
    client_temp_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    correlation_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    
    # Reality Forks & Future Messages
    branch_id: Mapped[Optional[int]] = mapped_column(ForeignKey("conversation_branches.id", ondelete="SET NULL", use_alter=True, name="fk_messages_branch_id"), nullable=True, index=True)
    is_future_message: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    future_message_id: Mapped[Optional[int]] = mapped_column(ForeignKey("future_messages.id", ondelete="SET NULL", use_alter=True, name="fk_messages_future_message_id"), nullable=True, index=True)
    
    # Relationships
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")
    group: Mapped[Optional["Group"]] = relationship("Group", back_populates="messages")
    branch: Mapped[Optional["ConversationBranch"]] = relationship("ConversationBranch", foreign_keys=[branch_id], back_populates="messages")
    future_message: Mapped[Optional["FutureMessage"]] = relationship("FutureMessage", foreign_keys=[future_message_id])
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


# ============================================================================
# REALITY FORKS (CONVERSATION BRANCHING)
# ============================================================================

class ConversationBranch(Base):
    __tablename__ = "conversation_branches"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    conversation_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    group_id: Mapped[Optional[int]] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=True, index=True)
    dm_user1_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    dm_user2_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    parent_branch_id: Mapped[Optional[int]] = mapped_column(ForeignKey("conversation_branches.id", ondelete="SET NULL", use_alter=True, name="fk_messages_branch_id"), nullable=True, index=True)
    fork_message_id: Mapped[int] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    parent_branch: Mapped[Optional["ConversationBranch"]] = relationship("ConversationBranch", remote_side=[id])
    fork_message: Mapped["Message"] = relationship("Message", foreign_keys=[fork_message_id])
    messages: Mapped[List["Message"]] = relationship("Message", foreign_keys="Message.branch_id", back_populates="branch")
    dna: Mapped[Optional["ConversationDNA"]] = relationship("ConversationDNA", back_populates="branch", uselist=False, cascade="all, delete-orphan")


# ============================================================================
# CONVERSATION DNA (STRUCTURE & PATTERNS CACHE)
# ============================================================================

class ConversationDNA(Base):
    __tablename__ = "conversation_dna"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    conversation_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    group_id: Mapped[Optional[int]] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=True, index=True)
    dm_user1_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    dm_user2_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    branch_id: Mapped[Optional[int]] = mapped_column(ForeignKey("conversation_branches.id", ondelete="CASCADE"), nullable=True, index=True)
    metrics: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    message_count_analyzed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_message_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    branch: Mapped[Optional["ConversationBranch"]] = relationship("ConversationBranch", back_populates="dna")


# ============================================================================
# FUTURE MESSAGES (TIME & CONDITION TRIGGERED SCHEDULER)
# ============================================================================

class FutureMessage(Base):
    __tablename__ = "future_messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    group_id: Mapped[Optional[int]] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=True, index=True)
    branch_id: Mapped[Optional[int]] = mapped_column(ForeignKey("conversation_branches.id", ondelete="SET NULL", use_alter=True, name="fk_messages_branch_id"), nullable=True, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    trigger_type: Mapped[str] = mapped_column(String(30), default="time", nullable=False)  # "time" | "condition"
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    condition_config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="scheduled", nullable=False, index=True)  # "scheduled", "waiting", "triggered", "delivered", "cancelled", "expired", "failed"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    delivered_message_id: Mapped[Optional[int]] = mapped_column(ForeignKey("messages.id", ondelete="SET NULL"), nullable=True, index=True)
    execution_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
    receiver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[receiver_id])
    group: Mapped[Optional["Group"]] = relationship("Group", foreign_keys=[group_id])
    branch: Mapped[Optional["ConversationBranch"]] = relationship("ConversationBranch", foreign_keys=[branch_id])
    delivered_message: Mapped[Optional["Message"]] = relationship("Message", foreign_keys=[delivered_message_id])


# ============================================================================
# MEDIA ATTACHMENTS (PERSISTENT DATABASE-BACKED MEDIA STORAGE)
# ============================================================================

class MediaAttachment(Base):
    __tablename__ = "media_attachments"

    id: Mapped[str] = mapped_column(String(120), primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    uploader_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    uploader: Mapped[Optional["User"]] = relationship("User", foreign_keys=[uploader_id])


# ============================================================================
# TORNADO STREAKS MODEL (DAILY ENGAGEMENT & RETENTION ENGINE)
# ============================================================================

class ChatStreak(Base):
    __tablename__ = "chat_streaks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    user1_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user2_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    streak_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_interaction: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    last_sender_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    freeze_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    user1: Mapped["User"] = relationship("User", foreign_keys=[user1_id])
    user2: Mapped["User"] = relationship("User", foreign_keys=[user2_id])

    __table_args__ = (
        UniqueConstraint('user1_id', 'user2_id', name='uq_chat_streak_pair'),
        Index('idx_chat_streaks_pair', 'user1_id', 'user2_id'),
    )


# ============================================================================
# VORTEX ZERO-KNOWLEDGE ENCRYPTED MEMORY VAULT MODEL
# ============================================================================

class VortexMemoryVaultRecord(Base):
    __tablename__ = "vortex_memory_vault_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), default="fact", nullable=False, index=True)  # preference, fact, project, instruction
    encrypted_payload: Mapped[str] = mapped_column(Text, nullable=False)
    iv: Mapped[str] = mapped_column(String(64), nullable=False)
    salt: Mapped[str] = mapped_column(String(64), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index('idx_vortex_vault_user_cat', 'user_id', 'category'),
    )


# ============================================================================
# VORTEX GROUP ENCRYPTED MEMORY VAULT MODEL (ISOLATED GROUP INTELLIGENCE)
# ============================================================================

class VortexGroupVaultRecord(Base):
    __tablename__ = "vortex_group_vault_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), default="guideline", nullable=False, index=True)  # decision, action_item, guideline, summary, fact
    encrypted_payload: Mapped[str] = mapped_column(Text, nullable=False)
    iv: Mapped[str] = mapped_column(String(64), nullable=False)
    salt: Mapped[str] = mapped_column(String(64), nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    group: Mapped["Group"] = relationship("Group", foreign_keys=[group_id])
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        Index('idx_vortex_group_vault_cat', 'group_id', 'category'),
    )


# ============================================================================
# VORTEX SECURITY AUDIT & DETERMINISTIC MODERATION LOG
# ============================================================================

class VortexSecurityAuditLog(Base):
    __tablename__ = "vortex_security_audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # PROMPT_INJECTION, CREDENTIAL_LEAK, RATE_LIMIT, TOXICITY_FLAG, ADMIN_ACTION
    severity: Mapped[str] = mapped_column(String(20), default="INFO", nullable=False)  # INFO, WARNING, CRITICAL
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    group_id: Mapped[Optional[int]] = mapped_column(ForeignKey("groups.id", ondelete="SET NULL"), nullable=True, index=True)
    details: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[user_id])
    group: Mapped[Optional["Group"]] = relationship("Group", foreign_keys=[group_id])

    __table_args__ = (
        Index('idx_vortex_audit_type_time', 'event_type', 'created_at'),
    )


# ============================================================================
# NULL//NORTH CO-OP MULTIPLAYER LABYRINTH MODELS
# ============================================================================

class NullNorthMatch(Base):
    __tablename__ = "null_north_matches"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    match_code: Mapped[str] = mapped_column(String(12), unique=True, nullable=False, index=True)
    host_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    group_id: Mapped[Optional[int]] = mapped_column(ForeignKey("groups.id", ondelete="SET NULL"), nullable=True, index=True)
    dm_partner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="lobby", nullable=False, index=True)  # lobby | active | completed | failed | abandoned
    game_mode: Mapped[str] = mapped_column(String(24), default="classic", nullable=False)  # classic | endless | duel
    difficulty: Mapped[str] = mapped_column(String(24), default="standard", nullable=False)  # standard | hard | nightmare
    player_limit: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    solo_bots: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    world_seed: Mapped[str] = mapped_column(String(64), nullable=False)
    current_tick: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    collapse_seconds_left: Mapped[int] = mapped_column(Integer, default=720, nullable=False)
    instability_countdown: Mapped[int] = mapped_column(Integer, default=45, nullable=False)
    extraction_progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    host: Mapped["User"] = relationship("User", foreign_keys=[host_user_id])
    players: Mapped[List["NullNorthPlayer"]] = relationship("NullNorthPlayer", back_populates="match", cascade="all, delete-orphan")
    world_state: Mapped[Optional["NullNorthWorldState"]] = relationship("NullNorthWorldState", back_populates="match", uselist=False, cascade="all, delete-orphan")


class NullNorthPlayer(Base):
    __tablename__ = "null_north_players"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("null_north_matches.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_role: Mapped[str] = mapped_column(String(24), default="AUTO", nullable=False)  # AUTO | CARTOGRAPHER | SEER | DECODER | ARCHITECT
    secondary_role: Mapped[Optional[str]] = mapped_column(String(24), nullable=True)
    energy: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    hp: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    current_room_id: Mapped[str] = mapped_column(String(24), default="R0", nullable=False)
    is_ready: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    player_status: Mapped[str] = mapped_column(String(24), default="active", nullable=False)  # active | extracted | incapacitated | disconnected
    actions_taken: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    match: Mapped["NullNorthMatch"] = relationship("NullNorthMatch", back_populates="players")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        UniqueConstraint("match_id", "user_id", name="uq_null_north_match_user"),
        Index("idx_null_north_players_match_user", "match_id", "user_id"),
    )


class NullNorthWorldState(Base):
    __tablename__ = "null_north_world_states"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("null_north_matches.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    state_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current_tick: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    world_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    match: Mapped["NullNorthMatch"] = relationship("NullNorthMatch", back_populates="world_state")


class NullNorthAction(Base):
    __tablename__ = "null_north_actions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("null_north_matches.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(String(32), nullable=False)
    action_payload: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    tick: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="accepted", nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class NullNorthEvent(Base):
    __tablename__ = "null_north_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("null_north_matches.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)
    event_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    tick: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class NullNorthStatistics(Base):
    __tablename__ = "null_north_statistics"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    matches_played: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    victories: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    defeats: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    puzzles_solved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rooms_explored: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    xp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_escape_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])




