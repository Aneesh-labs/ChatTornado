from fastapi import APIRouter, Depends, HTTPException, Query, Header, Body
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

import os
from auth import decode_token
from database import get_db
from models import User, UserAIPersona
from ai_service import (
    personalize_user_from_history,
    get_user_persona,
    ai_polish_text,
    ai_translate_text,
    ai_smart_replies,
    fetch_openrouter_models,
    ai_arcade_companion,
    ai_arcade_mission,
    ai_arcade_tts,
    ai_arcade_emblem,
    create_live_ephemeral_token,
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

class AIChatRequest(BaseModel):
    prompt: str
    mode: Optional[str] = "DEFAULT"
    model: Optional[str] = None


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


class SavePersonaRequest(BaseModel):
    callsign: Optional[str] = None
    role: Optional[str] = None
    interests: Optional[str] = None
    ai_memory_consent: bool = True
    custom_instructions: Optional[str] = None


@router.post("/persona")
def save_user_persona(
    req: SavePersonaRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Save user's AI persona, preferred callsign, and memory consent preferences."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    parts = []
    if req.callsign and req.callsign.strip():
        parts.append(f"• Preferred Callsign: {req.callsign.strip()}")
    if req.role and req.role.strip():
        parts.append(f"• User Role: {req.role.strip()}")
    if req.interests and req.interests.strip():
        parts.append(f"• Interests: {req.interests.strip()}")

    consent_str = "Enabled" if req.ai_memory_consent else "Disabled (Stateless)"
    parts.append(f"• AI Memory Storage: {consent_str}")

    if req.custom_instructions and req.custom_instructions.strip():
        parts.append(f"• Preferences: {req.custom_instructions.strip()}")

    summary = "\n".join(parts) or "• New user on ChatTornado."

    record = db.query(UserAIPersona).filter(UserAIPersona.user_id == user_id).first()
    if not record:
        record = UserAIPersona(
            user_id=user_id,
            persona_summary=summary,
            message_count_analyzed=0,
            updated_at=now
        )
        db.add(record)
    else:
        record.persona_summary = summary
        record.updated_at = now

    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.onboarding_completed = True

    db.commit()
    db.refresh(record)
    return {
        "status": "success",
        "message": "AI profile saved successfully.",
        "persona": record.persona_summary,
        "ai_memory_consent": req.ai_memory_consent
    }


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


@router.post("/chat")
async def ai_chat_direct(
    req: AIChatRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Direct AI conversational analysis for assistants, debater, and plan summarizer."""
    from ai_service import process_user_message_to_bot
    reply = await process_user_message_to_bot(
        user_id=user_id,
        message_text=req.prompt,
        ai_mode=req.mode or "DEFAULT",
        db=db,
        ai_model=req.model
    )
    return {
        "status": "success",
        "reply": reply,
        "message": reply
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
                        "id": "gemini-3.8-flash",
                        "name": "Gemini 3.8 Flash",
                        "provider": "Google",
                        "tag": "Flagship • Ultra-Fast & Grounded",
                        "badge": "Recommended",
                        "description": "Google's newest high-speed multimodal reasoning model with real-time response generation.",
                        "context_length": 1000000,
                        "pricing": {"is_free": True}
                    },
                    {
                        "id": "gemini-3.5-flash",
                        "name": "Gemini 3.5 Flash",
                        "provider": "Google",
                        "tag": "Smart & Balanced",
                        "badge": "Popular",
                        "description": "Google's balanced multimodal model with fast reasoning and deep conversational depth.",
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


class ArcadeCompanionRequest(BaseModel):
    game_id: str
    prompt: str
    player_context: Optional[Dict[str, Any]] = None
    previous_interaction_id: Optional[str] = None


@router.post("/arcade-companion")
async def arcade_companion_endpoint(
    req: ArcadeCompanionRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Fully personalized Gemini 3.8 Flash Interactions companion for Arcade & AFTERSPACE."""
    return await ai_arcade_companion(
        user_id=user_id,
        db=db,
        game_id=req.game_id,
        prompt=req.prompt,
        player_context=req.player_context,
        previous_interaction_id=req.previous_interaction_id,
    )


@router.post("/live-token")
def live_ephemeral_token_endpoint(
    game_id: str = Query("subwaysurfers"),
    extended_thinking: bool = Query(False),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Mints a single-use Gemini 3.8 Live ephemeral auth token without exposing server API keys."""
    return create_live_ephemeral_token(
        user_id=user_id,
        db=db,
        game_id=game_id,
        extended_thinking=extended_thinking,
    )


class ArcadeMissionRequest(BaseModel):
    game_id: str = "auto"
    high_scores: Optional[Dict[str, Any]] = None
    player_context: Optional[Dict[str, Any]] = None


@router.post("/arcade-mission")
async def arcade_mission_endpoint(
    req: ArcadeMissionRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Structured Gemini 3.8 Flash mission card personalized to player history & high scores."""
    return await ai_arcade_mission(
        user_id=user_id,
        db=db,
        game_id=req.game_id,
        high_scores=req.high_scores,
        player_context=req.player_context,
    )


class ArcadeTtsRequest(BaseModel):
    text: str
    style: Optional[str] = "energetic yet concise"
    voice: Optional[str] = "Kore"


@router.post("/arcade-tts")
async def arcade_tts_endpoint(
    req: ArcadeTtsRequest,
    user_id: int = Depends(get_current_user_id),
):
    """Expressive speech generation via Gemini 3.8 Flash TTS with WAV audio output."""
    _ = user_id
    return await ai_arcade_tts(text=req.text, style=req.style or "energetic yet concise", voice=req.voice or "Kore")


class ArcadeEmblemRequest(BaseModel):
    game_id: str = "afterspace"
    achievement: str = "Master Run"
    callsign: Optional[str] = "Explorer"


@router.post("/arcade-emblem")
async def arcade_emblem_endpoint(
    req: ArcadeEmblemRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Generates a custom Arcade trophy/medallion icon via Gemini Nano Banana 2.1."""
    return await ai_arcade_emblem(
        user_id=user_id,
        db=db,
        game_id=req.game_id,
        achievement=req.achievement,
        callsign=req.callsign or "Explorer",
    )

