"""AI Cache & Local Editable Memory Layer for ChatTornado.

Acts as an intermediate buffer between user input, Gemini AI, and final output:
1. Analyzes prompt to detect purpose/mode (/help, /playful, /roast).
2. Loads editable local memory files from `backend/memories/memory_user_{id}.json`.
3. Assembles prompt & context to dispatch to Gemini.
4. Receives AI generation into cache buffer, records the turn into editable memory.
5. Emits the response to the output.
"""

import os
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

from prompts import resolve_prompt_mode, PROMPT_DEFAULT, PROMPT_CLEANUP, PROMPT_SUMMARIZE

logger = logging.getLogger("chat_tornado.ai_cache")

# Directory where editable user memory JSON files are stored
MEMORY_DIR = Path(os.getenv("MEMORY_DIR", Path(__file__).parent / "memories"))
MEMORY_DIR.mkdir(parents=True, exist_ok=True)


class LocalMemoryManager:
    """Manages locally stored, human-editable JSON memory files for each user."""

    @staticmethod
    def _get_memory_path(user_id: int) -> Path:
        return MEMORY_DIR / f"memory_user_{user_id}.json"

    @classmethod
    def load_memory(cls, user_id: int) -> Dict[str, Any]:
        """Loads memory JSON for a user. Creates default structure if not present."""
        path = cls._get_memory_path(user_id)
        if not path.exists():
            default_mem = {
                "user_id": user_id,
                "active_mode": "default",
                "custom_notes": "Feel free to edit this file to give VORTEX-9 permanent memories or custom facts!",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "history": []
            }
            cls.save_memory(user_id, default_mem)
            return default_mem

        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if not isinstance(data, dict):
                    data = {"user_id": user_id, "history": []}
                return data
        except Exception as e:
            logger.error("Failed to read memory file %s: %s", path, e)
            return {"user_id": user_id, "active_mode": "default", "history": []}

    @classmethod
    def save_memory(cls, user_id: int, data: Dict[str, Any]) -> bool:
        """Saves memory data to local JSON file."""
        path = cls._get_memory_path(user_id)
        try:
            data["updated_at"] = datetime.now(timezone.utc).isoformat()
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            logger.error("Failed to write memory file %s: %s", path, e)
            return False

    @classmethod
    def append_turn(cls, user_id: int, user_text: str, model_text: str, mode: str = "default") -> None:
        """Appends a complete interaction turn (user -> model) into local memory."""
        mem = cls.load_memory(user_id)
        now_iso = datetime.now(timezone.utc).isoformat()

        if user_text:
            mem.setdefault("history", []).append({
                "role": "user",
                "text": user_text,
                "mode": mode,
                "timestamp": now_iso
            })

        if model_text:
            mem.setdefault("history", []).append({
                "role": "model",
                "text": model_text,
                "timestamp": now_iso
            })

        # Cap local memory history at 50 most recent turns to maintain high quality
        if len(mem["history"]) > 50:
            mem["history"] = mem["history"][-50:]

        mem["active_mode"] = mode
        cls.save_memory(user_id, mem)

    @classmethod
    def get_recent_history(cls, user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieves formatted recent history for context injection."""
        mem = cls.load_memory(user_id)
        history = mem.get("history", [])
        return history[-limit:]

    @classmethod
    def get_active_mode(cls, user_id: int) -> str:
        """Gets user's current persistent persona mode."""
        mem = cls.load_memory(user_id)
        return mem.get("active_mode", "default")

    @classmethod
    def set_active_mode(cls, user_id: int, mode: str) -> None:
        """Updates user's persistent persona mode."""
        mem = cls.load_memory(user_id)
        mem["active_mode"] = mode
        cls.save_memory(user_id, mem)


class AICacheLayer:
    """Intermediate cache & buffer that analyzes input, coordinates prompts,

    queries Gemini, receives the answer into cache, and outputs to destination.
    """

    def __init__(self):
        self.memory_mgr = LocalMemoryManager()

    def analyze_and_prepare(self, user_id: int, message_text: str, ai_mode: str) -> Tuple[str, str, str, List[Dict[str, Any]]]:
        """Analyzes prompt purpose, selects prompt template, and prepares context from local memory.

        Returns:
            (cleaned_prompt, system_prompt, mode, recent_history)
        """
        cleaned_prompt, system_prompt, detected_mode = resolve_prompt_mode(message_text, ai_mode)
        history = self.memory_mgr.get_recent_history(user_id, limit=10)
        return cleaned_prompt, system_prompt, detected_mode, history

    def commit_turn(self, user_id: int, user_prompt: str, ai_response: str, mode: str) -> str:
        """Receives AI response into cache buffer, records into local memory, and returns output."""
        self.memory_mgr.append_turn(user_id, user_prompt, ai_response, mode=mode)
        return ai_response


# Global singleton instance of the AI Cache layer
ai_cache = AICacheLayer()
