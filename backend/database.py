import os

from sqlalchemy import create_engine
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