import os
from datetime import datetime

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# ============================================================================
# Database Configuration
# ============================================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:Aneesh@localhost:5432/chat_tornado"
)
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


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
    pool_size=25,
    max_overflow=50,
    pool_timeout=30,
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
    Run idempotent migrations across PostgreSQL and SQLite.
    """
    from sqlalchemy import inspect
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        # 1. users table
        if "users" in tables:
            existing_cols = {c["name"] for c in inspector.get_columns("users")}
            user_cols_to_add = [
                ("email_verified", "BOOLEAN DEFAULT FALSE"),
                ("verification_token_hash", "VARCHAR(255)"),
                ("verification_token_expires_at", "TIMESTAMP"),
                ("role", "VARCHAR(20) DEFAULT 'USER'"),
                ("account_status", "VARCHAR(20) DEFAULT 'active'"),
                ("restricted_until", "TIMESTAMP"),
                ("restriction_reason", "TEXT"),
                ("custom_status", "VARCHAR(100)"),
            ]
            with engine.begin() as conn:
                for col_name, col_def in user_cols_to_add:
                    if col_name not in existing_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def};"))
                        except Exception as e:
                            print(f"[MIGRATION] Could not add {col_name} to users: {e}")

                try:
                    conn.execute(text("UPDATE users SET email_verified = TRUE WHERE verification_token_hash IS NULL;"))
                    conn.execute(text("UPDATE users SET role = 'USER' WHERE role IS NULL;"))
                    conn.execute(text("UPDATE users SET account_status = 'active' WHERE account_status IS NULL;"))
                except Exception:
                    pass

        # 2. messages table
        if "messages" in tables:
            existing_msg_cols = {c["name"] for c in inspector.get_columns("messages")}
            msg_cols_to_add = [
                ("is_shielded", "BOOLEAN DEFAULT FALSE"),
                ("shield_mode", "VARCHAR(20)"),
                ("unlock_at", "TIMESTAMP"),
                ("is_edited", "BOOLEAN DEFAULT FALSE"),
                ("group_id", "INTEGER"),
                ("client_temp_id", "VARCHAR(100)"),
                ("correlation_id", "VARCHAR(100)"),
            ]
            with engine.begin() as conn:
                for col_name, col_def in msg_cols_to_add:
                    if col_name not in existing_msg_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE messages ADD COLUMN {col_name} {col_def};"))
                        except Exception as e:
                            print(f"[MIGRATION] Could not add {col_name} to messages: {e}")

                if engine.dialect.name != "sqlite":
                    try:
                        conn.execute(text("ALTER TABLE messages ALTER COLUMN receiver_id DROP NOT NULL;"))
                    except Exception:
                        pass

        # 3. connections table updates
        if "connections" in tables:
            with engine.begin() as conn:
                try:
                    conn.execute(text("UPDATE connections SET status = 'accepted' WHERE status = 'accept';"))
                    conn.execute(text("UPDATE connections SET status = 'declined' WHERE status = 'decline';"))
                except Exception:
                    pass
    except Exception as exc:
        print(f"[MIGRATION WARNING] Error running migrations: {exc}")

    # Initialize official admin account
    init_super_admin()


def init_super_admin():
    """
    Ensure the protected BlackShadow-ChatTornado administrator account exists with role SUPER_ADMIN.
    Password is read from environment (ADMIN_INITIAL_PASSWORD or ADMIN_PASSWORD) or securely generated.
    Password is never hard-coded or leaked.
    """
    import secrets
    from auth import hash_password
    db = SessionLocal()
    try:
        from models import User
        admin_user = db.query(User).filter(User.username == "BlackShadow-ChatTornado").first()
        if not admin_user:
            initial_pw = os.getenv("ADMIN_INITIAL_PASSWORD") or os.getenv("ADMIN_PASSWORD")
            if not initial_pw or not initial_pw.strip():
                initial_pw = secrets.token_urlsafe(20)
                print(f"[SECURITY] Generated initial password for BlackShadow-ChatTornado. Set ADMIN_INITIAL_PASSWORD in env to override.")
            
            hashed_pw = hash_password(initial_pw.strip())
            admin_user = User(
                username="BlackShadow-ChatTornado",
                email="blackshadow@chattornado.internal",
                password=hashed_pw,
                role="SUPER_ADMIN",
                account_status="active",
                email_verified=True,
                status="offline",
                created_at=datetime.utcnow()
            )
            db.add(admin_user)
            db.commit()
            print("[SECURITY] Initialized official admin account: BlackShadow-ChatTornado (SUPER_ADMIN)")
        else:
            # Ensure role is set to SUPER_ADMIN
            if admin_user.role != "SUPER_ADMIN":
                admin_user.role = "SUPER_ADMIN"
                db.commit()
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to initialize official admin account: {e}")
    finally:
        db.close()
