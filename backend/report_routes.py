from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta

from auth import decode_token
from database import get_db
from models import User, Report, ModerationCase, Message
from moderation_service import analyze_report_with_ai

router = APIRouter(prefix="/api/reports", tags=["reports"])

REPORT_CATEGORIES = [
    "Spam",
    "Harassment",
    "Threatening behavior",
    "Hate/abusive content",
    "Sexual content",
    "Impersonation",
    "Malicious links",
    "Other"
]


class SubmitReportRequest(BaseModel):
    reported_user_id: int
    reason_category: str = Field(..., description="Category from allowed list")
    description: Optional[str] = Field(None, max_length=2000)
    message_id: Optional[int] = None


def get_current_user_id(token: str) -> int:
    payload = decode_token(token)
    if not payload or not payload.get("user_id"):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return int(payload["user_id"])


@router.get("/categories")
def get_report_categories():
    return REPORT_CATEGORIES


@router.post("")
async def submit_report(
    payload: SubmitReportRequest,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    current_user_id = get_current_user_id(token)

    if current_user_id == payload.reported_user_id:
        raise HTTPException(status_code=400, detail="You cannot report yourself.")

    reported_user = db.query(User).filter(User.id == payload.reported_user_id).first()
    if not reported_user:
        raise HTTPException(status_code=404, detail="Reported user not found.")

    # Match category (case-insensitive fallback)
    matched_cat = next((c for c in REPORT_CATEGORIES if c.lower() == payload.reason_category.lower()), None)
    if not matched_cat:
        matched_cat = "Other"

    # Context message text if provided
    context_msg_text = None
    if payload.message_id:
        msg = db.query(Message).filter(Message.id == payload.message_id).first()
        if msg:
            context_msg_text = msg.message

    # 1. Create Report in DB
    new_report = Report(
        reporter_id=current_user_id,
        reported_user_id=payload.reported_user_id,
        reason_category=matched_cat,
        description=payload.description.strip() if payload.description else None,
        message_id=payload.message_id,
        status="pending",
        created_at=datetime.utcnow()
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    # 2. Run AI Moderation Analysis
    ai_result = await analyze_report_with_ai(
        reported_username=reported_user.username,
        category=matched_cat,
        description=payload.description,
        message_text=context_msg_text
    )

    auto_restrict = ai_result.get("auto_restrict", False)
    restricted_until = None

    if auto_restrict and reported_user.role != "SUPER_ADMIN":
        restricted_until = datetime.utcnow() + timedelta(hours=48)
        reported_user.account_status = "restricted"
        reported_user.restricted_until = restricted_until
        reported_user.restriction_reason = f"Automated safety restriction pending review: {ai_result.get('explanation')}"
        db.commit()

    # 3. Create Moderation Case
    mod_case = ModerationCase(
        report_id=new_report.id,
        user_id=reported_user.id,
        ai_severity=ai_result.get("severity", "medium"),
        ai_category=ai_result.get("category", matched_cat),
        ai_confidence=ai_result.get("confidence", 0.0),
        ai_explanation=ai_result.get("explanation"),
        auto_restricted=auto_restrict,
        restricted_until=restricted_until,
        status="pending",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(mod_case)
    db.commit()

    return {
        "status": "success",
        "message": "Thank you. Your report has been securely submitted and logged for safety review.",
        "report_id": new_report.id
    }
