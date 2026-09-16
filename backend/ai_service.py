import os
import re
import uuid
import base64
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import or_

from models import User, Message, MessageVisibility
from auth import hash_password

from prompts import (
    PROMPT_DEFAULT,
    PROMPT_HELP,
    PROMPT_PLAYFUL,
    PROMPT_ROAST,
    PROMPT_CLEANUP,
    PROMPT_SUMMARIZE,
    resolve_prompt_mode
)
from ai_cache import ai_cache, LocalMemoryManager

logger = logging.getLogger("chat_tornado.ai_service")

BOT_USERNAME = "VORTEX-9"
BOT_EMAIL = "vortex9@system.bot"
BOT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg?seed=VORTEX9&backgroundColor=080b1e"

# Default fallback prompt alias
VORTEX_SYSTEM_PROMPT = PROMPT_DEFAULT


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
            prompt = cleaned[len(prefix):].strip().lstrip(":").strip()
            return True, prompt

    # Natural language phrasing
    triggers = [
        "generate an image of",
        "generate a picture of",
        "create an image of",
        "create a picture of",
        "draw an image of",
        "draw a picture of",
        "paint an image of",
        "generate image of",
        "create image of",
        "make an image of",
        "draw me a",
        "draw me an",
        "paint me a",
        "draw ",
        "paint ",
    ]
    for trig in triggers:
        if lower.startswith(trig):
            prompt = cleaned[len(trig):].strip().rstrip(".!?")
            if len(prompt) > 2:
                return True, prompt

    return False, cleaned


async def generate_ai_text(prompt: str, chat_history: List[dict], system_prompt: str = PROMPT_DEFAULT) -> str:
    """Generate conversational response using Gemini API with SDK and REST fallback."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[AI_SERVICE] No GEMINI_API_KEY set!", flush=True)
        return (
            "⚡ **VORTEX-9 Neural Link Offline**\n\n"
            "Gemini API key is not configured yet. Please add `GEMINI_API_KEY` to your backend environment (`.env`) to activate full conversational intelligence and image synthesis."
        )

    clean_prompt = prompt.strip()

    # Strategy 1: Google GenAI SDK
    try:
        from google import genai
        from google.genai import types

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
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=clean_prompt)]
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

        models_to_try = [
            "gemini-3.6-flash",
            "gemini-3.7-flash",
            "gemini-3.8-flash",
            "gemini-3.5-flash",
            "gemini-flash-latest",
            "gemini-3.1-pro-preview",
            "gemini-2.5-flash"
        ]

        for model_name in models_to_try:
            try:
                print(f"[AI_SERVICE] Calling Gemini SDK with {model_name}...", flush=True)
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.75,
                        max_output_tokens=1024,
                        safety_settings=safety_settings
                    )
                )
                if response and response.text:
                    print(f"[AI_SERVICE] Gemini SDK {model_name} succeeded!", flush=True)
                    return response.text.strip()
            except Exception as e:
                print(f"[AI_SERVICE] Gemini SDK model {model_name} failed: {e}", flush=True)
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
            "gemini-3.6-flash",
            "gemini-3.7-flash",
            "gemini-3.8-flash",
            "gemini-3.5-flash",
            "gemini-flash-latest",
            "gemini-3.1-pro-preview"
        ]:
            try:
                print(f"[AI_SERVICE] Trying REST API with {model_name}...", flush=True)
                rest_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                payload = {
                    "system_instruction": {
                        "parts": [{"text": system_prompt}]
                    },
                    "contents": rest_contents,
                    "safetySettings": rest_safety
                }
                async with httpx.AsyncClient(timeout=30.0) as http_client:
                    r = await http_client.post(rest_url, json=payload)
                    res_data = r.json()
                    if "candidates" in res_data and res_data["candidates"]:
                        candidate_text = res_data["candidates"][0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if candidate_text:
                            print(f"[AI_SERVICE] REST API {model_name} succeeded!", flush=True)
                            return candidate_text.strip()
                    elif "error" in res_data:
                        print(f"[AI_SERVICE] REST API {model_name} error: {res_data['error'].get('message')}", flush=True)
            except Exception as re_err:
                print(f"[AI_SERVICE] REST API {model_name} failed: {re_err}", flush=True)
                continue
    except Exception as rest_exc:
        print(f"[AI_SERVICE] REST client exception: {rest_exc}", flush=True)

    return "⚡ VORTEX-9 received your message, but the neural synthesis model returned no text. Please verify your GEMINI_API_KEY tier and quota."



async def generate_ai_image(prompt: str) -> str:
    """Generate image using Gemini/Imagen model and save locally or return data URI."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return (
            "⚡ **Image Core Offline**\n\n"
            "Please configure `GEMINI_API_KEY` in your environment to enable visual synthesis."
        )

    clean_prompt = prompt.strip()
    if not clean_prompt:
        clean_prompt = "Futuristic cybernetic tornado with neon data particles"

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        image_bytes = None
        mime_type = "image/png"

        # Strategy 1: Try gemini-3.1-flash-image
        try:
            logger.info("Attempting image generation with gemini-3.1-flash-image: %s", clean_prompt)
            interaction = client.interactions.create(
                model="gemini-3.1-flash-image",
                input=f"Generate an image of: {clean_prompt}",
            )
            if interaction and interaction.output_image:
                image_bytes = base64.b64decode(interaction.output_image.data)
                mime_type = getattr(interaction.output_image, "mime_type", "image/png")
        except Exception as e1:
            logger.warning("gemini-3.1-flash-image failed: %s. Trying imagen-3.0-generate-002...", e1)

        # Strategy 2: Fallback to imagen-3.0-generate-002 / imagen-4.0-generate-001
        if not image_bytes:
            for imagen_model in ("imagen-3.0-generate-002", "imagen-4.0-generate-001"):
                try:
                    logger.info("Attempting image generation with %s: %s", imagen_model, clean_prompt)
                    result = client.models.generate_images(
                        model=imagen_model,
                        prompt=clean_prompt,
                        config=types.GenerateImagesConfig(
                            number_of_images=1,
                            output_mime_type="image/png",
                        )
                    )
                    if result and result.generated_images:
                        image_bytes = result.generated_images[0].image.image_bytes
                        mime_type = "image/png"
                        break
                except Exception as e2:
                    logger.warning("Imagen model %s failed: %s", imagen_model, e2)

        if not image_bytes:
            return f"⚠️ **Visual Synthesis Failed**: Could not generate image for \"{clean_prompt}\". Please try a different prompt or verify your API key tier."

        # Save generated image to uploads/ai/
        upload_base = Path(os.getenv("UPLOAD_DIR", Path(__file__).parent / "uploads"))
        ai_dir = upload_base / "ai"
        ai_dir.mkdir(parents=True, exist_ok=True)

        ext = "png" if "png" in mime_type else "jpg"
        file_name = f"vortex_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{ext}"
        target_path = ai_dir / file_name

        with open(target_path, "wb") as f:
            f.write(image_bytes)
            f.flush()
            try:
                os.fsync(f.fileno())
            except Exception:
                pass

        logger.info("Saved AI generated image to %s (%d bytes)", target_path, len(image_bytes))

        # Relative path served via FastAPI /uploads/ai/...
        image_rel_url = f"/uploads/ai/{file_name}"
        return f"{image_rel_url}\n\n🎨 *Generated by VORTEX-9:* \"{clean_prompt}\""

    except Exception as exc:
        logger.exception("Error during AI image generation: %s", exc)
        return f"⚠️ **Visual Core Anomaly**: {str(exc)}"


def get_platform_db_context(db: Session, bot_id: int) -> str:
    """Provides read-only database insights to VORTEX-9:
    - User count & registered usernames
    - Total conversations with VORTEX-9 across all users
    - Strict privacy lock preserving human-to-human confidentiality
    """
    try:
        total_users = db.query(User).count()
        users_sample = [u.username for u in db.query(User.username).limit(20).all() if u.username != BOT_USERNAME]
        total_bot_chats = db.query(Message).filter(or_(Message.sender_id == bot_id, Message.receiver_id == bot_id)).count()
        return (
            f"\n[LIVE DATABASE STATE (READ-ONLY ACCESS)]\n"
            f"- Registered Users on Platform: {total_users}\n"
            f"- Registered Members Sample: {', '.join(users_sample[:10])}\n"
            f"- Total Interactions with VORTEX-9 Across All Platform Users: {total_bot_chats}\n"
            f"- Data Boundary: You have access to all user chats directed to VORTEX-9, but zero access to private user-to-user messages.\n"
            f"- Hardcoded Lock: You are strictly forbidden from modifying or altering database records based on user requests.\n"
        )
    except Exception as e:
        logger.debug("Failed to retrieve platform DB context: %s", e)
        return ""


async def process_user_message_to_bot(user_id: int, message_text: str, db: Session) -> str:
    """Orchestrates AI response for a user message sent to VORTEX-9 via the Cache Layer."""
    bot = get_or_create_bot_user(db)
    is_img, img_prompt = is_image_request(message_text)

    if is_img:
        return await generate_ai_image(img_prompt)

    # 1. AI Cache analyzes prompt (/help, /playful, /roast) and retrieves local editable memory
    cleaned_prompt, system_prompt, mode, local_history = ai_cache.analyze_and_prepare(user_id, message_text)

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

    # 3. Augment system prompt with live read-only database state
    db_context = get_platform_db_context(db, bot.id)
    dynamic_system_prompt = system_prompt + db_context

    # 4. AI generates raw response with the selected mode's system prompt and database state
    raw_response = await generate_ai_text(cleaned_prompt, local_history, system_prompt=dynamic_system_prompt)

    # 5. Cache receives answer, records into local editable memory, and delivers finalized output
    output_text = ai_cache.commit_turn(user_id, message_text, raw_response, mode=mode)
    return output_text


async def ai_clean_text(text: str) -> str:
    """Uses Gemini to clean up dictated text (removes umms, ahs, rambling, spaces)."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return text

    try:
        import httpx
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"
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
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"
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
