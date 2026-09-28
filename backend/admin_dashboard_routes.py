import time
import os
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from auth import decode_token
from database import get_db
from models import (
    User, Message, Group, GroupMember, Report,
    ModerationCase, ModerationAction, Announcement,
    AnnouncementRead, LoginHistory, AdminAuditLog
)
from websocket_manager import manager

router = APIRouter(prefix="/api/admin", tags=["admin_dashboard"])

SERVER_START_TIME = time.time()


# ── Strict RBAC Dependency ──────────────────────────────────────────────────
def require_super_admin(
    token: str = Query(...),
    db: Session = Depends(get_db)
) -> User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")

    uid = payload.get("user_id")
    if not uid:
        raise HTTPException(status_code=401, detail="Token missing user identity.")

    admin = db.query(User).filter(User.id == int(uid)).first()
    if not admin or admin.role != "SUPER_ADMIN":
        # Don't leak admin path presence to unauthorized callers
        raise HTTPException(status_code=403, detail="Access denied. Insufficient administrative privileges.")

    return admin


def log_admin_action(
    db: Session,
    admin_id: int,
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None
):
    try:
        audit = AdminAuditLog(
            admin_id=admin_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details,
            ip_address=ip_address,
            created_at=datetime.utcnow()
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[AUDIT LOG ERROR] {e}")


# ── Models for Requests ─────────────────────────────────────────────────────

class CreateAnnouncementRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    category: str = Field("General", max_length=50)
    expires_in_hours: Optional[int] = None


class UserRestrictionRequest(BaseModel):
    action: str = Field(..., description="restrict, lift, or permaban")
    reason: Optional[str] = Field(None, max_length=1000)
    duration_hours: Optional[int] = Field(48, description="Hours for temporary restriction")


class CaseActionRequest(BaseModel):
    action: str = Field(..., description="confirm, dismiss, extend, or permaban")
    reason: Optional[str] = Field(None, max_length=1000)
    duration_hours: Optional[int] = Field(48)


# ── System Stats ────────────────────────────────────────────────────────────

@router.get("/stats")
def get_admin_stats(
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)

    # 1. Users
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.account_status == "active").count()
    restricted_users = db.query(User).filter(
        User.account_status == "restricted",
        (User.restricted_until == None) | (User.restricted_until > now)
    ).count()
    banned_users = db.query(User).filter(User.account_status == "permanently_blocked").count()
    online_count = len(manager.active_connections)

    # New users over last 30 days
    new_users_month = db.query(User).filter(User.created_at >= month_start).count()

    # 2. Messaging
    total_messages = db.query(Message).count()
    messages_today = db.query(Message).filter(Message.created_at >= today_start).count()
    messages_week = db.query(Message).filter(Message.created_at >= week_start).count()
    messages_month = db.query(Message).filter(Message.created_at >= month_start).count()
    group_messages = db.query(Message).filter(Message.group_id != None).count()
    direct_messages = total_messages - group_messages

    # 3. Groups
    total_groups = db.query(Group).count()
    group_members_count = db.query(GroupMember).count()

    # Largest groups
    top_groups = db.query(
        Group.id, Group.name, func.count(GroupMember.id).label("members_count")
    ).join(GroupMember, Group.id == GroupMember.group_id).group_by(Group.id).order_by(desc("members_count")).limit(5).all()

    # 4. Media
    upload_dir = os.getenv("UPLOAD_DIR", "uploads")
    total_media_files = 0
    total_media_bytes = 0
    if os.path.exists(upload_dir):
        for root, dirs, files in os.walk(upload_dir):
            for f in files:
                total_media_files += 1
                try:
                    total_media_bytes += os.path.getsize(os.path.join(root, f))
                except Exception:
                    pass

    # 5. Moderation
    total_reports = db.query(Report).count()
    pending_reports = db.query(Report).filter(Report.status == "pending").count()
    ai_classified = db.query(ModerationCase).count()
    auto_restrictions = db.query(ModerationCase).filter(ModerationCase.auto_restricted == True).count()
    confirmed_actions = db.query(ModerationAction).count()

    # 6. System
    uptime_seconds = int(time.time() - SERVER_START_TIME)

    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "restricted": restricted_users,
            "permanently_blocked": banned_users,
            "currently_online": online_count,
            "new_last_30_days": new_users_month
        },
        "messaging": {
            "total": total_messages,
            "today": messages_today,
            "this_week": messages_week,
            "this_month": messages_month,
            "group_messages": group_messages,
            "direct_messages": direct_messages
        },
        "groups": {
            "total": total_groups,
            "total_memberships": group_members_count,
            "top_groups": [
                {"id": tg[0], "name": tg[1], "member_count": tg[2]}
                for tg in top_groups
            ]
        },
        "media": {
            "total_files": total_media_files,
            "total_storage_mb": round(total_media_bytes / (1024 * 1024), 2)
        },
        "moderation": {
            "total_reports": total_reports,
            "pending_reports": pending_reports,
            "ai_classified_cases": ai_classified,
            "auto_restrictions": auto_restrictions,
            "confirmed_actions": confirmed_actions
        },
        "system": {
            "active_websockets": online_count,
            "server_uptime_seconds": uptime_seconds,
            "database_status": "healthy"
        }
    }


# ── User Management ─────────────────────────────────────────────────────────

@router.get("/users")
def get_admin_users(
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(User.username.ilike(s), User.email.ilike(s)))

    total = query.count()
    users = query.order_by(User.id.desc()).offset(offset).limit(limit).all()

    now = datetime.utcnow()
    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "status": u.status,
                "account_status": u.account_status,
                "is_restricted": u.account_status == "restricted" and (u.restricted_until is None or u.restricted_until > now),
                "restricted_until": u.restricted_until.isoformat() if u.restricted_until else None,
                "restriction_reason": u.restriction_reason,
                "custom_status": u.custom_status,
                "last_seen": u.last_seen.isoformat() if u.last_seen else None,
                "last_login": u.last_login.isoformat() if u.last_login else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ]
    }


@router.post("/users/{target_user_id}/action")
def take_user_action(
    target_user_id: int,
    payload: UserRestrictionRequest,
    request: Request,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    if target.role == "SUPER_ADMIN" or target.username == "BlackShadow-ChatTornado":
        raise HTTPException(status_code=400, detail="Cannot apply administrative restriction to a Super Admin.")

    action_type = payload.action.lower().strip()
    now = datetime.utcnow()
    duration = payload.duration_hours or 48

    if action_type == "restrict":
        target.account_status = "restricted"
        target.restricted_until = now + timedelta(hours=duration)
        target.restriction_reason = payload.reason or "Account temporarily restricted by administrator."
        log_action = "user_temporary_restriction"

    elif action_type == "permaban":
        target.account_status = "permanently_blocked"
        target.restricted_until = None
        target.restriction_reason = payload.reason or "Account permanently blocked by administrator for severe terms violation."
        log_action = "user_permanent_block"

    elif action_type == "lift":
        target.account_status = "active"
        target.restricted_until = None
        target.restriction_reason = None
        log_action = "user_restriction_lifted"

    else:
        raise HTTPException(status_code=400, detail="Action must be 'restrict', 'permaban', or 'lift'.")

    # Record action
    mod_action = ModerationAction(
        admin_id=admin.id,
        target_user_id=target.id,
        action_type=log_action,
        reason=payload.reason,
        duration_hours=duration if action_type == "restrict" else None,
        created_at=now
    )
    db.add(mod_action)
    db.commit()

    log_admin_action(
        db=db,
        admin_id=admin.id,
        action=log_action,
        target_type="user",
        target_id=target.id,
        details={"reason": payload.reason, "duration_hours": duration},
        ip_address=request.client.host if request.client else None
    )

    return {
        "status": "success",
        "action": log_action,
        "account_status": target.account_status,
        "restricted_until": target.restricted_until.isoformat() if target.restricted_until else None
    }


# ── Moderation Cases ────────────────────────────────────────────────────────

@router.get("/moderation/cases")
def get_moderation_cases(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    query = db.query(ModerationCase)
    if status:
        query = query.filter(ModerationCase.status == status)

    total = query.count()
    cases = query.order_by(ModerationCase.created_at.desc()).offset(offset).limit(limit).all()

    results = []
    for c in cases:
        reported_u = db.query(User).filter(User.id == c.user_id).first()
        report = db.query(Report).filter(Report.id == c.report_id).first()
        reporter = db.query(User).filter(User.id == report.reporter_id).first() if report else None
        evidence_msg = db.query(Message).filter(Message.id == report.message_id).first() if (report and report.message_id) else None

        results.append({
            "id": c.id,
            "report_id": c.report_id,
            "user_id": c.user_id,
            "username": reported_u.username if reported_u else "Unknown",
            "reporter_username": reporter.username if reporter else "Anonymous",
            "category": report.reason_category if report else "General",
            "description": report.description if report else None,
            "evidence_text": evidence_msg.message if evidence_msg else None,
            "ai_severity": c.ai_severity,
            "ai_category": c.ai_category,
            "ai_confidence": c.ai_confidence,
            "ai_explanation": c.ai_explanation,
            "auto_restricted": c.auto_restricted,
            "restricted_until": c.restricted_until.isoformat() if c.restricted_until else None,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None
        })

    return {"total": total, "cases": results}


@router.post("/moderation/cases/{case_id}/action")
def act_on_moderation_case(
    case_id: int,
    payload: CaseActionRequest,
    request: Request,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    case = db.query(ModerationCase).filter(ModerationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Moderation case not found.")

    target = db.query(User).filter(User.id == case.user_id).first()
    now = datetime.utcnow()
    action = payload.action.lower().strip()

    if action == "confirm":
        # Confirm restriction or apply default 48h
        case.status = "confirmed"
        if target:
            target.account_status = "restricted"
            target.restricted_until = now + timedelta(hours=payload.duration_hours or 48)
            target.restriction_reason = payload.reason or f"Violation confirmed: {case.ai_explanation}"

    elif action == "extend":
        case.status = "extended"
        if target:
            target.account_status = "restricted"
            target.restricted_until = now + timedelta(hours=payload.duration_hours or 168)  # 7 days
            target.restriction_reason = payload.reason or "Restriction extended following safety review."

    elif action == "permaban":
        case.status = "permabanned"
        if target:
            target.account_status = "permanently_blocked"
            target.restricted_until = None
            target.restriction_reason = payload.reason or "Account permanently banned by administrator."

    elif action == "dismiss":
        case.status = "rejected"
        if target and target.account_status == "restricted":
            target.account_status = "active"
            target.restricted_until = None
            target.restriction_reason = None

    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use confirm, extend, permaban, or dismiss.")

    # Update associated report
    report = db.query(Report).filter(Report.id == case.report_id).first()
    if report:
        report.status = "action_taken" if action != "dismiss" else "dismissed"

    case.updated_at = now
    db.commit()

    # Log action
    if target:
        db.add(ModerationAction(
            case_id=case.id,
            admin_id=admin.id,
            target_user_id=target.id,
            action_type=action,
            reason=payload.reason,
            duration_hours=payload.duration_hours,
            created_at=now
        ))
        db.commit()

    log_admin_action(
        db=db,
        admin_id=admin.id,
        action=f"moderation_case_{action}",
        target_type="moderation_case",
        target_id=case.id,
        details={"user_id": case.user_id, "action": action, "reason": payload.reason},
        ip_address=request.client.host if request.client else None
    )

    return {"status": "success", "case_status": case.status}


# ── Official Announcements ──────────────────────────────────────────────────

@router.get("/announcements")
def list_admin_announcements(
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    announcements = db.query(Announcement).order_by(Announcement.created_at.desc()).all()
    results = []
    for a in announcements:
        read_count = db.query(AnnouncementRead).filter(AnnouncementRead.announcement_id == a.id).count()
        results.append({
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "category": a.category,
            "is_active": a.is_active,
            "read_count": read_count,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "expires_at": a.expires_at.isoformat() if a.expires_at else None
        })
    return results


@router.post("/announcements")
async def create_official_announcement(
    payload: CreateAnnouncementRequest,
    request: Request,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=payload.expires_in_hours) if payload.expires_in_hours else None

    new_announcement = Announcement(
        title=payload.title.strip(),
        content=payload.content.strip(),
        category=payload.category.strip() or "General",
        is_active=True,
        created_by=admin.id,
        created_at=now,
        expires_at=expires_at
    )
    db.add(new_announcement)
    db.commit()
    db.refresh(new_announcement)

    # Broadcast via WebSocket to all connected clients
    broadcast_packet = {
        "type": "announcement",
        "data": {
            "id": new_announcement.id,
            "title": new_announcement.title,
            "content": new_announcement.content,
            "category": new_announcement.category,
            "created_at": new_announcement.created_at.isoformat(),
            "expires_at": new_announcement.expires_at.isoformat() if new_announcement.expires_at else None
        }
    }

    for user_id in list(manager.active_connections.keys()):
        try:
            await manager.send_personal_message(int(user_id), broadcast_packet)
        except Exception:
            pass

    log_admin_action(
        db=db,
        admin_id=admin.id,
        action="announcement_created",
        target_type="announcement",
        target_id=new_announcement.id,
        details={"title": new_announcement.title, "category": new_announcement.category},
        ip_address=request.client.host if request.client else None
    )

    return {
        "status": "success",
        "announcement": {
            "id": new_announcement.id,
            "title": new_announcement.title,
            "category": new_announcement.category,
            "created_at": new_announcement.created_at.isoformat()
        }
    }


@router.delete("/announcements/{announcement_id}")
def delete_official_announcement(
    announcement_id: int,
    request: Request,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found.")

    db.delete(announcement)
    db.commit()

    log_admin_action(
        db=db,
        admin_id=admin.id,
        action="announcement_deleted",
        target_type="announcement",
        target_id=announcement_id,
        ip_address=request.client.host if request.client else None
    )

    return {"status": "success", "message": "Announcement removed."}


# ── Login History & Audit Logs ──────────────────────────────────────────────

@router.get("/logins")
def get_login_history(
    user_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    query = db.query(LoginHistory)
    if user_id:
        query = query.filter(LoginHistory.user_id == user_id)

    total = query.count()
    records = query.order_by(LoginHistory.created_at.desc()).offset(offset).limit(limit).all()

    results = []
    for r in records:
        u = db.query(User).filter(User.id == r.user_id).first()
        results.append({
            "id": r.id,
            "user_id": r.user_id,
            "username": u.username if u else "Unknown",
            "ip_address": r.ip_address,
            "user_agent": r.user_agent,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })

    return {"total": total, "records": results}


@router.get("/audit-logs")
def get_admin_audit_logs(
    limit: int = 50,
    offset: int = 0,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    total = db.query(AdminAuditLog).count()
    logs = db.query(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).offset(offset).limit(limit).all()

    results = []
    for l in logs:
        adm = db.query(User).filter(User.id == l.admin_id).first()
        results.append({
            "id": l.id,
            "admin_username": adm.username if adm else "Admin",
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "details": l.details,
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat() if l.created_at else None
        })

    return {"total": total, "logs": results}
