"""VORTEX Zero-Knowledge Personal AI Encrypted Memory Vault API Routes.
Enforces zero-knowledge backend storage: only ciphertext, nonces, and salts are persisted.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import decode_token
from database import get_db
from models import VortexMemoryVaultRecord

router = APIRouter(prefix="/api/vortex/vault", tags=["VORTEX Memory Vault"])


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


# Schemas
class EncryptedRecordPayload(BaseModel):
    id: str
    category: str = Field(default="fact", description="preference, fact, project, instruction")
    encrypted_payload: str = Field(..., description="Base64 encoded ciphertext")
    iv: str = Field(..., description="Base64 12-byte initialization vector")
    salt: str = Field(..., description="Base64 salt used for PBKDF2 key derivation")
    version: int = 1


class VaultSyncRequest(BaseModel):
    records: List[EncryptedRecordPayload]


@router.get("")
def get_user_vault(
    category: Optional[str] = Query(None),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Retrieve user's zero-knowledge encrypted memory records."""
    query = db.query(VortexMemoryVaultRecord).filter(VortexMemoryVaultRecord.user_id == user_id)
    if category:
        query = query.filter(VortexMemoryVaultRecord.category == category)

    records = query.order_by(VortexMemoryVaultRecord.updated_at.desc()).all()
    return {
        "status": "success",
        "count": len(records),
        "records": [
            {
                "id": r.id,
                "category": r.category,
                "encrypted_payload": r.encrypted_payload,
                "iv": r.iv,
                "salt": r.salt,
                "version": r.version,
                "created_at": r.created_at.isoformat(),
                "updated_at": r.updated_at.isoformat()
            }
            for r in records
        ]
    }


@router.post("/sync")
def sync_vault_records(
    payload: VaultSyncRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Upsert batch of independently encrypted memory records."""
    upserted_count = 0
    now = datetime.utcnow()

    for item in payload.records:
        existing = db.query(VortexMemoryVaultRecord).filter(
            VortexMemoryVaultRecord.id == item.id,
            VortexMemoryVaultRecord.user_id == user_id
        ).first()

        if existing:
            existing.encrypted_payload = item.encrypted_payload
            existing.iv = item.iv
            existing.salt = item.salt
            existing.category = item.category
            existing.version = item.version
            existing.updated_at = now
        else:
            new_record = VortexMemoryVaultRecord(
                id=item.id,
                user_id=user_id,
                category=item.category,
                encrypted_payload=item.encrypted_payload,
                iv=item.iv,
                salt=item.salt,
                version=item.version,
                created_at=now,
                updated_at=now
            )
            db.add(new_record)
        upserted_count += 1

    db.commit()
    return {
        "status": "success",
        "synced": upserted_count,
        "upserted": upserted_count,
        "message": f"Successfully synced {upserted_count} encrypted memory records."
    }


@router.delete("/record/{record_id}")
def delete_vault_record(
    record_id: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Permanently delete an encrypted memory item."""
    record = db.query(VortexMemoryVaultRecord).filter(
        VortexMemoryVaultRecord.id == record_id,
        VortexMemoryVaultRecord.user_id == user_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Memory record not found.")

    db.delete(record)
    db.commit()
    return {
        "status": "success",
        "message": f"Deleted encrypted memory record {record_id}."
    }


@router.delete("/purge")
def purge_vault(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Purge all user vault records (complete reset)."""
    deleted = db.query(VortexMemoryVaultRecord).filter(
        VortexMemoryVaultRecord.user_id == user_id
    ).delete(synchronize_session=False)
    db.commit()
    return {
        "status": "success",
        "purged_count": deleted,
        "message": "Vault successfully purged."
    }


@router.get("/export")
def export_vault(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Exports full encrypted vault bundle for offline backup/migration."""
    records = db.query(VortexMemoryVaultRecord).filter(
        VortexMemoryVaultRecord.user_id == user_id
    ).all()

    return {
        "format": "vortex_encrypted_vault_v1",
        "user_id": user_id,
        "exported_at": datetime.utcnow().isoformat(),
        "zero_knowledge": True,
        "encryption": "AES-256-GCM + PBKDF2-SHA256",
        "record_count": len(records),
        "records": [
            {
                "id": r.id,
                "category": r.category,
                "encrypted_payload": r.encrypted_payload,
                "iv": r.iv,
                "salt": r.salt,
                "version": r.version,
                "created_at": r.created_at.isoformat(),
                "updated_at": r.updated_at.isoformat()
            }
            for r in records
        ]
    }
