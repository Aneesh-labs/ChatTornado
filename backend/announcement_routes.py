from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from auth import decode_token
from database import get_db
from models import Announcement, AnnouncementRead

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


def get_current_user_id(token: str) -> int:
    payload = decode_token(token)
    if not payload or not payload.get("user_id"):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return int(payload["user_id"])


@router.get("")
def get_active_announcements(
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(token)
    now = datetime.utcnow()

    announcements = db.query(Announcement).filter(
        Announcement.is_active == True,
        (Announcement.expires_at == None) | (Announcement.expires_at > now)
    ).order_by(Announcement.created_at.desc()).all()

    # Get reads for this user
    read_ids = {
        r.announcement_id for r in db.query(AnnouncementRead).filter(
            AnnouncementRead.user_id == user_id
        ).all()
    }

    results = []
    for a in announcements:
        results.append({
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "category": a.category,
            "is_read": a.id in read_ids,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "expires_at": a.expires_at.isoformat() if a.expires_at else None
        })

    return results


@router.post("/{announcement_id}/read")
def mark_announcement_as_read(
    announcement_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(token)

    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found.")

    existing = db.query(AnnouncementRead).filter(
        AnnouncementRead.announcement_id == announcement_id,
        AnnouncementRead.user_id == user_id
    ).first()

    if not existing:
        db.add(AnnouncementRead(
            announcement_id=announcement_id,
            user_id=user_id,
            read_at=datetime.utcnow()
        ))
        db.commit()

    return {"status": "success", "message": "Marked as read."}
