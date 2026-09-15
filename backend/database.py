import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# ============================================================================
# Database Configuration
# ============================================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:Aneesh@localhost:5432/chat_tornado"
)

# ============================================================================
# SQLAlchemy Base
# ============================================================================

class Base(DeclarativeBase):
    pass

# ============================================================================
# Database Engine
# ============================================================================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    future=True,
)

# ============================================================================
# Session Factory
# ============================================================================

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)

# ============================================================================
# Dependency
# ============================================================================

def get_db():
    """
    FastAPI dependency that provides a database session.
    """

    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()

# ============================================================================
# Migrations
# ============================================================================

def run_migrations():
    """
    Run idempotent migrations.
    """
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_hash VARCHAR(255);"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP WITH TIME ZONE;"))
        
        # Grandfather existing users
        conn.execute(text("UPDATE users SET email_verified = TRUE WHERE verification_token_hash IS NULL;"))
        
        conn.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_shielded BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS shield_mode VARCHAR(20);"))
        conn.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS unlock_at TIMESTAMP WITH TIME ZONE;"))
        conn.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("UPDATE connections SET status = 'accepted' WHERE status = 'accept';"))
        conn.execute(text("UPDATE connections SET status = 'declined' WHERE status = 'decline';"))
