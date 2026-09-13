# 📁 config.py
# Configuration settings for ChatTornado backend

import os
from typing import Optional, List
from dataclasses import dataclass, field
from functools import lru_cache

# ============================================================================
# Environment Variables
# ============================================================================

@dataclass
class Settings:
    """Application settings loaded from environment variables"""
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/chattornado"
    )
    
    # Redis
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL", None)
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # CORS
    CORS_ORIGINS: List[str] = field(
        default_factory=lambda: [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",") if o.strip()]
    )
    
    # File Upload
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "uploads"))
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", str(25 * 1024 * 1024)))  # 25 MB
    MAX_CHUNK_SIZE: int = int(os.getenv("MAX_CHUNK_SIZE", str(5 * 1024 * 1024)))  # 5 MB
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_USE_REDIS: bool = os.getenv("RATE_LIMIT_USE_REDIS", "false").lower() == "true"
    
    # Email
    EMAIL_PROVIDER: str = os.getenv("EMAIL_PROVIDER", "smtp")  # smtp, sendgrid, ses
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: Optional[str] = os.getenv("SMTP_USERNAME", None)
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD", None)
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    SENDGRID_API_KEY: Optional[str] = os.getenv("SENDGRID_API_KEY", None)
    
    # Application
    APP_NAME: str = "ChatTornado"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = int(os.getenv("WS_HEARTBEAT_INTERVAL", "30"))
    WS_CONNECTION_TIMEOUT: int = int(os.getenv("WS_CONNECTION_TIMEOUT", "300"))


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# ============================================================================
# Global Settings Instance
# ============================================================================

settings = get_settings()
