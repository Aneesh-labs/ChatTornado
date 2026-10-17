"""OpenRouter Multi-Model Provider Adapter for VORTEX AI Orchestration Engine.
Supports dynamic model querying, DeepSeek, Claude, Qwen, and resilient SSE streaming.
"""

import os
import json
import logging
import httpx
from typing import List, Dict, Any, Optional, Callable
from .base import BaseAIProvider, ProviderCapabilities, AIRequest, AIResponse

logger = logging.getLogger("chat_tornado.vortex.providers.openrouter")

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"

DEFAULT_CODING_MODELS = [
    "deepseek/deepseek-chat",
    "anthropic/claude-3.7-sonnet",
    "qwen/qwen-2.5-coder-32b-instruct",
    "google/gemini-2.0-flash-001"
]


class OpenRouterProvider(BaseAIProvider):
    def __init__(self):
        super().__init__("openrouter")
        self._cached_models: Optional[List[Dict[str, Any]]] = None

    def is_available(self) -> bool:
        return bool(os.getenv("OPENROUTER_API_KEY", "").strip())

    def get_capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            supports_text=True,
            supports_streaming=True,
            supports_vision=True,
            supports_tool_calling=True,
            supports_search_grounding=False,
            supports_json_schema=True,
            context_window_tokens=200000,
            is_local=False,
            is_free_tier=False,
        )

    async def list_models(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        if self._cached_models and not force_refresh:
            return self._cached_models

        api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        headers = {
            "HTTP-Referer": "https://chattornado.vercel.app",
            "X-Title": "ChatTornado VORTEX"
        }
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(OPENROUTER_MODELS_URL, headers=headers)
                if res.status_code == 200:
                    raw_list = res.json().get("data", [])
                    models = []
                    for m in raw_list[:50]:
                        models.append({
                            "id": m.get("id"),
                            "name": m.get("name") or m.get("id"),
                            "description": m.get("description", ""),
                            "context_length": m.get("context_length", 32000),
                            "pricing": m.get("pricing", {}),
                            "is_free": float(m.get("pricing", {}).get("prompt", 0)) == 0.0
                        })
                    self._cached_models = models
                    return models
        except Exception as e:
            logger.warning("Failed to fetch live OpenRouter models: %s", e)

        # Fallback catalog
        fallback = [
            {"id": "deepseek/deepseek-chat", "name": "DeepSeek V3", "context_length": 64000, "is_free": False},
            {"id": "anthropic/claude-3.7-sonnet", "name": "Claude 3.7 Sonnet", "context_length": 200000, "is_free": False},
            {"id": "qwen/qwen-2.5-coder-32b-instruct", "name": "Qwen 2.5 Coder 32B", "context_length": 32000, "is_free": False},
        ]
        self._cached_models = fallback
        return fallback

    def _prepare_payload(self, request: AIRequest, model_name: str, stream: bool = False) -> Dict[str, Any]:
        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})

        for h in request.chat_history[-10:]:
            role = "user" if h.get("role") == "user" or h.get("is_user") else "assistant"
            txt = (h.get("text") or "").strip()
            if txt:
                messages.append({"role": role, "content": txt})

        messages.append({"role": "user", "content": request.prompt})

        return {
            "model": model_name,
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": stream
        }

    async def generate_text(self, request: AIRequest) -> AIResponse:
        api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        if not api_key:
            return AIResponse(
                text="⚡ OpenRouter API key is not configured.",
                model_used="none",
                provider=self.name,
                success=False,
                error_message="OPENROUTER_API_KEY missing"
            )

        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://chattornado.vercel.app",
            "X-Title": "ChatTornado VORTEX",
            "Content-Type": "application/json"
        }

        models_to_try = [request.preferred_model] if request.preferred_model else []
        for m in DEFAULT_CODING_MODELS:
            if m not in models_to_try:
                models_to_try.append(m)

        for model_name in models_to_try:
            try:
                payload = self._prepare_payload(request, model_name, stream=False)
                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(OPENROUTER_API_URL, json=payload, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        choices = data.get("choices", [])
                        if choices:
                            msg = choices[0].get("message", {}).get("content", "")
                            return AIResponse(text=msg.strip(), model_used=model_name, provider=self.name, success=True)
                    elif resp.status_code == 401:
                        return AIResponse(
                            text="⚠️ OpenRouter API Key is invalid or expired.",
                            model_used=model_name,
                            provider=self.name,
                            success=False,
                            error_message="401 Unauthorized"
                        )
            except Exception as e:
                logger.warning("OpenRouter generation failed with %s: %s", model_name, e)
                continue

        return AIResponse(
            text="⚠️ OpenRouter generation failed across all candidate models.",
            model_used=models_to_try[0] if models_to_try else "unknown",
            provider=self.name,
            success=False
        )

    async def stream_text(
        self,
        request: AIRequest,
        on_chunk: Optional[Callable[[str], Any]] = None
    ) -> AIResponse:
        api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        if not api_key:
            msg = "⚡ OpenRouter API key is not configured."
            if on_chunk:
                await on_chunk(msg)
            return AIResponse(text=msg, model_used="none", provider=self.name, success=False)

        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://chattornado.vercel.app",
            "X-Title": "ChatTornado VORTEX",
            "Content-Type": "application/json"
        }

        models_to_try = [request.preferred_model] if request.preferred_model else []
        for m in DEFAULT_CODING_MODELS:
            if m not in models_to_try:
                models_to_try.append(m)

        accumulated = ""
        for model_name in models_to_try:
            try:
                payload = self._prepare_payload(request, model_name, stream=True)
                accumulated = ""
                async with httpx.AsyncClient(timeout=45.0) as client:
                    async with client.stream("POST", OPENROUTER_API_URL, json=payload, headers=headers) as resp:
                        if resp.status_code != 200:
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
                                        content = delta.get("content") or delta.get("reasoning") or ""
                                        if content:
                                            accumulated += content
                                            if on_chunk:
                                                await on_chunk(content)
                                except Exception:
                                    continue

                if accumulated.strip():
                    return AIResponse(text=accumulated, model_used=model_name, provider=self.name, success=True)
            except Exception as e:
                logger.warning("OpenRouter stream failed with %s: %s", model_name, e)
                continue

        return AIResponse(
            text="⚠️ OpenRouter stream encountered connection disruption.",
            model_used=models_to_try[0] if models_to_try else "unknown",
            provider=self.name,
            success=False
        )
