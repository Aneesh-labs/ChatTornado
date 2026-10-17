"""Local Hardware Model Provider Adapter for VORTEX AI Orchestration Engine.
Supports local Ollama, vLLM, LM Studio, or LocalAI endpoints (default: http://localhost:11434).
Zero data leaves user device when local model is active.
"""

import os
import json
import logging
import httpx
from typing import List, Dict, Any, Optional, Callable
from .base import BaseAIProvider, ProviderCapabilities, AIRequest, AIResponse

logger = logging.getLogger("chat_tornado.vortex.providers.local")

DEFAULT_LOCAL_ENDPOINT = os.getenv("LOCAL_AI_ENDPOINT", "http://localhost:11434/v1")


class LocalProvider(BaseAIProvider):
    def __init__(self, endpoint: Optional[str] = None):
        super().__init__("local_hardware")
        self.endpoint = (endpoint or DEFAULT_LOCAL_ENDPOINT).rstrip("/")
        self._is_reachable: Optional[bool] = None

    def is_available(self) -> bool:
        # Check environment flag or quick ping
        enabled = os.getenv("ENABLE_LOCAL_MODELS", "false").lower() in ("true", "1", "yes")
        return enabled

    def get_capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            supports_text=True,
            supports_streaming=True,
            supports_vision=False,
            supports_tool_calling=False,
            supports_search_grounding=False,
            supports_json_schema=True,
            context_window_tokens=8192,
            is_local=True,
            is_free_tier=True,
        )

    async def list_models(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        url = f"{self.endpoint}/models"
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json().get("data", [])
                    return [
                        {
                            "id": f"local/{m.get('id', 'llama3')}",
                            "name": f"Local: {m.get('id', 'llama3')}",
                            "provider": "Local Hardware (Ollama/LM Studio)",
                            "description": "Private, zero-cloud model running completely offline on your hardware.",
                            "context_length": 8192,
                            "pricing": {"is_free": True}
                        }
                        for m in data
                    ]
        except Exception as e:
            logger.debug("Local AI endpoint not reachable: %s", e)

        return []

    async def generate_text(self, request: AIRequest) -> AIResponse:
        url = f"{self.endpoint}/chat/completions"
        target_model = request.preferred_model.replace("local/", "") if request.preferred_model else "llama3"

        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        for h in request.chat_history[-8:]:
            role = "user" if h.get("role") == "user" or h.get("is_user") else "assistant"
            txt = (h.get("text") or "").strip()
            if txt:
                messages.append({"role": role, "content": txt})
        messages.append({"role": "user", "content": request.prompt})

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    url,
                    json={
                        "model": target_model,
                        "messages": messages,
                        "stream": False,
                        "temperature": request.temperature
                    }
                )
                if resp.status_code == 200:
                    content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                    return AIResponse(text=content.strip(), model_used=f"local/{target_model}", provider=self.name, success=True)
        except Exception as e:
            logger.warning("Local AI generation error: %s", e)

        return AIResponse(
            text="⚠️ Local hardware endpoint is offline or not responding. Check Ollama/LM Studio status.",
            model_used=target_model,
            provider=self.name,
            success=False
        )

    async def stream_text(
        self,
        request: AIRequest,
        on_chunk: Optional[Callable[[str], Any]] = None
    ) -> AIResponse:
        url = f"{self.endpoint}/chat/completions"
        target_model = request.preferred_model.replace("local/", "") if request.preferred_model else "llama3"

        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        for h in request.chat_history[-8:]:
            role = "user" if h.get("role") == "user" or h.get("is_user") else "assistant"
            txt = (h.get("text") or "").strip()
            if txt:
                messages.append({"role": role, "content": txt})
        messages.append({"role": "user", "content": request.prompt})

        accumulated = ""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    url,
                    json={
                        "model": target_model,
                        "messages": messages,
                        "stream": True,
                        "temperature": request.temperature
                    }
                ) as resp:
                    if resp.status_code != 200:
                        return AIResponse(text="⚠️ Local stream failed", model_used=target_model, provider=self.name, success=False)

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
                                delta = chunk_json.get("choices", [{}])[0].get("delta", {})
                                chunk_text = delta.get("content", "")
                                if chunk_text:
                                    accumulated += chunk_text
                                    if on_chunk:
                                        await on_chunk(chunk_text)
                            except Exception:
                                continue

            if accumulated.strip():
                return AIResponse(text=accumulated, model_used=f"local/{target_model}", provider=self.name, success=True)
        except Exception as e:
            logger.warning("Local AI stream error: %s", e)

        return AIResponse(
            text="⚠️ Local hardware stream disrupted.",
            model_used=target_model,
            provider=self.name,
            success=False
        )
