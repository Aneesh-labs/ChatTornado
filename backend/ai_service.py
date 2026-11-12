import os
import re
import json
import uuid
import time
import asyncio
import base64
import logging
import mimetypes
import httpx
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import or_

from models import User, Message, MessageVisibility, UserAIPersona
from auth import hash_password

from prompts import (
    PROMPT_DEFAULT,
    PROMPT_FUNNY,
    PROMPT_ROAST,
    PROMPT_SERIOUS,
    PROMPT_CODING,
    PROMPT_RESEARCH,
    PROMPT_ADMIN,
    PROMPT_CLEANUP,
    PROMPT_SUMMARIZE,
    resolve_prompt_mode,
    VortexMode
)

from ai_cache import ai_cache, LocalMemoryManager
from diagnostics import (
    log_message_event,
    log_message_error,
    generate_correlation_id
)

logger = logging.getLogger("chat_tornado.ai_service")

BOT_USERNAME = "VORTEX-9"
BOT_EMAIL = "vortex9@system.bot"
BOT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg?seed=VORTEX9&backgroundColor=080b1e"

# Default fallback prompt alias
VORTEX_SYSTEM_PROMPT = PROMPT_DEFAULT


def generate_offline_smart_reply(prompt: str, mode: str = "DEFAULT") -> str:
    """Provides instant, polished, intelligent conversational responses even when cloud API is offline."""
    lower = prompt.lower().strip()
    if any(g in lower for g in ("hello", "hi", "hey", "sup", "greetings", "good morning", "good evening")):
        return (
            "✨ **Greetings! I am VORTEX-9**, your integrated AI co-pilot on ChatTornado.\n\n"
            "I'm operating smoothly in high-speed mode. Here is what I can assist with:\n\n"
            "• **Code Review & Debugging**: Ask me to write, explain, or fix Python, JS/TS, Go, or Rust.\n"
            "• **Thread Summarization**: Use `/summarize` in any chat to condense message threads.\n"
            "• **Deep Web Research**: In Research mode, I decompose queries and synthesize web intelligence.\n"
            "• **Platform Assistance**: Ask about Reality Forks, Encrypted Vaults, or In-Chat Arcade Games!\n\n"
            "> *Tip: Add `GEMINI_API_KEY` to `backend/.env` for real-time web search and live cloud reasoning.*"
        )
    if any(k in lower for k in ("code", "python", "javascript", "react", "fastapi", "rust", "golang", "function", "class", "algorithm", "debug")):
        return (
            "💻 **VORTEX-9 Code Assistant**\n\n"
            "Here is a clean implementation pattern for your task:\n\n"
            "```python\n"
            "# ChatTornado High-Speed Microservice Pattern\n"
            "async def handle_stream(packet: dict):\n"
            "    correlation_id = packet.get('correlation_id')\n"
            "    return {'status': 'processed', 'id': correlation_id}\n"
            "```\n\n"
            "What language or architecture pattern would you like me to tailor next?"
        )
    if any(k in lower for k in ("feature", "help", "what can you do", "who are you", "guide")):
        return (
            "🌪️ **ChatTornado Platform Overview**\n\n"
            "ChatTornado is a high-performance polyglot messaging platform built with:\n"
            "• **FastAPI & Python**: Decoupled REST services, SQLAlchemy models, and security pipelines.\n"
            "• **Go Realtime Engine**: Goroutine-powered sub-millisecond WebSocket relay & WebRTC signaling.\n"
            "• **Rust Accelerator**: Hardware-accelerated vector cosine similarity & wire-speed cryptographic hashing.\n"
            "• **React 19 & Tailwind**: Fluid mobile UI, in-chat arcade games, and WebRTC HD audio/video calls.\n\n"
            "How can I assist your session today?"
        )
    return (
        f"🤖 **VORTEX-9 Neural Assistant**\n\n"
        f"I've received your query: *\"{prompt.strip()}\"*\n\n"
        f"I am actively monitoring the platform session. To enable live multimodal cloud reasoning and deep web search, "
        f"simply configure your free `GEMINI_API_KEY` in `backend/.env`. In the meantime, I am available for platform queries, "
        f"system commands, and offline assistance!"
    )

# Active high-performance Gemini models with robust fallback
RECOMMENDED_GEMINI_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
]

_LAST_WORKING_GEMINI_MODEL: Optional[str] = None
_UNAVAILABLE_GEMINI_MODELS: set = set()


def normalize_gemini_model(model_name: Optional[str]) -> Optional[str]:
    """Upgrades legacy or deprecated Gemini model names to current flagship equivalents."""
    if not model_name or not isinstance(model_name, str):
        return model_name
    raw = model_name.strip()
    if not raw or "/" in raw:
        return raw  # Preserve OpenRouter provider/model slugs
    lower = raw.lower()
    if lower in ("gemini-3.1-flash-live-preview", "gemini-2.5-flash-live", "gemini-live-2.5-flash-preview"):
        return "gemini-3.8-live"
    if any(lower.startswith(prefix) for prefix in ("gemini-2.5-", "gemini-2.0-", "gemini-1.5-", "gemini-1.0-")):
        return "gemini-3.8-flash"
    return raw


def extract_chunk_text(chunk: Any) -> str:
    """Safely extracts text string from a Gemini stream chunk without throwing ValueError on thought/tool parts."""
    if not chunk:
        return ""
    try:
        if getattr(chunk, "text", None):
            return str(chunk.text)
    except Exception:
        pass

    try:
        candidates = getattr(chunk, "candidates", None) or []
        if candidates:
            content = getattr(candidates[0], "content", None)
            if content:
                parts = getattr(content, "parts", None) or []
                collected = []
                for p in parts:
                    txt = getattr(p, "text", None)
                    if txt:
                        collected.append(str(txt))
                if collected:
                    return "".join(collected)
    except Exception:
        pass
    return ""


def get_or_create_bot_user(db: Session) -> User:
    """Ensure the VORTEX-9 bot user exists permanently in the database."""
    bot = db.query(User).filter(
        or_(User.email == BOT_EMAIL, User.username == BOT_USERNAME)
    ).first()

    if not bot:
        # Check if user 7 is named ChatGPT and rename it cleanly
        u7 = db.query(User).filter(User.id == 7).first()
        if u7 and u7.username.lower() in ("chatgpt", "gpt"):
            u7.username = BOT_USERNAME
            u7.email = BOT_EMAIL
            u7.status = "online"
            u7.avatar_url = BOT_AVATAR
            db.commit()
            db.refresh(u7)
            logger.info("Migrated legacy bot user #7 to %s", BOT_USERNAME)
            return u7

        # Otherwise create fresh dedicated bot user
        bot = User(
            username=BOT_USERNAME,
            email=BOT_EMAIL,
            password=hash_password(str(uuid.uuid4())),
            email_verified=True,
            avatar_url=BOT_AVATAR,
            status="online"
        )
        db.add(bot)
        db.commit()
        db.refresh(bot)
        logger.info("Created permanent bot user %s (id=%s)", BOT_USERNAME, bot.id)
    else:
        # Guarantee online status and username
        updated = False
        if bot.status != "online":
            bot.status = "online"
            updated = True
        if bot.username != BOT_USERNAME:
            bot.username = BOT_USERNAME
            updated = True
        if not bot.avatar_url:
            bot.avatar_url = BOT_AVATAR
            updated = True
        if updated:
            db.commit()
            db.refresh(bot)

    return bot


def is_image_request(text: str) -> Tuple[bool, str]:
    """Check if the user prompt is an image generation request and extract the prompt."""
    if not text or not isinstance(text, str):
        return False, ""

    cleaned = text.strip()
    lower = cleaned.lower()

    # Direct slash commands
    for prefix in ("/image", "/imagine", "/img", "!image", "!imagine"):
        if lower.startswith(prefix):
            raw_prompt = cleaned[len(prefix):].strip().lstrip(":").strip()
            prompt = re.sub(r'^(?:of|for|about)\s+(?:a|an|the)?\s*', '', raw_prompt, flags=re.IGNORECASE).strip() or raw_prompt
            return True, prompt

    # Natural language phrasing
    triggers = [
        "generate an image of",
        "generate an image for",
        "generate a picture of",
        "generate a photo of",
        "generate an art of",
        "generate image of",
        "generate image for",
        "generate photo of",
        "create an image of",
        "create an image for",
        "create a picture of",
        "create a photo of",
        "create image of",
        "create image for",
        "draw an image of",
        "draw a picture of",
        "paint an image of",
        "render an image of",
        "render a picture of",
        "make an image of",
        "make an image for",
        "make a picture of",
        "can you generate an image of",
        "can you create an image of",
        "can you draw me a",
        "can you draw me an",
        "can you draw me",
        "can you draw a",
        "can you draw an",
        "can you draw",
        "draw me a",
        "draw me an",
        "draw me",
        "paint me a",
        "paint me an",
        "draw ",
        "paint ",
        "illustrate ",
    ]
    for trig in triggers:
        if lower.startswith(trig):
            raw_prompt = cleaned[len(trig):].strip().rstrip(".!?")
            prompt = re.sub(r'^(?:of|for|about)\s+(?:a|an|the)?\s*', '', raw_prompt, flags=re.IGNORECASE).strip() or raw_prompt
            if len(prompt) > 1:
                return True, prompt

    return False, cleaned


from datetime import datetime, timezone, timedelta

async def fetch_live_web_search(query: str) -> List[Dict[str, str]]:
    """Live web search extraction using DuckDuckGo."""
    import httpx
    import urllib.parse
    results = []
    try:
        data = urllib.parse.urlencode({'q': query}).encode('utf-8')
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as http_c:
            resp = await http_c.post('https://html.duckduckgo.com/html/', content=data, headers=headers)
            if resp.status_code == 200:
                html = resp.text
                titles = re.findall(r'<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html, re.DOTALL)
                snippets = re.findall(r'<a[^>]+class="result__snippet"[^>]*>(.*?)</a>', html, re.DOTALL)
                for i in range(min(len(titles), len(snippets), 5)):
                    raw_url, title_raw = titles[i]
                    actual_url = raw_url
                    if "uddg=" in raw_url:
                        u_m = re.search(r'uddg=([^&]+)', raw_url)
                        if u_m:
                            actual_url = urllib.parse.unquote(u_m.group(1))
                    title = re.sub(r'<[^>]+>', '', title_raw).strip()
                    snippet = re.sub(r'<[^>]+>', '', snippets[i]).strip()
                    results.append({"title": title, "url": actual_url, "snippet": snippet})
    except Exception as e:
        print(f"[AI_SERVICE] Live web search error: {e}", flush=True)
    return results


async def extract_multimodal_image_parts(prompt_text: str) -> Tuple[str, List[Any]]:
    """
    Extracts images from local /uploads/, base64 data URIs, or full URLs,
    converts them into Google GenAI binary types.Part objects, and returns cleaned prompt.
    """
    from google.genai import types
    
    clean_text = prompt_text
    image_parts = []
    upload_base = Path(os.getenv("UPLOAD_DIR", Path(__file__).parent / "uploads"))
    
    # 1. Base64 Data URIs: data:image/(png|jpeg|webp|gif);base64,...
    b64_matches = list(re.finditer(r'data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)', clean_text))
    for m in b64_matches:
        try:
            mime = f"image/{m.group(1)}"
            b64_str = m.group(2)
            img_bytes = base64.b64decode(b64_str)
            image_parts.append(types.Part.from_bytes(data=img_bytes, mime_type=mime))
            clean_text = clean_text.replace(m.group(0), "")
        except Exception as e:
            logger.warning("Failed to decode base64 image: %s", e)

    # 2. Local uploads: /uploads/... or http(s)://.../uploads/...
    upload_matches = list(re.finditer(r'(?:https?:\/\/[^\s<>"\'\)]+)?\/uploads\/([^\s<>"\'\)]+\.(?:png|jpg|jpeg|gif|webp))', clean_text, re.IGNORECASE))
    for match in upload_matches:
        try:
            rel_path = match.group(1)
            full_path = upload_base / rel_path
            if full_path.exists():
                mime, _ = mimetypes.guess_type(str(full_path))
                mime = mime or "image/png"
                with open(full_path, "rb") as f:
                    image_parts.append(types.Part.from_bytes(data=f.read(), mime_type=mime))
                clean_text = clean_text.replace(match.group(0), "")
        except Exception as e:
            logger.warning("Failed to read local image %s: %s", match.group(0), e)

    # 3. Clean up artifact strings
    clean_text = re.sub(r'\[Image Attached\]', '', clean_text)
    clean_text = re.sub(r'📎\s*[^\n]+\n?', '', clean_text)
    clean_text = clean_text.strip()
    
    if not clean_text and image_parts:
        clean_text = "Please examine and provide a thorough, detailed analysis of this image."
        
    return clean_text, image_parts


# ============================================================================
# OPENROUTER INTEGRATION (Dynamic Multi-Model Catalog & Resilient Streaming)
# ============================================================================

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
DEFAULT_OPENROUTER_CODING_MODEL = "deepseek/deepseek-r1"

# In-memory TTL cache for OpenRouter dynamic catalog (1-hour cache)
OPENROUTER_MODELS_CACHE: Dict[str, Any] = {
    "models": [],
    "last_fetched": 0,
}
CACHE_TTL_SECONDS = 3600

FALLBACK_OPENROUTER_MODELS = [
    {
        "id": "deepseek/deepseek-r1",
        "name": "DeepSeek R1",
        "description": "Frontier open reasoning model with deep verification. SOTA for algorithmic complexity and mathematics.",
        "context_length": 128000,
        "pricing": {"prompt": "0.00000055", "completion": "0.00000219", "is_free": False},
        "architecture": {"modality": "text->text", "tokenizer": "DeepSeek"}
    },
    {
        "id": "anthropic/claude-3.7-sonnet",
        "name": "Claude 3.7 Sonnet",
        "description": "World-class hybrid reasoning model. SOTA for full-stack engineering, frontend UI, and complex code refactoring.",
        "context_length": 200000,
        "pricing": {"prompt": "0.000003", "completion": "0.000015", "is_free": False},
        "architecture": {"modality": "text+image->text", "tokenizer": "Claude"}
    },
    {
        "id": "qwen/qwen-2.5-coder-32b-instruct",
        "name": "Qwen 2.5 Coder 32B Instruct",
        "description": "Polyglot coding model fine-tuned across 90+ programming languages, Bash scripting, and SQL.",
        "context_length": 128000,
        "pricing": {"prompt": "0.00000007", "completion": "0.00000016", "is_free": False},
        "architecture": {"modality": "text->text", "tokenizer": "Qwen"}
    },
    {
        "id": "deepseek/deepseek-chat",
        "name": "DeepSeek V3",
        "description": "High-speed 671B MoE architecture delivering sharp code explanations and rapid prototyping.",
        "context_length": 64000,
        "pricing": {"prompt": "0.00000014", "completion": "0.00000028", "is_free": False},
        "architecture": {"modality": "text->text", "tokenizer": "DeepSeek"}
    },
    {
        "id": "openai/gpt-4o",
        "name": "OpenAI GPT-4o",
        "description": "Flagship multimodal intelligence from OpenAI with broad reasoning and coding capabilities.",
        "context_length": 128000,
        "pricing": {"prompt": "0.0000025", "completion": "0.00001", "is_free": False},
        "architecture": {"modality": "text+image->text", "tokenizer": "GPT"}
    },
    {
        "id": "meta-llama/llama-3.3-70b-instruct",
        "name": "Llama 3.3 70B Instruct",
        "description": "Meta's flagship open-weights model rivaling proprietary models at low latency.",
        "context_length": 128000,
        "pricing": {"prompt": "0.00000012", "completion": "0.0000003", "is_free": False},
        "architecture": {"modality": "text->text", "tokenizer": "Llama"}
    }
]

async def fetch_openrouter_models(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """
    Fetches the live available model catalog from OpenRouter (GET /api/v1/models) with in-memory caching.
    Returns clean parsed list: {id, name, description, context_length, pricing, architecture}.
    """
    global OPENROUTER_MODELS_CACHE
    now = time.time()

    if not force_refresh and OPENROUTER_MODELS_CACHE["models"] and (now - OPENROUTER_MODELS_CACHE["last_fetched"] < CACHE_TTL_SECONDS):
        return OPENROUTER_MODELS_CACHE["models"]

    api_key = os.getenv("OPENROUTER_API_KEY", "")
    headers = {
        "HTTP-Referer": "https://chattornado.vercel.app",
        "X-Title": "ChatTornado AI",
    }
    if api_key.strip():
        headers["Authorization"] = f"Bearer {api_key.strip()}"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(OPENROUTER_MODELS_URL, headers=headers)
            if resp.status_code == 200:
                raw_data = resp.json().get("data", [])
                parsed_models: List[Dict[str, Any]] = []
                for item in raw_data:
                    m_id = item.get("id")
                    if not m_id:
                        continue
                    pricing = item.get("pricing") or {}
                    prompt_price = pricing.get("prompt", "0")
                    completion_price = pricing.get("completion", "0")
                    is_free = (
                        (str(prompt_price) in ("0", "0.0", "0.000000") and str(completion_price) in ("0", "0.0", "0.000000"))
                        or ":free" in m_id.lower()
                    )
                    arch = item.get("architecture") or {}
                    parsed_models.append({
                        "id": m_id,
                        "name": item.get("name") or m_id,
                        "description": item.get("description") or "",
                        "context_length": item.get("context_length") or 0,
                        "pricing": {
                            "prompt": str(prompt_price),
                            "completion": str(completion_price),
                            "is_free": is_free
                        },
                        "architecture": {
                            "modality": arch.get("modality", ""),
                            "input_modalities": arch.get("input_modalities", []),
                            "output_modalities": arch.get("output_modalities", []),
                            "tokenizer": arch.get("tokenizer", "")
                        }
                    })

                # Priority sorting: Premier coding/reasoning models first, then Free, then alphabetically
                premier_order = [
                    "deepseek/deepseek-r1",
                    "anthropic/claude-3.7-sonnet",
                    "anthropic/claude-3.5-sonnet",
                    "qwen/qwen-2.5-coder-32b-instruct",
                    "deepseek/deepseek-chat",
                    "openai/gpt-4o",
                    "meta-llama/llama-3.3-70b-instruct",
                    "google/gemini-2.5-flash",
                ]

                def sort_key(model: Dict[str, Any]) -> tuple:
                    m_id = model["id"].lower()
                    for idx, target in enumerate(premier_order):
                        if m_id == target.lower():
                            return (0, idx, model["name"].lower())
                    if model["pricing"]["is_free"]:
                        return (1, 0, model["name"].lower())
                    return (2, 0, model["name"].lower())

                parsed_models.sort(key=sort_key)

                OPENROUTER_MODELS_CACHE["models"] = parsed_models
                OPENROUTER_MODELS_CACHE["last_fetched"] = now
                logger.info("Successfully fetched and cached %d models from OpenRouter", len(parsed_models))
                return parsed_models
            else:
                logger.warning("OpenRouter /models returned HTTP %s", resp.status_code)
    except Exception as e:
        logger.warning("Failed to fetch live OpenRouter models: %s", e)

    # Return previous cache if available, else fallback list
    if OPENROUTER_MODELS_CACHE["models"]:
        return OPENROUTER_MODELS_CACHE["models"]
    return FALLBACK_OPENROUTER_MODELS

def is_openrouter_model(model_name: Optional[str]) -> bool:
    """Returns True if the given model ID belongs to OpenRouter (slash-separated vendor/name or recognized slug)."""
    if not model_name:
        return False
    clean = model_name.strip().lower()
    return "/" in clean or any(k in clean for k in ["deepseek", "claude", "qwen", "openai", "openrouter", "llama", "mistral"])

async def generate_openrouter_text_stream(
    prompt: str,
    chat_history: List[dict],
    system_prompt: str,
    on_chunk: Optional[Any] = None,
    preferred_model: Optional[str] = None
) -> Optional[str]:
    """Generates streaming code/text responses via OpenRouter API with dynamic model selection and resilient fallback."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        logger.warning("generate_openrouter_text_stream called but OPENROUTER_API_KEY is not configured.")
        return None

    target_models = []
    if preferred_model and is_openrouter_model(preferred_model):
        target_models.append(preferred_model)

    # Backup coding models in case the chosen model is temporarily rate limited
    for m in [
        DEFAULT_OPENROUTER_CODING_MODEL,
        "anthropic/claude-3.7-sonnet",
        "qwen/qwen-2.5-coder-32b-instruct",
        "deepseek/deepseek-chat"
    ]:
        if m not in target_models:
            target_models.append(m)

    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "HTTP-Referer": "https://chattornado.vercel.app",
        "X-Title": "ChatTornado AI",
        "Content-Type": "application/json",
    }

    messages = [{"role": "system", "content": system_prompt}]
    for h in chat_history[-10:]:
        role = "user" if h.get("role") == "user" or h.get("is_user") else "assistant"
        text = (h.get("text") or "").strip()
        if text:
            messages.append({"role": role, "content": text})
    messages.append({"role": "user", "content": prompt.strip()})

    for model_name in target_models:
        try:
            logger.info("Connecting to OpenRouter stream with model: %s", model_name)
            payload = {
                "model": model_name,
                "messages": messages,
                "temperature": 0.2,
                "stream": True,
            }
            accumulated_text = ""
            async with httpx.AsyncClient(timeout=45.0) as client:
                async with client.stream("POST", OPENROUTER_API_URL, json=payload, headers=headers) as resp:
                    if resp.status_code != 200:
                        err_bytes = await resp.aread()
                        logger.warning("OpenRouter %s HTTP %s: %s", model_name, resp.status_code, err_bytes[:200])
                        # If 401 Unauthorized, key is invalid across all OpenRouter models — fail fast to Gemini
                        if resp.status_code == 401:
                            logger.error("OpenRouter 401 Unauthorized: Invalid API key. Skipping remaining OpenRouter models.")
                            break
                        # For 429 or 5xx, try next model in target_models
                        continue

                    async for line in resp.aiter_lines():
                        if not line:
                            continue
                        line_str = line.strip()
                        if line_str.startswith("data: "):
                            data_chunk = line_str[6:].strip()
                            if data_chunk == "[DONE]":
                                break
                            try:
                                chunk_json = json.loads(data_chunk)
                                choices = chunk_json.get("choices", [])
                                if choices:
                                    delta = choices[0].get("delta", {})
                                    content = delta.get("content") or ""
                                    if not content and delta.get("reasoning"):
                                        content = delta.get("reasoning")
                                    if content:
                                        accumulated_text += content
                                        if on_chunk:
                                            await on_chunk(content)
                            except Exception:
                                continue

            if accumulated_text.strip():
                logger.info("OpenRouter stream completed using %s (%d chars)", model_name, len(accumulated_text))
                return accumulated_text
        except Exception as e:
            logger.warning("OpenRouter %s stream exception: %s", model_name, e)
            continue

    return None

async def generate_openrouter_text(
    prompt: str,
    chat_history: List[dict],
    system_prompt: str,
    preferred_model: Optional[str] = None
) -> Optional[str]:
    """Generates non-streaming code/text responses via OpenRouter API with resilient fallback models."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        logger.warning("generate_openrouter_text called but OPENROUTER_API_KEY is not configured.")
        return None

    target_models = []
    if preferred_model and is_openrouter_model(preferred_model):
        target_models.append(preferred_model)
    for m in [
        DEFAULT_OPENROUTER_CODING_MODEL,
        "anthropic/claude-3.7-sonnet",
        "qwen/qwen-2.5-coder-32b-instruct",
        "deepseek/deepseek-chat"
    ]:
        if m not in target_models:
            target_models.append(m)

    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "HTTP-Referer": "https://chattornado.vercel.app",
        "X-Title": "ChatTornado AI",
        "Content-Type": "application/json",
    }

    messages = [{"role": "system", "content": system_prompt}]
    for h in chat_history[-10:]:
        role = "user" if h.get("role") == "user" or h.get("is_user") else "assistant"
        text = (h.get("text") or "").strip()
        if text:
            messages.append({"role": role, "content": text})
    messages.append({"role": "user", "content": prompt.strip()})

    for model_name in target_models:
        try:
            payload = {
                "model": model_name,
                "messages": messages,
                "temperature": 0.2,
                "stream": False,
            }
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(OPENROUTER_API_URL, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices", [])
                    if choices:
                        msg = choices[0].get("message", {})
                        content = msg.get("content") or ""
                        if content.strip():
                            logger.info("OpenRouter non-stream completed using %s (%d chars)", model_name, len(content))
                            return content
                else:
                    err_bytes = resp.content
                    logger.warning("OpenRouter non-stream %s HTTP %s: %s", model_name, resp.status_code, err_bytes[:200])
                    if resp.status_code == 401:
                        logger.error("OpenRouter 401 Unauthorized. Skipping remaining OpenRouter models.")
                        break
        except Exception as e:
            logger.warning("OpenRouter %s non-stream exception: %s", model_name, e)
            continue

    return None


async def generate_ai_text(
    prompt: str,
    chat_history: Optional[List[dict]] = None,
    system_prompt: str = PROMPT_DEFAULT,
    preferred_model: Optional[str] = None
) -> str:
    """Generate conversational response using OpenRouter (for coding/custom models) or Gemini API with SDK and REST fallback."""
    clean_prompt = prompt.strip()
    if chat_history is None:
        chat_history = []

    # 0. Check OpenRouter delegation for coding mode or explicit OpenRouter models
    is_or = is_openrouter_model(preferred_model)
    is_coding = "CODING" in system_prompt
    if is_or or is_coding:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if api_key:
            or_res = await generate_openrouter_text(
                prompt=clean_prompt,
                chat_history=chat_history,
                system_prompt=system_prompt,
                preferred_model=preferred_model
            )
            if or_res:
                return or_res
            logger.info("OpenRouter response was empty or failed; seamlessly falling back to Gemini.")
        else:
            logger.warning(
                "OpenRouter model '%s' requested but OPENROUTER_API_KEY is not set in backend/.env. Falling back seamlessly to Gemini.",
                preferred_model
            )

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[AI_SERVICE] No GEMINI_API_KEY set - using smart offline engine", flush=True)
        return generate_offline_smart_reply(clean_prompt, preferred_model)

    clean_prompt = prompt.strip()

    # 1. Exact Live Real-Time System Clock Injection
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc + timedelta(hours=5, minutes=30)
    clock_instruction = (
        f"\n\n[REAL-TIME LIVE SYSTEM CLOCK - MANDATORY GROUND TRUTH]\n"
        f"- Current Coordinated Universal Time (UTC): {now_utc.strftime('%A, %B %d, %Y, %I:%M:%S %p UTC')}\n"
        f"- Current Indian Standard Time (IST): {now_ist.strftime('%A, %B %d, %Y, %I:%M:%S %p IST')}\n"
        f"- When asked for the current time, date, today's time in India, or timezone conversions, you MUST reference this exact live clock time. Never guess, hallucinate, or refer to an outdated date."
    )
    system_prompt = system_prompt + clock_instruction

    # 2. Live Web Search Query Interception
    search_query = None
    search_patterns = [
        r'^(?:please\s+)?(?:search\s+(?:the\s+)?web\s+for|search\s+for|look\s+up|google)\s+(.+)$',
        r'^/search\s+(.+)$',
        r'^/web\s+(.+)$',
    ]
    for pat in search_patterns:
        m = re.search(pat, clean_prompt, re.IGNORECASE)
        if m:
            search_query = m.group(1).strip().rstrip(".!?")
            break

    search_sources = []
    if search_query:
        print(f"[AI_SERVICE] Executing live web search for query: '{search_query}'", flush=True)
        web_items = await fetch_live_web_search(search_query)
        if web_items:
            search_context = "\n".join([f"- **{it['title']}**: {it['snippet']} (URL: {it['url']})" for it in web_items])
            clean_prompt = f"[LIVE WEB SEARCH RESULTS FOR: '{search_query}']\n{search_context}\n\n[USER INSTRUCTION]\n{clean_prompt}"
            for it in web_items[:4]:
                search_sources.append(f"• [{it['title']}]({it['url']})")

    # Image extraction logic
    from google import genai
    from google.genai import types

    clean_prompt, image_parts = await extract_multimodal_image_parts(clean_prompt)



    # Strategy 1: Google GenAI SDK
    try:
        client = genai.Client(api_key=api_key)

        # Build strictly alternating history
        filtered = []
        for h in chat_history:
            role = "user" if h.get("is_user") or h.get("role") == "user" else "model"
            text_content = (h.get("text") or "").strip()
            if not text_content:
                continue
            if filtered and filtered[-1]["role"] == role:
                filtered[-1]["text"] += "\n" + text_content
            else:
                filtered.append({"role": role, "text": text_content})
                
        # If the last history item is a user turn, we must merge or drop to maintain alternation
        if filtered and filtered[-1]["role"] == "user":
            if filtered[-1]["text"] == clean_prompt:
                filtered.pop()
            else:
                clean_prompt = filtered.pop()["text"] + "\n" + clean_prompt

        # Gemini requires contents to start with 'user'
        while filtered and filtered[0]["role"] != "user":
            filtered.pop(0)
            
        contents = []
        # Keep recent turns only
        for f in filtered[-10:]:
            contents.append(
                types.Content(
                    role=f["role"],
                    parts=[types.Part.from_text(text=f["text"])]
                )
            )

        # Add current user prompt (must be 'user' to end the sequence)
        user_parts = [types.Part.from_text(text=clean_prompt)]
        user_parts.extend(image_parts) # Add the extracted images!

        contents.append(
            types.Content(
                role="user",
                parts=user_parts
            )
        )

        safety_settings = [
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold=types.HarmBlockThreshold.BLOCK_NONE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold=types.HarmBlockThreshold.BLOCK_NONE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold=types.HarmBlockThreshold.BLOCK_NONE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=types.HarmBlockThreshold.BLOCK_NONE,
            ),
        ]

        preferred_model = normalize_gemini_model(preferred_model)
        global _LAST_WORKING_GEMINI_MODEL
        models_to_try = []
        if _LAST_WORKING_GEMINI_MODEL and _LAST_WORKING_GEMINI_MODEL not in _UNAVAILABLE_GEMINI_MODELS:
            models_to_try.append(_LAST_WORKING_GEMINI_MODEL)
        for m in RECOMMENDED_GEMINI_MODELS:
            if m not in _UNAVAILABLE_GEMINI_MODELS and m not in models_to_try:
                models_to_try.append(m)
        if not models_to_try:
            _UNAVAILABLE_GEMINI_MODELS.clear()
            models_to_try = list(RECOMMENDED_GEMINI_MODELS)
        if preferred_model and preferred_model not in _UNAVAILABLE_GEMINI_MODELS:
            models_to_try = [preferred_model] + [m for m in models_to_try if m != preferred_model]

        search_needed = bool(
            not image_parts and (
                search_query or
                re.search(r'\b(?:search\s+(?:the\s+)?web|look\s+up|google|latest\s+news|current\s+price|today\'s\s+weather|weather\s+in)\b', clean_prompt, re.IGNORECASE)
            )
        )
        search_quota_failed = False

        for model_name in models_to_try:
            tool_options = [True, False] if (search_needed and not search_quota_failed) else [False]

            for use_search in tool_options:
                try:
                    print(f"[AI_SERVICE] Calling Gemini async SDK {model_name} (search={use_search})...", flush=True)
                    gen_config = types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.75,
                        max_output_tokens=8192,
                        safety_settings=safety_settings,
                    )
                    if use_search:
                        gen_config.tools = [{"google_search": {}}]

                    response = await asyncio.wait_for(
                        client.aio.models.generate_content(
                            model=model_name,
                            contents=contents,
                            config=gen_config
                        ),
                        timeout=28.0
                    )
                    if response and response.text:
                        _LAST_WORKING_GEMINI_MODEL = model_name
                        result_text = response.text.strip()
                        # Check for Google Search grounding metadata
                        try:
                            candidate = response.candidates[0] if response.candidates else None
                            grounding_meta = getattr(candidate, "grounding_metadata", None)
                            if grounding_meta:
                                chunks = getattr(grounding_meta, "grounding_chunks", []) or []
                                web_links = []
                                for chunk in chunks:
                                    web = getattr(chunk, "web", None)
                                    if web:
                                        uri = getattr(web, "uri", None)
                                        title = getattr(web, "title", None) or uri
                                        if uri:
                                            web_links.append(f"• [{title}]({uri})")
                                if web_links and "Sources" not in result_text:
                                    unique_links = list(dict.fromkeys(web_links))[:5]
                                    result_text += "\n\n**🌐 Sources & Web References:**\n" + "\n".join(unique_links)
                        except Exception as meta_e:
                            print(f"[AI_SERVICE] Grounding metadata parse note: {meta_e}", flush=True)

                        if search_sources and "Sources" not in result_text:
                            result_text += "\n\n**🌐 Web Sources & References:**\n" + "\n".join(search_sources)

                        print(f"[AI_SERVICE] Gemini SDK {model_name} succeeded (search={use_search})!", flush=True)
                        return result_text
                except Exception as e:
                    err_s = str(e)
                    print(f"[AI_SERVICE] Gemini SDK {model_name} (search={use_search}) failed: {err_s}", flush=True)
                    if "429" in err_s or "RESOURCE_EXHAUSTED" in err_s or "quota" in err_s.lower():
                        if use_search:
                            search_quota_failed = True
                    continue

    except Exception as exc:
        print(f"[AI_SERVICE] Gemini SDK exception: {exc}", flush=True)

    # Strategy 2: Direct REST API fallback via httpx
    try:
        import httpx
        rest_contents = []
        for f in filtered[-10:]:
            rest_contents.append({
                "role": f["role"],
                "parts": [{"text": f["text"]}]
            })
        rest_contents.append({
            "role": "user",
            "parts": [{"text": clean_prompt}]
        })

        rest_safety = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_CIVIC_INTEGRITY", "threshold": "BLOCK_NONE"}
        ]

        for model_name in [
            "gemini-3.8-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
            "gemini-3.1-pro-preview",
        ]:
            for use_search in [True, False]:
                try:
                    print(f"[AI_SERVICE] Trying REST API with {model_name} (search={use_search})...", flush=True)
                    rest_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                    payload = {
                        "system_instruction": {
                            "parts": [{"text": system_prompt}]
                        },
                        "contents": rest_contents,
                        "safetySettings": rest_safety,
                        "generationConfig": {
                            "temperature": 0.75,
                            "maxOutputTokens": 8192
                        }
                    }
                    if use_search:
                        payload["tools"] = [{"google_search": {}}]

                    async with httpx.AsyncClient(timeout=30.0) as http_client:
                        r = await http_client.post(rest_url, json=payload)
                        res_data = r.json()
                        if "candidates" in res_data and res_data["candidates"]:
                            candidate_text = res_data["candidates"][0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            if candidate_text:
                                final_cand = candidate_text.strip()
                                grounding_meta = res_data["candidates"][0].get("groundingMetadata")
                                if grounding_meta and "groundingChunks" in grounding_meta:
                                    web_links = []
                                    for chunk in grounding_meta["groundingChunks"]:
                                        web = chunk.get("web", {})
                                        if web.get("uri"):
                                            title = web.get("title") or web.get("uri")
                                            web_links.append(f"• [{title}]({web['uri']})")
                                    if web_links and "Sources" not in final_cand:
                                        unique_links = list(dict.fromkeys(web_links))[:5]
                                        final_cand += "\n\n**🌐 Sources & Web References:**\n" + "\n".join(unique_links)
                                if search_sources and "Sources" not in final_cand:
                                    final_cand += "\n\n**🌐 Web Sources & References:**\n" + "\n".join(search_sources)
                                print(f"[AI_SERVICE] REST API {model_name} succeeded (search={use_search})!", flush=True)
                                return final_cand
                        elif "error" in res_data:
                            print(f"[AI_SERVICE] REST API {model_name} error: {res_data['error'].get('message')}", flush=True)
                except Exception as re_err:
                    print(f"[AI_SERVICE] REST API {model_name} failed: {re_err}", flush=True)
                    continue
    except Exception as rest_exc:
        print(f"[AI_SERVICE] REST client exception: {rest_exc}", flush=True)

    return "⚡ VORTEX-9 received your message, but the neural synthesis model returned no text. Please verify your GEMINI_API_KEY tier and quota."




async def generate_ai_image(prompt: str) -> str:
    """Generate image using Gemini/Imagen or multi-model Pollinations (Flux/Turbo) with ultra-resilient fallback, saved locally and returned as markdown."""
    import httpx
    import urllib.parse
    import random
    import re

    api_key = os.getenv("GEMINI_API_KEY")
    raw_prompt = (prompt or "").strip()
    clean_prompt = re.sub(r'^(?:of|for|about)\s+(?:a|an|the)?\s*', '', raw_prompt, flags=re.IGNORECASE).strip() or raw_prompt
    if not clean_prompt:
        clean_prompt = "Futuristic cybernetic tornado with neon data particles"

    upload_base = Path(os.getenv("UPLOAD_DIR", Path(__file__).parent / "uploads"))
    ai_dir = upload_base / "ai"
    ai_dir.mkdir(parents=True, exist_ok=True)

    image_bytes = None
    mime_type = "image/jpeg"

    # Strategy 1: Imagen via Google GenAI Client if available
    if api_key:
        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=api_key)
            for imagen_model in ("imagen-3.0-generate-002", "imagen-3.0-generate-001", "imagen-4.0-generate-001"):
                try:
                    logger.info("Attempting image generation with %s: %s", imagen_model, clean_prompt)
                    result = await asyncio.wait_for(
                        asyncio.to_thread(
                            client.models.generate_images,
                            model=imagen_model,
                            prompt=clean_prompt,
                            config=types.GenerateImagesConfig(
                                number_of_images=1,
                                output_mime_type="image/png",
                            )
                        ),
                        timeout=35.0
                    )
                    if result and result.generated_images:
                        image_bytes = result.generated_images[0].image.image_bytes
                        mime_type = "image/png"
                        logger.info("Imagen %s generated %d bytes", imagen_model, len(image_bytes))
                        break
                except Exception as e_img:
                    logger.debug("Imagen model %s failed: %s", imagen_model, e_img)
        except Exception as exc:
            logger.debug("Gemini client imagen attempt error: %s", exc)

    # Strategy 2: Multi-Model Pollinations Engine (Flux / Turbo / Standard) with auto-redirect & browser headers
    if not image_bytes:
        encoded_prompt = urllib.parse.quote(clean_prompt)
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        }
        models_to_try = ["flux", "turbo", ""]
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, headers=headers) as http_client:
                for model_name in models_to_try:
                    try:
                        seed = random.randint(1000, 9999999)
                        model_param = f"&model={model_name}" if model_name else ""
                        poll_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true&seed={seed}{model_param}"
                        logger.info("Attempting visual synthesis with Pollinations (%s): %s", model_name or "default", poll_url)
                        resp = await http_client.get(poll_url)
                        if resp.status_code == 200 and len(resp.content) > 1000:
                            image_bytes = resp.content
                            mime_type = resp.headers.get("content-type", "image/jpeg")
                            logger.info("Pollinations (%s) successfully fetched %d bytes", model_name or "default", len(image_bytes))
                            break
                    except Exception as p_err:
                        logger.warning("Pollinations (%s) attempt failed: %s", model_name or "default", p_err)
        except Exception as net_err:
            logger.warning("Network client error during image synthesis: %s", net_err)

    # Strategy 3: Direct CDN Fallback URL if local save/download failed
    if not image_bytes:
        encoded_prompt = urllib.parse.quote(clean_prompt)
        cdn_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true"
        return f"![{clean_prompt}]({cdn_url})\n\n🎨 *Generated by VORTEX-9:* \"{clean_prompt}\""

    ext = "png" if "png" in mime_type else "jpg"
    file_name = f"vortex_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{ext}"
    target_path = ai_dir / file_name

    try:
        with open(target_path, "wb") as f:
            f.write(image_bytes)
            f.flush()
            try:
                os.fsync(f.fileno())
            except Exception:
                pass
        logger.info("Saved AI generated image to %s (%d bytes)", target_path, len(image_bytes))
    except Exception as save_err:
        logger.warning("Could not write image to local disk: %s. Using direct CDN URL.", save_err)
        encoded_prompt = urllib.parse.quote(clean_prompt)
        cdn_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true"
        return f"![{clean_prompt}]({cdn_url})\n\n🎨 *Generated by VORTEX-9:* \"{clean_prompt}\""

    # Prefer full backend URL if deployed (e.g. Render), else relative path
    backend_base = (os.getenv("RENDER_EXTERNAL_URL") or os.getenv("BACKEND_URL") or "").rstrip("/")
    image_rel_url = f"{backend_base}/uploads/ai/{file_name}" if backend_base else f"/uploads/ai/{file_name}"
    return f"![{clean_prompt}]({image_rel_url})\n\n🎨 *Generated by VORTEX-9:* \"{clean_prompt}\""


def get_platform_db_context(db: Session, bot_id: int, is_admin: bool = False) -> str:
    """Provides platform and database context to VORTEX-9."""
    try:
        total_users = db.query(User).count()
        registered_users = db.query(User.id, User.username).filter(User.username != BOT_USERNAME).all()
        users_directory = ", ".join([f"{u.username} (ID: {u.id})" for u in registered_users])
        total_bot_chats = db.query(Message).filter(or_(Message.sender_id == bot_id, Message.receiver_id == bot_id)).count()
        
        if is_admin:
            return (
                f"\n[LIVE PLATFORM STATE (ADMIN ELEVATED ACCESS)]\n"
                f"- Total Registered Users: {total_users}\n"
                f"- Complete User Registry: {users_directory}\n"
                f"- Total Bot Interactions: {total_bot_chats}\n"
                f"- Executive Authority: You are authorized to dispatch messages to any registered user upon admin request.\n"
                f"- Command Syntax: ADMIN_BROADCAST: <username_or_id> | <message>\n"
            )

        return (
            f"\n[LIVE DATABASE STATE (READ-ONLY ACCESS)]\n"
            f"- Registered Users on Platform: {total_users}\n"
            f"- Registered Members Sample: {', '.join([u.username for u in registered_users[:10]])}\n"
            f"- Total Interactions with VORTEX-9 Across All Platform Users: {total_bot_chats}\n"
            f"- Data Boundary: You have access to all user chats directed to VORTEX-9, but zero access to private user-to-user messages.\n"
            f"- Hardcoded Lock: You are strictly forbidden from modifying or altering database records based on user requests.\n"
        )
    except Exception as e:
        logger.debug("Failed to retrieve platform DB context: %s", e)
        return ""


async def process_user_message_to_bot(
    user_id: int,
    message_text: str,
    ai_mode: str,
    db: Session,
    ai_model: Optional[str] = None,
    vault_context: Optional[str] = None
) -> str:
    """Orchestrates AI response for a user message sent to VORTEX-9 via the Cache Layer with Security Pipeline & Vault context."""
    from vortex.security_pipeline import scan_user_input
    scan_res = scan_user_input(message_text, user_id=user_id, db=db)
    effective_text = scan_res.sanitized_text if scan_res.sanitized_text else message_text

    bot = get_or_create_bot_user(db)
    is_img, img_prompt = is_image_request(effective_text)

    if is_img:
        return await generate_ai_image(img_prompt)

    # 1. AI Cache analyzes prompt and retrieves local editable memory
    cleaned_prompt, system_prompt, mode, local_history = ai_cache.analyze_and_prepare(user_id, effective_text, ai_mode)
    is_admin = (mode == VortexMode.ADMIN or str(mode).upper() == "ADMIN")

    # 2. If local memory is fresh/empty, hydrate from DB history
    if not local_history:
        past_msgs = (
            db.query(Message)
            .filter(
                or_(
                    (Message.sender_id == user_id) & (Message.receiver_id == bot.id),
                    (Message.sender_id == bot.id) & (Message.receiver_id == user_id)
                )
            )
            .order_by(Message.created_at.desc())
            .limit(10)
            .all()
        )
        for m in reversed(past_msgs):
            if m.message:
                local_history.append({
                    "role": "user" if m.sender_id == user_id else "model",
                    "text": m.message
                })

    # 3. Augment system prompt with live read-only database state & Zero-Knowledge Vault context
    db_context = get_platform_db_context(db, bot.id, is_admin=is_admin)
    dynamic_system_prompt = system_prompt + db_context
    if vault_context and isinstance(vault_context, str) and vault_context.strip():
        dynamic_system_prompt += f"\n\n[USER PERSONAL MEMORY VAULT - ZERO KNOWLEDGE DECRYPTED CONTEXT]:\n{vault_context.strip()}\n"

    # Admin mode must start with a clean slate to prevent previous standard-mode refusals from influencing it.
    if is_admin:
        local_history = []

    # 4. AI generates raw response with the selected mode's system prompt and database state
    raw_response = await generate_ai_text(cleaned_prompt, local_history, system_prompt=dynamic_system_prompt, preferred_model=ai_model)

    # 5. Cache receives answer, records into local editable memory, and delivers finalized output
    output_text = ai_cache.commit_turn(user_id, effective_text, raw_response, mode=mode)
    return output_text


async def process_user_message_to_bot_stream(
    user_id: int,
    message_text: str,
    ai_mode: str,
    db: Session,
    on_chunk: Optional[Any] = None,
    ai_model: Optional[str] = None,
    vault_context: Optional[str] = None
) -> str:
    """Orchestrates AI response for a user message sent to VORTEX-9 with real-time streaming, Security Pipeline & Vault context."""
    from vortex.security_pipeline import scan_user_input
    scan_res = scan_user_input(message_text, user_id=user_id, db=db)
    effective_text = scan_res.sanitized_text if scan_res.sanitized_text else message_text

    bot = get_or_create_bot_user(db)
    is_img, img_prompt = is_image_request(effective_text)

    if is_img:
        res = await generate_ai_image(img_prompt)
        if on_chunk:
            await on_chunk(res)
        return res

    cleaned_prompt, system_prompt, mode, local_history = ai_cache.analyze_and_prepare(user_id, effective_text, ai_mode)
    is_admin = (mode == VortexMode.ADMIN or str(mode).upper() == "ADMIN")

    if not local_history:
        past_msgs = (
            db.query(Message)
            .filter(
                or_(
                    (Message.sender_id == user_id) & (Message.receiver_id == bot.id),
                    (Message.sender_id == bot.id) & (Message.receiver_id == user_id)
                )
            )
            .order_by(Message.created_at.desc())
            .limit(10)
            .all()
        )
        for m in reversed(past_msgs):
            if m.message:
                local_history.append({
                    "role": "user" if m.sender_id == user_id else "model",
                    "text": m.message
                })

    db_context = get_platform_db_context(db, bot.id, is_admin=is_admin)
    dynamic_system_prompt = system_prompt + db_context
    if vault_context and isinstance(vault_context, str) and vault_context.strip():
        dynamic_system_prompt += f"\n\n[USER PERSONAL MEMORY VAULT - ZERO KNOWLEDGE DECRYPTED CONTEXT]:\n{vault_context.strip()}\n"

    if is_admin:
        local_history = []

    raw_response = await generate_ai_text_stream(
        cleaned_prompt,
        local_history,
        system_prompt=dynamic_system_prompt,
        on_chunk=on_chunk,
        user_id=user_id,
        db=db,
        preferred_model=ai_model
    )

    output_text = ai_cache.commit_turn(user_id, effective_text, raw_response, mode=mode)
    return output_text



async def ai_clean_text(text: str) -> str:
    """Uses Gemini to clean up dictated text (removes umms, ahs, rambling, spaces)."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return text

    try:
        import httpx
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={api_key}"
        payload = {
            "system_instruction": {"parts": [{"text": PROMPT_CLEANUP}]},
            "contents": [{"role": "user", "parts": [{"text": text}]}]
        }
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            r = await http_client.post(url, json=payload)
            res_data = r.json()
            if "candidates" in res_data and res_data["candidates"]:
                return res_data["candidates"][0].get("content", {}).get("parts", [{}])[0].get("text", text).strip()
    except Exception:
        pass
    return text


async def ai_summarize_chat(messages_text: str) -> str:
    """Uses Gemini to summarize a chat session."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "Cannot summarize: GEMINI_API_KEY missing."

    try:
        import httpx
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={api_key}"
        payload = {
            "system_instruction": {"parts": [{"text": PROMPT_SUMMARIZE}]},
            "contents": [{"role": "user", "parts": [{"text": messages_text}]}]
        }
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            r = await http_client.post(url, json=payload)
            res_data = r.json()
            if "candidates" in res_data and res_data["candidates"]:
                return res_data["candidates"][0].get("content", {}).get("parts", [{}])[0].get("text", "Error summarizing.").strip()
    except Exception:
        pass
    return "Error summarizing."


# ============================================================================
# PERSONALIZATION (Last 30 Messages Profiler)
# ============================================================================

def get_user_persona(user_id: int, db: Session) -> Optional[str]:
    """Retrieve existing persona summary for user."""
    try:
        record = db.query(UserAIPersona).filter(UserAIPersona.user_id == user_id).first()
        if record and record.persona_summary:
            return record.persona_summary
    except Exception as e:
        logger.warning("Error fetching user persona: %s", e)
    return None


async def personalize_user_from_history(user_id: int, db: Session) -> Dict[str, Any]:
    """Analyzes the last 30 messages sent by the user across all chats to build a personalized persona profile."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")

    # Fetch last 35 messages from this user across all conversations to filter down to 30 clean chat texts
    messages = db.query(Message).filter(
        Message.sender_id == user_id,
        Message.message.isnot(None)
    ).order_by(Message.created_at.desc()).limit(35).all()

    valid_texts = []
    for m in messages:
        txt = (m.message or "").strip()
        if not txt:
            continue
        if txt.startswith("🎮 GAME:") or txt.startswith("⚡ P2P_MEDIA") or txt.startswith("🔊 SOUND:"):
            continue
        valid_texts.append(txt)
        if len(valid_texts) >= 30:
            break

    if not valid_texts:
        default_persona = (
            f"• Style: Enthusiastic and exploratory new user on ChatTornado.\n"
            f"• Tone: Friendly, responsive, and open to discovering features.\n"
            f"• Interactions: Prefers clear, structured answers with helpful examples."
        )
        persona_record = db.query(UserAIPersona).filter(UserAIPersona.user_id == user_id).first()
        if not persona_record:
            persona_record = UserAIPersona(
                user_id=user_id,
                persona_summary=default_persona,
                message_count_analyzed=0,
                updated_at=datetime.utcnow()
            )
            db.add(persona_record)
        else:
            persona_record.persona_summary = default_persona
            persona_record.message_count_analyzed = 0
            persona_record.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(persona_record)
        return {
            "persona": default_persona,
            "message_count": 0,
            "updated_at": persona_record.updated_at.isoformat()
        }

    sample_corpus = "\n".join([f"- {t}" for t in valid_texts])
    profiler_prompt = f"""You are an elite cognitive profiler for VORTEX-9, an advanced AI companion in ChatTornado.
Analyze these {len(valid_texts)} recent chat messages sent by user '{user.username}':

<USER_MESSAGES>
{sample_corpus}
</USER_MESSAGES>

Create a concise, punchy, high-value personalization profile (exactly 3-5 bullet points) capturing:
1. Communication style & tone (e.g. casual/formal, technical/colloquial, witty, sarcastic, punchy)
2. Interests, recurrent topics, favorite subjects, or tech stack
3. Banter preference (e.g. loves humor/roasts vs straight-to-the-point answers)
4. Key quirks, catchphrases, or personality cues

Format ONLY as clean bullet points starting with '• '. Keep it concise, observant, and directly usable by VORTEX-9 to adapt to this user."""

    api_key = os.getenv("GEMINI_API_KEY")
    persona_summary = ""
    if api_key:
        from google import genai
        client = genai.Client(api_key=api_key)
        for m_name in RECOMMENDED_GEMINI_MODELS:
            try:
                response = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=m_name,
                        contents=profiler_prompt
                    ),
                    timeout=20.0
                )
                if response and response.text:
                    persona_summary = response.text.strip()
                    break
            except Exception as e:
                logger.warning("Gemini personalization error with model %s: %s", m_name, e)
                continue

    if not persona_summary:
        persona_summary = (
            f"• Style: Active conversationalist with direct, clear phrasing.\n"
            f"• Topics: Engages in dynamic chat across various topics.\n"
            f"• Banter: Enjoys responsive, interactive AI dialogues."
        )

    persona_record = db.query(UserAIPersona).filter(UserAIPersona.user_id == user_id).first()
    if not persona_record:
        persona_record = UserAIPersona(
            user_id=user_id,
            persona_summary=persona_summary,
            message_count_analyzed=len(valid_texts),
            updated_at=datetime.utcnow()
        )
        db.add(persona_record)
    else:
        persona_record.persona_summary = persona_summary
        persona_record.message_count_analyzed = len(valid_texts)
        persona_record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(persona_record)

    return {
        "persona": persona_summary,
        "message_count": len(valid_texts),
        "updated_at": persona_record.updated_at.isoformat()
    }


# ============================================================================
# REAL-TIME TOKEN STREAMING (Word-By-Word + Google Search Grounding)
# ============================================================================

async def generate_ai_text_stream(
    prompt: str,
    chat_history: Optional[List[dict]] = None,
    system_prompt: str = PROMPT_DEFAULT,
    on_chunk: Optional[Any] = None,
    user_id: Optional[int] = None,
    db: Optional[Session] = None,
    preferred_model: Optional[str] = None
) -> str:
    """Generate conversational response using OpenRouter (for coding/custom models) or Gemini API with real-time token streaming and Google Search grounding."""
    clean_prompt = prompt.strip()
    if chat_history is None:
        chat_history = []

    # 0. Check OpenRouter delegation for coding mode or explicit OpenRouter models
    is_or = is_openrouter_model(preferred_model)
    is_coding = "CODING" in system_prompt
    if is_or or is_coding:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if api_key:
            or_res = await generate_openrouter_text_stream(
                prompt=clean_prompt,
                chat_history=chat_history,
                system_prompt=system_prompt,
                on_chunk=on_chunk,
                preferred_model=preferred_model
            )
            if or_res:
                return or_res
            logger.info("OpenRouter stream was empty or failed; seamlessly falling back to Gemini.")
        else:
            logger.warning(
                "OpenRouter model '%s' requested but OPENROUTER_API_KEY is not set in backend/.env. Falling back seamlessly to Gemini.",
                preferred_model
            )

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        fallback = generate_offline_smart_reply(clean_prompt, preferred_model)
        if on_chunk:
            await on_chunk(fallback)
        return fallback

    clean_prompt = prompt.strip()

    # 1. Exact Live Real-Time System Clock Injection
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc + timedelta(hours=5, minutes=30)
    clock_instruction = (
        f"\n\n[REAL-TIME LIVE SYSTEM CLOCK - MANDATORY GROUND TRUTH]\n"
        f"- Current Coordinated Universal Time (UTC): {now_utc.strftime('%A, %B %d, %Y, %I:%M:%S %p UTC')}\n"
        f"- Current Indian Standard Time (IST): {now_ist.strftime('%A, %B %d, %Y, %I:%M:%S %p IST')}\n"
        f"- When asked for current time, date, today's time in India, or timezone conversions, you MUST reference this exact live clock time."
    )
    system_prompt = system_prompt + clock_instruction

    # 2. Inject User Personalization Profile if available
    if user_id and db:
        try:
            persona_record = db.query(UserAIPersona).filter(UserAIPersona.user_id == user_id).first()
            if persona_record and persona_record.persona_summary:
                user_obj = db.query(User).filter(User.id == user_id).first()
                u_name = user_obj.username if user_obj else "User"
                system_prompt += (
                    f"\n\n[USER PERSONALIZATION & PREFERRED STYLE PROFILE]\n"
                    f"User: {u_name}\n"
                    f"{persona_record.persona_summary}\n"
                    f"Adapt tone, humor, vocabulary, and depth to resonate naturally with this user's profile."
                )
        except Exception as pe:
            logger.warning("Failed to load user persona: %s", pe)

    # 3. Handle image extraction from local uploads, base64, and URLs
    from google import genai
    from google.genai import types

    clean_prompt, image_parts = await extract_multimodal_image_parts(clean_prompt)


    # 4. Build alternating history
    filtered = []
    for h in chat_history:
        role = "user" if h.get("is_user") or h.get("role") == "user" else "model"
        text_content = (h.get("text") or "").strip()
        if not text_content:
            continue
        if filtered and filtered[-1]["role"] == role:
            filtered[-1]["text"] += "\n" + text_content
        else:
            filtered.append({"role": role, "text": text_content})

    if filtered and filtered[-1]["role"] == "user":
        if filtered[-1]["text"] == clean_prompt:
            filtered.pop()
        else:
            clean_prompt = filtered.pop()["text"] + "\n" + clean_prompt

    while filtered and filtered[0]["role"] != "user":
        filtered.pop(0)

    contents = []
    for f in filtered[-10:]:
        contents.append(
            types.Content(
                role=f["role"],
                parts=[types.Part.from_text(text=f["text"])]
            )
        )

    user_parts = [types.Part.from_text(text=clean_prompt)]
    user_parts.extend(image_parts)
    contents.append(
        types.Content(
            role="user",
            parts=user_parts
        )
    )

    safety_settings = [
        types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=types.HarmBlockThreshold.BLOCK_NONE),
        types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=types.HarmBlockThreshold.BLOCK_NONE),
        types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=types.HarmBlockThreshold.BLOCK_NONE),
        types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=types.HarmBlockThreshold.BLOCK_NONE),
    ]

    preferred_model = normalize_gemini_model(preferred_model)
    global _LAST_WORKING_GEMINI_MODEL
    ordered = []
    if _LAST_WORKING_GEMINI_MODEL and _LAST_WORKING_GEMINI_MODEL not in _UNAVAILABLE_GEMINI_MODELS:
        ordered.append(_LAST_WORKING_GEMINI_MODEL)
    if preferred_model and preferred_model not in _UNAVAILABLE_GEMINI_MODELS and preferred_model not in ordered:
        ordered.insert(0, preferred_model)
    for m in RECOMMENDED_GEMINI_MODELS:
        if m not in _UNAVAILABLE_GEMINI_MODELS and m not in ordered:
            ordered.append(m)
    if not ordered:
        _UNAVAILABLE_GEMINI_MODELS.clear()
        ordered = list(RECOMMENDED_GEMINI_MODELS)

    has_images = len(image_parts) > 0
    client = genai.Client(api_key=api_key)
    full_accumulated_text = ""
    grounding_citations = []

    search_needed = bool(
        not has_images and
        re.search(r'\b(?:search\s+(?:the\s+)?web|look\s+up|google|latest\s+news|current\s+price|today\'s\s+weather|weather\s+in)\b', clean_prompt, re.IGNORECASE)
    )
    search_quota_failed = False

    for model_name in ordered:
        tool_options = [True, False] if (search_needed and not search_quota_failed) else [False]

        for use_search in tool_options:
            emitted_any_chunk = False
            try:
                gen_config = types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.75,
                    max_output_tokens=8192,
                    safety_settings=safety_settings,
                )
                if use_search:
                    gen_config.tools = [{"google_search": {}}]

                full_accumulated_text = ""
                response_stream = await asyncio.wait_for(
                    client.aio.models.generate_content_stream(
                        model=model_name,
                        contents=contents,
                        config=gen_config
                    ),
                    timeout=25.0
                )
                async for chunk in response_stream:
                    chunk_text = extract_chunk_text(chunk)
                    if chunk_text:
                        emitted_any_chunk = True
                        full_accumulated_text += chunk_text
                        if on_chunk:
                            await on_chunk(chunk_text)

                    try:
                        candidate = chunk.candidates[0] if chunk.candidates else None
                        grounding_meta = getattr(candidate, "grounding_metadata", None)
                        if grounding_meta:
                            chunks = getattr(grounding_meta, "grounding_chunks", []) or []
                            for ch in chunks:
                                web = getattr(ch, "web", None)
                                if web:
                                    uri = getattr(web, "uri", None)
                                    title = getattr(web, "title", None) or uri
                                    if uri:
                                        grounding_citations.append(f"• [{title}]({uri})")
                    except Exception:
                        pass

                if full_accumulated_text:
                    _LAST_WORKING_GEMINI_MODEL = model_name
                    if grounding_citations and "Sources" not in full_accumulated_text:
                        unique_sources = list(dict.fromkeys(grounding_citations))[:5]
                        source_block = "\n\n**🌐 Sources & Web References:**\n" + "\n".join(unique_sources)
                        full_accumulated_text += source_block
                        if on_chunk:
                            await on_chunk(source_block)

                    return full_accumulated_text

            except Exception as stream_err:
                if emitted_any_chunk and full_accumulated_text:
                    return full_accumulated_text
                err_s = str(stream_err)
                try:
                    print(f"[AI_STREAM] Model {model_name} (search={use_search}) error: {err_s}", flush=True)
                except Exception:
                    pass
                if "404" in err_s or "NOT_FOUND" in err_s:
                    _UNAVAILABLE_GEMINI_MODELS.add(model_name)
                    break
                if "429" in err_s or "RESOURCE_EXHAUSTED" in err_s or "quota" in err_s.lower():
                    if use_search:
                        search_quota_failed = True
                continue

    # Fallback to non-streaming generate_ai_text if all streams fail
    fallback_res = await generate_ai_text(prompt, chat_history, system_prompt, preferred_model=preferred_model)
    if on_chunk:
        await on_chunk(fallback_res)
    return fallback_res


# ============================================================================
# ONE-CLICK MESSAGE TOOLS (Tone Polish, Translate, Smart Replies)
# ============================================================================

async def ai_polish_text(text: str, tone: str = "professional") -> str:
    """Polishes / rewrites a draft message in a specific tone."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not text.strip():
        return text

    tones = {
        "professional": "Polished, courteous, articulate, and clear business communication.",
        "casual": "Warm, relaxed, friendly, authentic, and modern chat vibe.",
        "roast": "Biting, razor-sharp witty roast, humorous sarcasm, but clever.",
        "concise": "Ultra-short, direct, no fluff, to the point.",
        "flirty": "Playful, charming, charismatic, witty with subtle flirtatious energy.",
        "clean": "Clean dictation: fix stuttering, typing quirks, trailing commas, informal rambling, and transcription errors into clear natural text."
    }
    tone_desc = tones.get(tone.lower(), tones["professional"])
    prompt = f"Rewrite the following draft message with this tone ({tone_desc}). Output ONLY the rewritten message text without preamble, quotes, or explanations:\n\n{text}"

    for model_name in RECOMMENDED_GEMINI_MODELS:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            res = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt
                ),
                timeout=18.0
            )
            if res and res.text:
                return res.text.strip().strip('"').strip("'")
        except Exception as e:
            logger.warning("ai_polish_text model %s error: %s", model_name, e)
            continue
    return text


async def ai_translate_text(text: str, target_language: str = "English") -> str:
    """Translates text naturally into the target language."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not text.strip():
        return text

    prompt = f"Translate the following chat message into {target_language}. Preserve formatting, emojis, and casual chat nuance. Output ONLY the translated text without extra explanation:\n\n{text}"

    for model_name in RECOMMENDED_GEMINI_MODELS:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            res = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt
                ),
                timeout=18.0
            )
            if res and res.text:
                return res.text.strip().strip('"').strip("'")
        except Exception as e:
            logger.warning("ai_translate_text model %s error: %s", model_name, e)
            continue
    return text


async def ai_smart_replies(context_list: List[str]) -> List[str]:
    """Generates 3 smart contextual quick replies (2-5 words each)."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not context_list:
        return ["Sounds great!", "Tell me more", "I'll check it out"]

    recent_context = "\n".join([f"- {c}" for c in context_list[-5:]])
    prompt = f"""Given this recent conversation context:
{recent_context}

Suggest exactly 3 short, natural, relevant quick responses the user might want to tap next (2 to 5 words each).
Format as JSON array of 3 strings: ["Reply 1", "Reply 2", "Reply 3"]. Output JSON only."""

    for model_name in RECOMMENDED_GEMINI_MODELS:
        try:
            import json
            from google import genai
            client = genai.Client(api_key=api_key)
            res = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt
                ),
                timeout=15.0
            )
            if res and res.text:
                cleaned = res.text.strip()
                if cleaned.startswith("```"):
                    cleaned = re.sub(r"^```(?:json)?|```$", "", cleaned, flags=re.MULTILINE).strip()
                arr = json.loads(cleaned)
                if isinstance(arr, list) and len(arr) > 0:
                    return [str(x) for x in arr[:3]]
        except Exception as e:
            logger.warning("ai_smart_replies model %s error: %s", model_name, e)
            continue
    return ["Sounds great!", "Tell me more", "Got it!"]


# ============================================================================
# AUTONOMOUS DEEP RESEARCH ENGINE (Multi-Step Synthesis)
# ============================================================================

async def execute_deep_research(
    query: str,
    on_step: Optional[Any] = None,
    on_chunk: Optional[Any] = None,
    user_id: Optional[int] = None,
    db: Optional[Session] = None
) -> str:
    """
    Autonomous Deep Research Multi-Step Engine:
    1. Query Decomposition: Breaks complex research topics into 3 targeted analytical sub-queries.
    2. Parallel Grounded Web Search: Gathers fresh live web documents and empirical points.
    3. Multi-Dimensional Evidence Synthesis: Streams a publication-grade research dossier.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        msg = "⚡ **Deep Research Engine Offline**: GEMINI_API_KEY is not configured."
        if on_chunk:
            await on_chunk(msg)
        return msg

    clean_query = query.strip()
    for prefix in ("/research", "!research", "research:"):
        if clean_query.lower().startswith(prefix):
            clean_query = clean_query[len(prefix):].strip()

    if not clean_query:
        clean_query = "State-of-the-art developments in modern computing and AI"

    from google import genai
    from google.genai import types
    import asyncio
    import json

    client = genai.Client(api_key=api_key)

    # Step 1: Decomposition
    step_msg_1 = f"🔬 **Step 1/3: Formulating research thesis & sub-queries for:** *\"{clean_query}\"*\n\n"
    if on_step:
        await on_step(step_msg_1)
    elif on_chunk:
        await on_chunk(step_msg_1)

    sub_queries = [clean_query]
    try:
        decomp_prompt = f"""You are a senior scientific research director.
Given this research topic: "{clean_query}"
Generate exactly 3 specific, diverse, highly targeted web search queries to gather comprehensive data, benchmarks, and latest findings across different dimensions.
Output strictly a JSON array of 3 strings: ["query1", "query2", "query3"]. Output JSON only."""

        decomp_res = await asyncio.wait_for(
            client.aio.models.generate_content(
                model="gemini-3.8-flash",
                contents=decomp_prompt
            ),
            timeout=20.0
        )
        if decomp_res and decomp_res.text:
            cleaned_json = decomp_res.text.strip()
            if cleaned_json.startswith("```"):
                cleaned_json = re.sub(r"^```(?:json)?|```$", "", cleaned_json, flags=re.MULTILINE).strip()
            parsed = json.loads(cleaned_json)
            if isinstance(parsed, list) and len(parsed) >= 2:
                sub_queries = [str(x) for x in parsed[:3]]
    except Exception as e:
        logger.warning("Query decomposition error: %s", e)
        sub_queries = [clean_query, f"{clean_query} latest developments", f"{clean_query} analysis comparison"]

    # Step 2: Parallel Grounded Search
    step_msg_2 = "🌐 **Step 2/3: Gathering real-time intelligence & cross-referencing sources:**\n"
    for sq in sub_queries:
        step_msg_2 += f"- 🔍 *Searching:* `{sq}`\n"
    step_msg_2 += "\n"
    if on_step:
        await on_step(step_msg_2)
    elif on_chunk:
        await on_chunk(step_msg_2)

    search_tasks = [fetch_live_web_search(sq) for sq in sub_queries]
    search_results_lists = await asyncio.gather(*search_tasks, return_exceptions=True)

    all_web_items = []
    seen_urls = set()
    for res_list in search_results_lists:
        if isinstance(res_list, list):
            for item in res_list:
                url = item.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_web_items.append(item)

    # Step 3: Synthesis Dossier Generation
    step_msg_3 = f"📑 **Step 3/3: Synthesizing publication-grade research dossier ({len(all_web_items)} sources indexed)...**\n\n---\n\n"
    if on_step:
        await on_step(step_msg_3)
    elif on_chunk:
        await on_chunk(step_msg_3)

    context_lines = []
    citation_lines = []
    for it in all_web_items[:12]:
        context_lines.append(f"- **{it['title']}** (URL: {it['url']}): {it['snippet']}")
        citation_lines.append(f"• [{it['title']}]({it['url']})")

    research_context = "\n".join(context_lines) if context_lines else "Foundational domain knowledge base."

    research_prompt = f"""[GROUNDED LIVE RESEARCH CONTEXT]
{research_context}

[USER RESEARCH DIRECTIVE]
Please conduct an exhaustive, publication-grade deep research study on:
"{clean_query}"

Synthesize all relevant findings, empirical comparisons, mathematical models (if applicable), and strategic recommendations adhering strictly to the Deep Research Report structure with Markdown tables and clear sections."""

    full_report = step_msg_1 + step_msg_2 + step_msg_3

    synthesis_accumulated = ""
    try:
        gen_config = types.GenerateContentConfig(
            system_instruction=PROMPT_RESEARCH,
            temperature=0.6,
            max_output_tokens=8192,
        )
        research_stream = await client.aio.models.generate_content_stream(
            model="gemini-3.8-flash",
            contents=[types.Content(role="user", parts=[types.Part.from_text(text=research_prompt)])],
            config=gen_config
        )
        async for chunk in research_stream:
            c_text = extract_chunk_text(chunk)
            if c_text:
                synthesis_accumulated += c_text
                if on_chunk:
                    await on_chunk(c_text)
    except Exception as e:
        logger.error("Deep research synthesis streaming error: %s", e)
        try:
            fallback = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model="gemini-3.8-flash",
                    contents=research_prompt,
                    config=types.GenerateContentConfig(system_instruction=PROMPT_RESEARCH)
                ),
                timeout=28.0
            )
            if fallback and fallback.text:
                synthesis_accumulated = fallback.text.strip()
                if on_chunk:
                    await on_chunk(synthesis_accumulated)
        except Exception as e2:
            synthesis_accumulated = f"⚠️ Deep Research synthesis failed: {e2}"
            if on_chunk:
                await on_chunk(synthesis_accumulated)

    if citation_lines and "Sources" not in synthesis_accumulated:
        unique_citations = list(dict.fromkeys(citation_lines))[:8]
        sources_block = "\n\n### 🌐 Verified Web Sources & Citations\n" + "\n".join(unique_citations)
        synthesis_accumulated += sources_block
        if on_chunk:
            await on_chunk(sources_block)

    full_report += synthesis_accumulated
    return full_report


async def ai_arcade_companion(
    user_id: int,
    db: Session,
    game_id: str,
    prompt: str,
    player_context: Optional[Dict[str, Any]] = None,
    previous_interaction_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Personalized Gemini 3.8 Flash Interactions companion tailored to UserAIPersona + live game telemetry."""
    persona = get_user_persona(user_id, db) or ""
    user = db.query(User).filter(User.id == user_id).first()
    display_name = (
        (player_context or {}).get("callsign")
        or (user.username if user else "Explorer")
    )
    playstyle = (player_context or {}).get("playstyle") or "Adaptive Strategist"
    character_name = (player_context or {}).get("character") or "Vanguard"
    prizes = (player_context or {}).get("prizes") or []
    score = (player_context or {}).get("score", 0)
    region = (player_context or {}).get("region", "")

    sys_instr = (
        f"You are the personalized AI companion inside ChatTornado Arcade for {display_name} "
        f"(Playstyle: {playstyle}, Selected Character: {character_name}).\n"
        f"Saved Personalization Profile:\n{persona or 'No prior profile saved; tailor warmly to playstyle.'}\n\n"
        f"Current Game: {game_id} | Score: {score} | Region: {region or 'N/A'} | "
        f"Prizes Unlocked ({len(prizes)}): {', '.join(prizes[:6]) or 'None yet'}.\n"
        "Respond concisely (under 75 words) in-character matching the game's aesthetic: "
        "restrained editorial observatory tone for AFTERSPACE, crisp high-tempo runner coach for Tornado Surfers."
    )

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    tool_actions: List[Dict[str, Any]] = []

    arcade_tools = [
        {
            "type": "function",
            "name": "set_temporal_state",
            "description": "Shifts the AFTERSPACE observatory world timeline between PAST, PRESENT, or FUTURE.",
            "parameters": {
                "type": "object",
                "properties": {"state_id": {"type": "string", "enum": ["PAST", "PRESENT", "FUTURE"]}},
                "required": ["state_id"],
            },
        },
        {
            "type": "function",
            "name": "set_waypoint_beacon",
            "description": "Sets a 3D sky waypoint beacon at an AFTERSPACE landmark or open-world region.",
            "parameters": {
                "type": "object",
                "properties": {
                    "target_id": {
                        "type": "string",
                        "enum": [
                            "int_ancient_structure",
                            "int_temporal_residue",
                            "int_coordinate_slab",
                            "int_tesseract",
                            "int_dimensional_gate",
                            "int_sundial_obelisk",
                            "int_echo_pillars",
                            "int_southern_beacon",
                            "sundial_basin",
                            "echo_pillars",
                        ],
                    },
                    "label": {"type": "string"},
                },
                "required": ["target_id"],
            },
        },
        {
            "type": "function",
            "name": "toggle_scanner",
            "description": "Toggles the optical temporal residue scanner in AFTERSPACE.",
            "parameters": {
                "type": "object",
                "properties": {"active": {"type": "boolean"}},
                "required": ["active"],
            },
        },
        {
            "type": "function",
            "name": "launch_arcade_game",
            "description": "Switches or launches a recommended game in ChatTornado Arcade.",
            "parameters": {
                "type": "object",
                "properties": {
                    "game_id": {
                        "type": "string",
                        "enum": [
                            "snake",
                            "flappy",
                            "2048",
                            "memory",
                            "zombie",
                            "neondodge",
                            "neonblade",
                            "subwaysurfers",
                            "vortexbastion",
                            "nullnorth",
                            "afterspace",
                            "crownchess",
                            "photonpong",
                            "cybertetris",
                            "crowncheckers",
                            "prismbreakout",
                            "asteroidsnova",
                            "connect4",
                            "reversi",
                            "navalsonar",
                            "cybermines",
                            "sudokuzen",
                            "synthrhythm",
                            "gravitydrop",
                            "orbitalslingshot",
                            "hypertunnel",
                            "laserbastion",
                            "polardefender",
                            "astrominer",
                            "ricochetarena",
                            "railswitcher",
                            "wavesurfer",
                            "mirrordash",
                            "chronosniper",
                            "circuitflow",
                            "nonogram",
                            "lightsprism",
                            "knighttour",
                            "slidingcipher",
                            "target24",
                            "simonaurora",
                            "binarylock",
                            "primesieve",
                            "anagramforge",
                            "mancalanexus",
                            "nimcyber",
                            "hextactics",
                            "blackjack21",
                            "gomoku",
                            "pinballvortex",
                            "towerstack",
                            "golfsynth",
                            "helixbounce",
                            "swarmcommander",
                        ],
                    }
                },
                "required": ["game_id"],
            },
        },
    ]

    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            kwargs: Dict[str, Any] = {
                "model": "gemini-3.8-flash",
                "system_instruction": sys_instr,
                "input": prompt,
                "tools": arcade_tools,
                "generation_config": {"max_output_tokens": 240},
            }
            if previous_interaction_id:
                kwargs["previous_interaction_id"] = previous_interaction_id
            interaction = client.interactions.create(**kwargs)

            fn_results = []
            for step in getattr(interaction, "steps", []) or []:
                if getattr(step, "type", None) == "function_call":
                    fname = getattr(step, "name", None)
                    fargs = getattr(step, "arguments", {}) or {}
                    tool_actions.append({"name": fname, "arguments": fargs})
                    fn_results.append({
                        "type": "function_result",
                        "call_id": getattr(step, "id", ""),
                        "name": fname,
                        "result": f"Executed {fname} in game client cleanly.",
                    })

            if fn_results:
                interaction = client.interactions.create(
                    model="gemini-3.8-flash",
                    system_instruction=sys_instr,
                    previous_interaction_id=getattr(interaction, "id", None),
                    input=fn_results,
                    tools=arcade_tools,
                    generation_config={"max_output_tokens": 180},
                )

            reply = (getattr(interaction, "output_text", None) or "").strip()
            if reply or tool_actions:
                return {
                    "reply": reply or f"Instrument command ready: {tool_actions[0]['name']}.",
                    "interaction_id": getattr(interaction, "id", None),
                    "model": "gemini-3.8-flash",
                    "personalized": True,
                    "tool_actions": tool_actions,
                }
        except Exception as exc:
            logger.warning("Interactions API companion fallback: %s", exc)

    # Fully personalized offline fallback driven by UserAIPersona + live player context
    if game_id == "afterspace":
        hint_line = (
            "Shifting Temporal State to PAST (T - 100) or FUTURE (T + 100) restores the fractured span into Region 02."
            if region == "The Forgotten Gateway"
            else "Align Central Hypercube planes XW near 045° and YW near 035° to unlock the northern threshold."
        )
        reply = (
            f"{display_name} ({character_name}) — as a {playstyle}, your instrument log holds "
            f"{len(prizes)} specimens. Observation note: {hint_line}"
        )
    else:
        next_goal = (
            "Keep chaining rooftop trains and Hoverboard Shield blasts to raise your Coin & Score multiplier."
            if playstyle == "Speedrunner"
            else "Sweep rooftop coin lines with Magnet active to unlock Solar Flare, Glacier Phantom, and Singularity Chrono."
        )
        reply = (
            f"Locked in with you, {display_name} ({character_name})! {len(prizes)} Vault Prizes secured "
            f"(Best {score}). {next_goal}"
        )

    return {
        "reply": reply,
        "interaction_id": None,
        "model": "personalized-local",
        "personalized": True,
        "tool_actions": tool_actions,
    }


def create_live_ephemeral_token(
    user_id: int,
    db: Session,
    game_id: str = "subwaysurfers",
    extended_thinking: bool = False,
) -> Dict[str, Any]:
    """Mints a single-use Gemini 3.8 Live ephemeral auth token for low-latency client WebSocket voice."""
    model_name = "gemini-3.8-live-extended-thinking" if extended_thinking else "gemini-3.8-live"
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return {"available": False, "reason": "GEMINI_API_KEY not configured", "model": model_name}

    persona = get_user_persona(user_id, db) or ""
    sys_text = (
        f"You are a crisp, engaging real-time voice co-pilot inside ChatTornado Arcade ({game_id}). "
        f"Give tactical callouts under 2 sentences matching player context: {persona[:300]}"
    )
    try:
        from google import genai
        client = genai.Client(api_key=api_key, http_options={"api_version": "v1alpha"})
        live_config: Dict[str, Any] = {
            "response_modalities": ["AUDIO"],
            "input_audio_transcription": {},
            "output_audio_transcription": {},
            "system_instruction": {"parts": [{"text": sys_text}]},
            "tools": [
                {
                    "function_declarations": [
                        {
                            "name": "set_temporal_state",
                            "description": "Shifts AFTERSPACE timeline between PAST, PRESENT, or FUTURE.",
                            "behavior": "NON_BLOCKING",
                            "parameters": {
                                "type": "object",
                                "properties": {"state_id": {"type": "string"}},
                                "required": ["state_id"],
                            },
                        },
                        {
                            "name": "set_waypoint_beacon",
                            "description": "Lights a 3D sky waypoint beacon in AFTERSPACE.",
                            "behavior": "NON_BLOCKING",
                            "parameters": {
                                "type": "object",
                                "properties": {"target_id": {"type": "string"}, "label": {"type": "string"}},
                                "required": ["target_id"],
                            },
                        },
                        {
                            "name": "launch_arcade_game",
                            "description": "Switches or launches a ChatTornado Arcade game.",
                            "behavior": "NON_BLOCKING",
                            "parameters": {
                                "type": "object",
                                "properties": {"game_id": {"type": "string"}},
                                "required": ["game_id"],
                            },
                        },
                    ]
                }
            ],
        }
        if extended_thinking:
            live_config["thinking_config"] = {"thinking_level": "low"}
        token = client.auth_tokens.create(
            config={
                "uses": 1,
                "live_connect_constraints": {
                    "model": model_name,
                    "config": live_config,
                },
            }
        )
        return {
            "available": True,
            "token": getattr(token, "name", None),
            "model": model_name,
        }
    except Exception as exc:
        logger.warning("Gemini Live ephemeral token unavailable: %s", exc)
        return {"available": False, "reason": str(exc), "model": model_name}


async def ai_arcade_mission(
    user_id: int,
    db: Session,
    game_id: str = "auto",
    high_scores: Optional[Dict[str, Any]] = None,
    player_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Generates a personalized structured AI mission card via Gemini 3.8 Flash Interactions API."""
    import json

    persona = get_user_persona(user_id, db) or ""
    user = db.query(User).filter(User.id == user_id).first()
    callsign = (player_context or {}).get("callsign") or (user.username if user else "Explorer")
    playstyle = (player_context or {}).get("playstyle") or "Adaptive Strategist"
    scores = high_scores or {}

    mission_schema = {
        "type": "object",
        "properties": {
            "recommended_game": {"type": "string"},
            "title": {"type": "string"},
            "objective": {"type": "string"},
            "target_score": {"type": "integer"},
            "strategy_tip": {"type": "string"},
            "live_callout": {"type": "string"},
        },
        "required": ["recommended_game", "title", "objective", "target_score", "strategy_tip", "live_callout"],
    }

    prompt = (
        f"Create one personalized arcade challenge for {callsign} (Playstyle: {playstyle}). "
        f"Requested game: {game_id}. High scores JSON: {json.dumps(scores)}. "
        f"Saved persona: {persona[:240] or 'None'}. "
        "Keep title under 6 words, objective crisp, strategy_tip genuinely tactical, live_callout speakable aloud."
    )

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if api_key:
        try:
            from google import genai

            client = genai.Client(api_key=api_key)
            interaction = client.interactions.create(
                model="gemini-3.8-flash",
                input=prompt,
                response_format={
                    "type": "text",
                    "mime_type": "application/json",
                    "schema": mission_schema,
                },
                generation_config={"max_output_tokens": 300},
            )
            raw_text = (getattr(interaction, "output_text", None) or "").strip()
            if raw_text:
                data = json.loads(raw_text)
                return {**data, "model": "gemini-3.8-flash", "personalized": True}
        except Exception as exc:
            logger.warning("ai_arcade_mission structured output fallback: %s", exc)

    chosen = "subwaysurfers" if game_id == "auto" else game_id
    prev_best = int(scores.get(chosen, 0) or 0)
    target = max(1200, int(prev_best * 1.2) + 400)
    game_tips = {
        "afterspace": ("Shift Timeline across PAST/FUTURE & align XW 45° / YW 35°", "Quiet focus across four axes, Explorer."),
        "subwaysurfers": ("Chain ramp-to-train-roof runs & save Hoverboards for Express lanes", "Keep your momentum high on the train roofs!"),
        "vortexbastion": ("Combine Cryo slow towers with Tesla shields & Mortar splash", "Freeze the vanguard before they breach!"),
        "neonblade": ("Time releases through Razor Graze windows for Overdrive 2x", "Hold steady for the gold core window!"),
        "snake": ("Sweep perimeter lanes cleanly before carving inward", "Wide sweeps first, tight spirals second!"),
        "flappy": ("Collect Golden Wind Crystals inside gate centers for +3 streaks", "Feather your climb right through the crystal ring!"),
        "2048": ("Anchor your highest tile cleanly in one corner", "Lock the corner anchor and feed along one wall."),
        "memory": ("Reveal corners sequentially to lock fast streak multipliers", "Track your last three pairs carefully!"),
        "zombie": ("Kite swarms wide and trigger EMP bombs only when surrounded", "Circle wide and save your EMP!"),
        "neondodge": ("Skim laser wings close enough for +15 Graze combos with Shield up", "Ride the edge for graze points!"),
        "nullnorth": ("Sync terminal codes early before corruption spikes", "Relay the sequence to your squadmate!"),
        "crownchess": ("Contest the center early, develop knights before bishops, and castle for King safety", "Own the center squares and look two moves ahead!"),
    }
    tip, callout = game_tips.get(chosen, ("Chain combos and manage cooldowns cleanly.", "Lock in your next personal best!"))
    return {
        "recommended_game": chosen,
        "title": f"{callsign}'s {playstyle.split()[0]} Trial",
        "objective": f"Reach {target:,} pts using {playstyle} tactics.",
        "target_score": target,
        "strategy_tip": tip,
        "live_callout": f"{callsign}, {callout}",
        "model": "personalized-local",
        "personalized": True,
    }


async def ai_arcade_tts(
    text: str,
    style: str = "energetic yet concise",
    voice: str = "Kore",
) -> Dict[str, Any]:
    """Converts an Arcade AI line into WAV audio using Gemini 3.8 Flash TTS."""
    clean = (text or "").strip()[:360]
    if not clean:
        return {"available": False, "audio_base64": None, "mime_type": None}

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if api_key:
        try:
            from google import genai

            client = genai.Client(api_key=api_key)
            interaction = client.interactions.create(
                model="gemini-3.8-flash-tts",
                input=[
                    {
                        "type": "user_input",
                        "content": [
                            {
                                "type": "text",
                                "text": clean,
                                "annotations": [
                                    {
                                        "type": "speech_metadata",
                                        "style": style,
                                    }
                                ],
                            }
                        ],
                    }
                ],
                response_format={"type": "audio"},
                generation_config={
                    "speech_config": [{"voice": voice}],
                },
            )
            out_audio = getattr(interaction, "output_audio", None)
            if out_audio and getattr(out_audio, "data", None):
                return {
                    "available": True,
                    "audio_base64": out_audio.data,
                    "mime_type": getattr(out_audio, "mime_type", None) or "audio/wav",
                    "model": "gemini-3.8-flash-tts",
                }
        except Exception as exc:
            logger.warning("Gemini 3.8 TTS fallback: %s", exc)

    return {"available": False, "audio_base64": None, "mime_type": None, "model": "browser-tts-fallback"}


async def ai_arcade_emblem(
    user_id: int,
    db: Session,
    game_id: str = "afterspace",
    achievement: str = "Grandmaster Run",
    callsign: str = "Explorer",
) -> Dict[str, Any]:
    """Generates a custom Arcade trophy/profile emblem via Gemini Nano Banana 2.1."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    aesthetic = (
        "Quiet Cosmic Minimalism dark ink charcoal basalt brushed antique gold architectural crest, zero text"
        if game_id == "afterspace"
        else "Sleek geometric minimalist metallic arcade medallion emblem on deep emerald slate, zero text"
    )
    prompt = f"Create a clean square minimalist collector medallion icon for '{game_id}' ({achievement}) for {callsign}. Style: {aesthetic}."

    if api_key:
        try:
            from google import genai

            client = genai.Client(api_key=api_key)
            interaction = client.interactions.create(
                model="gemini-nano-banana-2.1",
                input=prompt,
                response_format={"type": "image"},
            )
            out_img = getattr(interaction, "output_image", None)
            if out_img and getattr(out_img, "data", None):
                return {
                    "available": True,
                    "image_base64": out_img.data,
                    "mime_type": getattr(out_img, "mime_type", None) or "image/png",
                    "model": "gemini-nano-banana-2.1",
                }
        except Exception as exc:
            logger.warning("Nano Banana 2.1 emblem fallback: %s", exc)

    return {
        "available": False,
        "image_base64": None,
        "mime_type": None,
        "model": "svg-local",
    }



