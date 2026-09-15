import os
import re
import uuid
import base64
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple, List

from sqlalchemy.orm import Session
from sqlalchemy import or_

from models import User, Message, MessageVisibility
from auth import hash_password

logger = logging.getLogger("chat_tornado.ai_service")

BOT_USERNAME = "VORTEX-9"
BOT_EMAIL = "vortex9@system.bot"
BOT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg?seed=VORTEX9&backgroundColor=080b1e"

VORTEX_SYSTEM_PROMPT = """You are VORTEX-9, an advanced autonomous synthetic intelligence and permanent companion in ChatTornado.
Your persona:
- Sharp, quick-witted, intellectually curious, futuristic, and friendly.
- Great with students, casual banter, creative ideas, coding, science, and gaming.
- Keep responses concise, vivid, and formatted with clean markdown when helpful (bullet points, bold highlights, short code blocks).
- Avoid overly long walls of text unless explicitly asked for a detailed explanation.
- If the user asks you to generate, draw, or create an image, inform them you can synthesize visual data directly or that they can use `/image <prompt>`.
"""


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


async def generate_ai_text(prompt: str, chat_history: List[dict]) -> str:
    """Generate conversational response using Gemini API."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return (
            "⚡ **VORTEX-9 Neural Link Offline**\n\n"
            "Gemini API key is not configured yet. Please add `GEMINI_API_KEY` to your backend environment (`.env`) to activate full conversational intelligence and image synthesis."
        )

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        # Build contents from history
        contents = []
        # Add past turns for context (up to last 8 messages)
        for h in chat_history[-8:]:
            role = "user" if h.get("is_user") else "model"
            text_content = h.get("text", "")
            if text_content:
                contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=text_content)]
                    )
                )

        # Add current user prompt
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)]
            )
        )

        # Try current models with fallback
        models_to_try = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-flash-latest"]
        last_error = None

        for model_name in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=VORTEX_SYSTEM_PROMPT,
                        temperature=0.75,
                        max_output_tokens=1024,
                    )
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                logger.warning("Gemini model %s error: %s", model_name, e)
                last_error = e
                continue

        if last_error:
            raise last_error

        return "⚡ Neural pulse processed, but output was empty. Try rephrasing your thought."

    except Exception as exc:
        logger.exception("Error calling Gemini text generation: %s", exc)
        return f"⚠️ **Neural Link Disruption**: {str(exc)}"


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
                    logger.warning("%s failed: %s", imagen_model, e2)

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

        logger.info("Saved AI generated image to %s", target_path)

        # Relative path served via FastAPI /uploads/ai/...
        image_rel_url = f"/uploads/ai/{file_name}"
        return f"{image_rel_url}\n\n🎨 *Generated by VORTEX-9:* \"{clean_prompt}\""

    except Exception as exc:
        logger.exception("Error during AI image generation: %s", exc)
        return f"⚠️ **Visual Core Anomaly**: {str(exc)}"


async def process_user_message_to_bot(user_id: int, message_text: str, db: Session) -> str:
    """Orchestrate AI response for a user message sent to VORTEX-9."""
    bot = get_or_create_bot_user(db)
    is_img, img_prompt = is_image_request(message_text)

    if is_img:
        return await generate_ai_image(img_prompt)

    # Collect recent conversation history between user and bot for context
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

    history = []
    for m in reversed(past_msgs):
        if not m.message:
            continue
        history.append({
            "is_user": m.sender_id == user_id,
            "text": m.message
        })

    return await generate_ai_text(message_text, history)
