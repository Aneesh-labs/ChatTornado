"""
VORTEX Group Memory Vault Endpoints (Isolated Private Group Intelligence)
Zero-knowledge encrypted shared group knowledge repository.
Enforces strict group isolation so group data never leaks into personal user vaults.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

from database import get_db
from models import VortexGroupVaultRecord, GroupMember, User
from auth import decode_token

router = APIRouter(prefix="/api/vortex/group-vault", tags=["VORTEX Group Memory Vault"])


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


class GroupVaultRecordSchema(BaseModel):
    id: str = Field(..., max_length=64)
    group_id: int
    category: str = Field("guideline", max_length=50)
    encrypted_payload: str
    iv: str = Field(..., max_length=64)
    salt: str = Field(..., max_length=64)
    version: int = 1
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class GroupVaultSyncRequest(BaseModel):
    group_id: int
    records: List[GroupVaultRecordSchema]


def _check_group_membership(db: Session, group_id: int, user_id: int, require_admin: bool = False) -> GroupMember:
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Access denied: You are not a member of this group.")
    if require_admin and member.role not in ("OWNER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Admin permissions required for this action.")
    return member


@router.get("/{group_id}")
async def get_group_vault_records(
    group_id: int,
    category: Optional[str] = Query(None, description="Optional category filter"),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Retrieve all zero-knowledge encrypted records for the specified group."""
    _check_group_membership(db, group_id, user_id)
    
    query = db.query(VortexGroupVaultRecord).filter(VortexGroupVaultRecord.group_id == group_id)
    if category:
        query = query.filter(VortexGroupVaultRecord.category == category)
        
    records = query.order_by(VortexGroupVaultRecord.updated_at.desc()).all()
    return {
        "group_id": group_id,
        "count": len(records),
        "records": [
            {
                "id": r.id,
                "group_id": r.group_id,
                "category": r.category,
                "encrypted_payload": r.encrypted_payload,
                "iv": r.iv,
                "salt": r.salt,
                "created_by": r.created_by,
                "version": r.version,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None
            }
            for r in records
        ]
    }


@router.post("/sync")
async def sync_group_vault_records(
    req: GroupVaultSyncRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Sync encrypted group records from client to backend."""
    _check_group_membership(db, req.group_id, user_id)

    upserted_count = 0
    now = datetime.utcnow()

    for item in req.records:
        existing = db.query(VortexGroupVaultRecord).filter(
            VortexGroupVaultRecord.id == item.id,
            VortexGroupVaultRecord.group_id == req.group_id
        ).first()

        if existing:
            existing.category = item.category
            existing.encrypted_payload = item.encrypted_payload
            existing.iv = item.iv
            existing.salt = item.salt
            existing.version = item.version
            existing.updated_at = now
        else:
            new_rec = VortexGroupVaultRecord(
                id=item.id,
                group_id=req.group_id,
                category=item.category,
                encrypted_payload=item.encrypted_payload,
                iv=item.iv,
                salt=item.salt,
                created_by=user_id,
                version=item.version,
                created_at=now,
                updated_at=now
            )
            db.add(new_rec)
        upserted_count += 1

    db.commit()
    return {"status": "success", "group_id": req.group_id, "upserted": upserted_count}


@router.delete("/record/{group_id}/{record_id}")
async def delete_group_vault_record(
    group_id: int,
    record_id: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete a specific record from the group memory vault."""
    member = _check_group_membership(db, group_id, user_id)

    rec = db.query(VortexGroupVaultRecord).filter(
        VortexGroupVaultRecord.id == record_id,
        VortexGroupVaultRecord.group_id == group_id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Group record not found.")

    # Only creator or admin/owner can delete
    if rec.created_by != user_id and member.role not in ("OWNER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only the record creator or a group admin can delete this memory.")

    db.delete(rec)
    db.commit()
    return {"status": "deleted", "record_id": record_id}


@router.delete("/purge/{group_id}")
async def purge_group_vault(
    group_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Purge all records in a group memory vault upon admin consensus."""
    _check_group_membership(db, group_id, user_id, require_admin=True)

    deleted_count = db.query(VortexGroupVaultRecord).filter(
        VortexGroupVaultRecord.group_id == group_id
    ).delete(synchronize_session=False)

    db.commit()
    return {"status": "purged", "group_id": group_id, "deleted_count": deleted_count}
