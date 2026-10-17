"""VORTEX Intelligent Model Router.
Dynamically routes requests based on task complexity, capabilities, rate limits, and user preferences.
"""

import re
import logging
from typing import Dict, List, Optional, Tuple
from .providers.base import BaseAIProvider, AIRequest, TaskType
from .providers.gemini_provider import GeminiProvider
from .providers.openrouter_provider import OpenRouterProvider
from .providers.local_provider import LocalProvider

logger = logging.getLogger("chat_tornado.vortex.router")


class VortexModelRouter:
    def __init__(self):
        self.providers: Dict[str, BaseAIProvider] = {
            "google_gemini": GeminiProvider(),
            "openrouter": OpenRouterProvider(),
            "local_hardware": LocalProvider(),
        }

    def register_provider(self, key: str, provider: BaseAIProvider) -> None:
        self.providers[key] = provider

    def detect_task_type(self, prompt: str, ai_mode: str = "DEFAULT") -> TaskType:
        """Classifies incoming user directive into appropriate TaskType."""
        mode_upper = str(ai_mode).upper()
        if mode_upper == "CODING":
            return TaskType.CODING
        if mode_upper in ("RESEARCH", "EXECUTIVE"):
            return TaskType.RESEARCH
        if mode_upper == "ROAST":
            return TaskType.DEBATE

        lower = prompt.lower()
        if re.search(r'\b(def |class |function|import |const |async |react|html|css|sql|select \*|bug|syntaxerror)\b', lower):
            return TaskType.CODING
        if re.search(r'\b(prove|derive|mathematics|theorem|calculate step by step|logic puzzle|reasoning)\b', lower):
            return TaskType.REASONING
        if re.search(r'\b(summarize|action items|agenda|meeting notes|recap|bullet points)\b', lower):
            return TaskType.SUMMARIZATION
        if re.search(r'\b(debate|arbiter|who is right|who won|settle this)\b', lower):
            return TaskType.DEBATE
        if re.search(r'\b(image|picture|photo|draw|generate image)\b', lower):
            return TaskType.VISION

        return TaskType.CONVERSATION

    def route_request(self, request: AIRequest) -> Tuple[BaseAIProvider, str]:
        """
        Determines the optimal provider and model based on task type and availability.
        Returns: (provider_instance, resolved_model_name)
        """
        gemini = self.providers["google_gemini"]
        openrouter = self.providers["openrouter"]
        local = self.providers["local_hardware"]

        preferred = request.preferred_model

        # 1. Explicit local model request
        if preferred and preferred.startswith("local/"):
            if local.is_available():
                return local, preferred

        # 2. Explicit OpenRouter model request
        if preferred and ("/" in preferred and not preferred.startswith("gemini")):
            if openrouter.is_available():
                return openrouter, preferred
            logger.info("OpenRouter model requested but OpenRouter offline, falling back to Gemini.")

        # 3. Explicit Gemini model request
        if preferred and ("gemini" in preferred.lower()):
            if gemini.is_available():
                return gemini, preferred

        # 4. Task-based intelligent routing
        task = request.task_type or self.detect_task_type(request.prompt)

        # A. Coding task -> OpenRouter coder (e.g. DeepSeek/Qwen) if available, else Gemini
        if task == TaskType.CODING:
            if openrouter.is_available():
                return openrouter, "qwen/qwen-2.5-coder-32b-instruct"
            if gemini.is_available():
                return gemini, "gemini-3.8-flash"

        # B. Heavy reasoning task -> Gemini 3.1 Pro or DeepSeek
        if task == TaskType.REASONING:
            if gemini.is_available():
                return gemini, "gemini-3.1-pro-preview"
            if openrouter.is_available():
                return openrouter, "deepseek/deepseek-chat"

        # C. Default conversation & summarization -> Ultra-fast Gemini 3.8 Flash
        if gemini.is_available():
            return gemini, "gemini-3.8-flash"

        # D. Cloud fallback -> OpenRouter free/default
        if openrouter.is_available():
            return openrouter, "deepseek/deepseek-chat"

        # E. Local hardware fallback
        if local.is_available():
            return local, "local/llama3"

        # Return default gemini adapter (it will return clean error message if key missing)
        return gemini, "gemini-3.8-flash"


vortex_router = VortexModelRouter()

