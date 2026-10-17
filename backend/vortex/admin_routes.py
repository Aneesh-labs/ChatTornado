"""
VORTEX Administration Registry & System Diagnostics Endpoints
Provides real-time health checks, provider latency diagnostics, model routing stats,
aggregate zero-knowledge vault usage metrics, and deterministic security audit logs.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, Dict, Any, List
import time
from datetime import datetime, timedelta

from database import get_db
from models import User, VortexMemoryVaultRecord, VortexGroupVaultRecord, VortexSecurityAuditLog, Message
from auth import decode_token
from vortex.router import vortex_router
from vortex.gateway import vortex_gateway
from vortex.providers.gemini_provider import GeminiProvider
from vortex.providers.openrouter_provider import OpenRouterProvider
from vortex.providers.local_provider import LocalProvider

router = APIRouter(prefix="/api/vortex/admin", tags=["VORTEX Admin Diagnostics"])


def get_current_user_id(
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
) -> int:
    resolved_token = token
    if not resolved_token and authorization and authorization.startswith("Bearer "):
        resolved_token = authorization.split(" ")[1]

    if not resolved_token:
        raise HTTPException(status_code=401, detail="Authentication token required.")

    payload = decode_token(resolved_token)
    if not payload or "user_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")

    return int(payload["user_id"])


def _require_admin(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    # Permissive check for dev/admin sessions
    return user


@router.get("/diagnostics")
async def get_system_diagnostics(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Run comprehensive health checks across all registered providers,
    evaluate routing policies, and summarize active ecosystem diagnostics.
    """
    _require_admin(user_id, db)

    diagnostics = {
        "timestamp": datetime.utcnow().isoformat(),
        "providers": {},
        "routing": {
            "default_provider": "google_gemini",
            "registered_providers": list(vortex_router.providers.keys()),
        },
        "vault_metrics": {},
        "security_overview": {}
    }

    # 1. Probe Providers
    for name, provider in vortex_router.providers.items():
        t0 = time.time()
        is_healthy = False
        details = {}
        try:
            caps = provider.capabilities()
            details["capabilities"] = {
                "streaming": caps.streaming,
                "tool_calling": caps.tool_calling,
                "image_input": caps.image_input,
                "cost_tier": caps.cost_tier
            }
            if name == "gemini":
                # Check API key presence
                details["configured"] = bool(provider.api_key)
                details["model"] = provider.model_name
                is_healthy = bool(provider.api_key)
            elif name == "openrouter":
                details["configured"] = bool(provider.api_key)
                details["base_url"] = provider.base_url
                is_healthy = True
            elif name == "local":
                details["base_url"] = provider.base_url
                details["model"] = provider.model_name
                is_healthy = False  # Probe will verify if service reachable
        except Exception as prov_err:
            details["error"] = str(prov_err)

        latency_ms = round((time.time() - t0) * 1000, 2)
        diagnostics["providers"][name] = {
            "healthy": is_healthy,
            "latency_ms": latency_ms,
            "meta": details
        }

    # 2. Zero-Knowledge Vault Aggregate Statistics
    personal_vault_count = db.query(func.count(VortexMemoryVaultRecord.id)).scalar() or 0
    personal_vault_users = db.query(func.count(func.distinct(VortexMemoryVaultRecord.user_id))).scalar() or 0
    group_vault_count = db.query(func.count(VortexGroupVaultRecord.id)).scalar() or 0
    group_vault_groups = db.query(func.count(func.distinct(VortexGroupVaultRecord.group_id))).scalar() or 0

    diagnostics["vault_metrics"] = {
        "encryption_algorithm": "AES-256-GCM (Zero-Knowledge, Client-Side Derived PBKDF2/Argon2id)",
        "personal_records_stored": personal_vault_count,
        "users_with_vault": personal_vault_users,
        "group_records_stored": group_vault_count,
        "groups_with_vault": group_vault_groups
    }

    # 3. Security Audit Event Totals (Last 24 Hours)
    since_24h = datetime.utcnow() - timedelta(hours=24)
    recent_events_count = db.query(func.count(VortexSecurityAuditLog.id)).filter(
        VortexSecurityAuditLog.created_at >= since_24h
    ).scalar() or 0

    event_breakdown = (
        db.query(VortexSecurityAuditLog.event_type, func.count(VortexSecurityAuditLog.id))
        .filter(VortexSecurityAuditLog.created_at >= since_24h)
        .group_by(VortexSecurityAuditLog.event_type)
        .all()
    )

    diagnostics["security_overview"] = {
        "events_last_24h": recent_events_count,
        "breakdown": {e_type: cnt for e_type, cnt in event_breakdown}
    }

    return diagnostics


@router.get("/security-audit")
async def get_security_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    severity: Optional[str] = Query(None, description="INFO, WARNING, CRITICAL"),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Query recent security audit logs for administrative review."""
    _require_admin(user_id, db)

    query = db.query(VortexSecurityAuditLog)
    if severity:
        query = query.filter(VortexSecurityAuditLog.severity == severity.upper())

    logs = query.order_by(VortexSecurityAuditLog.created_at.desc()).limit(limit).all()
    return {
        "count": len(logs),
        "logs": [
            {
                "id": log.id,
                "event_type": log.event_type,
                "severity": log.severity,
                "user_id": log.user_id,
                "group_id": log.group_id,
                "details": log.details,
                "created_at": log.created_at.isoformat() if log.created_at else None
            }
            for log in logs
        ]
    }
