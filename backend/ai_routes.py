from fastapi import APIRouter, Depends, HTTPException, Query, Header, Body
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

import os
from auth import decode_token
from database import get_db
from models import User
from ai_service import (
    personalize_user_from_history,
    get_user_persona,
    ai_polish_text,
    ai_translate_text,
    ai_smart_replies,
    fetch_openrouter_models
)

router = APIRouter(prefix="/api/ai", tags=["AI & Personalization"])


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
class PolishRequest(BaseModel):
    text: str
    tone: Optional[str] = "professional"

class TranslateRequest(BaseModel):
    text: str
    target_language: Optional[str] = "English"

class SmartRepliesRequest(BaseModel):
    context: List[str]


@router.post("/personalize")
async def personalize_user(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Analyzes the user's last 30 messages across all chats and saves their personalized AI persona."""
    try:
        result = await personalize_user_from_history(user_id, db)
        return {
            "status": "success",
            "message": "AI profile personalized successfully from your recent chat history.",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/persona")
def get_persona(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Retrieve the current user's personalized AI persona."""
    persona = get_user_persona(user_id, db)
    return {
        "status": "success",
        "has_persona": bool(persona),
        "persona": persona
    }


@router.post("/polish")
async def polish_draft(
    req: PolishRequest,
    user_id: int = Depends(get_current_user_id)
):
    """Rewrites draft text in the requested tone."""
    if not req.text.strip():
        return {"polished": ""}
    polished = await ai_polish_text(req.text, req.tone or "professional")
    return {
        "status": "success",
        "original": req.text,
        "tone": req.tone,
        "polished": polished
    }


@router.post("/translate")
async def translate_message(
    req: TranslateRequest,
    user_id: int = Depends(get_current_user_id)
):
    """Translates a message to the target language."""
    if not req.text.strip():
        return {"translated": ""}
    translated = await ai_translate_text(req.text, req.target_language or "English")
    return {
        "status": "success",
        "original": req.text,
        "target_language": req.target_language,
        "translated": translated
    }


@router.post("/smart-replies")
async def smart_replies(
    req: SmartRepliesRequest,
    user_id: int = Depends(get_current_user_id)
):
    """Generates 3 contextual quick-reply chips."""
    replies = await ai_smart_replies(req.context)
    return {
        "status": "success",
        "replies": replies
    }


@router.get("/models/openrouter")
async def get_openrouter_models(refresh: bool = False):
    """
    Fetch dynamically available models from OpenRouter (GET /api/v1/models) with caching.
    Returns: { id, name, description, context_length, pricing, architecture, is_free }.
    """
    models = await fetch_openrouter_models(force_refresh=refresh)
    has_key = bool(os.getenv("OPENROUTER_API_KEY", "").strip())
    return {
        "status": "success",
        "provider": "openrouter",
        "has_api_key": has_key,
        "count": len(models),
        "models": models
    }


@router.get("/models")
async def get_all_ai_models(refresh: bool = False):
    """
    Fetch catalog of all available AI models across providers (Google Gemini & OpenRouter).
    """
    openrouter_models = await fetch_openrouter_models(force_refresh=refresh)
    return {
        "status": "success",
        "providers": {
            "google": {
                "name": "Google Gemini",
                "has_api_key": bool(os.getenv("GEMINI_API_KEY", "").strip()),
                "models": [
                    {
                        "id": "gemini-3.5-flash",
                        "name": "Gemini 3.5 Flash",
                        "provider": "Google",
                        "tag": "Default • Smart & Fast",
                        "badge": "Recommended",
                        "description": "Google's flagship multimodal model with integrated Google Search grounding and balanced conversational depth.",
                        "context_length": 1000000,
                        "pricing": {"is_free": True}
                    },
                    {
                        "id": "gemini-3.5-flash-lite",
                        "name": "Gemini 3.5 Flash Lite",
                        "provider": "Google",
                        "tag": "Instant Token Streaming",
                        "badge": "Lowest Latency",
                        "description": "Optimized for lightning-fast token generation and zero-lag dialogue.",
                        "context_length": 1000000,
                        "pricing": {"is_free": True}
                    },
                    {
                        "id": "gemini-3.1-pro-preview",
                        "name": "Gemini 3.1 Pro",
                        "provider": "Google",
                        "tag": "Deep Reasoning & Architecture",
                        "badge": "Deep Reasoning",
                        "description": "Google's most capable reasoning engine for intricate programming, mathematics, and structured payloads.",
                        "context_length": 2000000,
                        "pricing": {"is_free": True}
                    },
                    {
                        "id": "gemini-2.5-flash",
                        "name": "Gemini 2.5 Flash",
                        "provider": "Google",
                        "tag": "Battle-Tested Production",
                        "badge": "Ultra-Stable",
                        "description": "Proven long-running production standard known for robust consistency.",
                        "context_length": 1000000,
                        "pricing": {"is_free": True}
                    }
                ]
            },
            "openrouter": {
                "name": "OpenRouter",
                "has_api_key": bool(os.getenv("OPENROUTER_API_KEY", "").strip()),
                "count": len(openrouter_models),
                "models": openrouter_models
            }
        }
    }

