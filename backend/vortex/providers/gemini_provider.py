"""Google Gemini Provider Adapter for VORTEX AI Orchestration Engine.
Supports flagship Gemini 3.8 Flash, 3.5 Flash, 3.1 Pro, streaming, vision, and REST fallbacks.
"""

import os
import re
import logging
from typing import List, Dict, Any, Optional, Callable
from .base import BaseAIProvider, ProviderCapabilities, AIRequest, AIResponse, TaskType

logger = logging.getLogger("chat_tornado.vortex.providers.gemini")

DEFAULT_GEMINI_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-pro-preview",
]


class GeminiProvider(BaseAIProvider):
    def __init__(self):
        super().__init__("google_gemini")
        self._cached_models: Optional[List[Dict[str, Any]]] = None

    def is_available(self) -> bool:
        return bool(os.getenv("GEMINI_API_KEY", "").strip())

    def get_capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            supports_text=True,
            supports_streaming=True,
            supports_vision=True,
            supports_tool_calling=True,
            supports_search_grounding=True,
            supports_json_schema=True,
            context_window_tokens=1000000,
            is_local=False,
            is_free_tier=True,
        )

    async def list_models(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        if self._cached_models and not force_refresh:
            return self._cached_models

        models = [
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
                "description": "Google's most capable reasoning engine for intricate programming and complex mathematics.",
                "context_length": 2000000,
                "pricing": {"is_free": True}
            }
        ]
        self._cached_models = models
        return models

    def _extract_chunk_text(self, chunk: Any) -> str:
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
                    collected = [str(getattr(p, "text", "")) for p in parts if getattr(p, "text", None)]
                    if collected:
                        return "".join(collected)
        except Exception:
            pass
        return ""

    async def generate_text(self, request: AIRequest) -> AIResponse:
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            return AIResponse(
                text="⚡ Google Gemini API key is not configured.",
                model_used="none",
                provider=self.name,
                success=False,
                error_message="GEMINI_API_KEY missing"
            )

        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        preferred = request.preferred_model if request.preferred_model in DEFAULT_GEMINI_MODELS else "gemini-3.8-flash"
        models_to_try = [preferred] + [m for m in DEFAULT_GEMINI_MODELS if m != preferred]

        # Prepare alternating contents
        contents = []
        for h in request.chat_history[-10:]:
            role = "user" if h.get("role") == "user" or h.get("is_user") else "model"
            txt = (h.get("text") or "").strip()
            if txt:
                contents.append(types.Content(role=role, parts=[types.Part.from_text(text=txt)]))

        user_parts = [types.Part.from_text(text=request.prompt)]
        contents.append(types.Content(role="user", parts=user_parts))

        for model_name in models_to_try:
            try:
                gen_config = types.GenerateContentConfig(
                    system_instruction=request.system_prompt or None,
                    temperature=request.temperature,
                    max_output_tokens=request.max_tokens,
                )
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=gen_config
                )
                if response and response.text:
                    return AIResponse(
                        text=response.text.strip(),
                        model_used=model_name,
                        provider=self.name,
                        success=True
                    )
            except Exception as e:
                logger.warning("GeminiProvider generate error with %s: %s", model_name, e)
                continue

        return AIResponse(
            text="⚠️ Gemini neural synthesis was unable to generate a response. Please check quota and status.",
            model_used=preferred,
            provider=self.name,
            success=False,
            error_message="All Gemini models failed"
        )

    async def stream_text(
        self,
        request: AIRequest,
        on_chunk: Optional[Callable[[str], Any]] = None
    ) -> AIResponse:
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            msg = "⚡ Google Gemini API key is not configured."
            if on_chunk:
                await on_chunk(msg)
            return AIResponse(text=msg, model_used="none", provider=self.name, success=False)

        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        preferred = request.preferred_model if request.preferred_model in DEFAULT_GEMINI_MODELS else "gemini-3.8-flash"
        models_to_try = [preferred] + [m for m in DEFAULT_GEMINI_MODELS if m != preferred]

        contents = []
        for h in request.chat_history[-10:]:
            role = "user" if h.get("role") == "user" or h.get("is_user") else "model"
            txt = (h.get("text") or "").strip()
            if txt:
                contents.append(types.Content(role=role, parts=[types.Part.from_text(text=txt)]))

        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=request.prompt)]))

        accumulated = ""
        for model_name in models_to_try:
            try:
                gen_config = types.GenerateContentConfig(
                    system_instruction=request.system_prompt or None,
                    temperature=request.temperature,
                    max_output_tokens=request.max_tokens,
                )
                response_stream = await client.aio.models.generate_content_stream(
                    model=model_name,
                    contents=contents,
                    config=gen_config
                )
                accumulated = ""
                async for chunk in response_stream:
                    chunk_text = self._extract_chunk_text(chunk)
                    if chunk_text:
                        accumulated += chunk_text
                        if on_chunk:
                            await on_chunk(chunk_text)

                if accumulated.strip():
                    return AIResponse(
                        text=accumulated,
                        model_used=model_name,
                        provider=self.name,
                        success=True
                    )
            except Exception as e:
                logger.warning("GeminiProvider stream error with %s: %s", model_name, e)
                continue

        # Fallback to non-stream if all streams fail
        fallback_res = await self.generate_text(request)
        if fallback_res.success and on_chunk:
            await on_chunk(fallback_res.text)
        return fallback_res
