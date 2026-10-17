"""VORTEX AI Gateway.
Central entry point for all application AI features. Coordinates model routing,
provider execution, fallback failover, and response normalization.
"""

import logging
from typing import Optional, Callable, Dict, Any, List
from .providers.base import AIRequest, AIResponse, TaskType
from .router import VortexModelRouter

logger = logging.getLogger("chat_tornado.vortex.gateway")


class VortexAIGateway:
    def __init__(self):
        self.router = VortexModelRouter()

    async def execute(self, request: AIRequest) -> AIResponse:
        """Executes non-streaming AI request with intelligent provider fallback."""
        if not request.task_type:
            request.task_type = self.router.detect_task_type(request.prompt)

        provider, model_name = self.router.route_request(request)
        request.preferred_model = model_name

        logger.info("VORTEX Gateway routing to provider: %s, model: %s (task: %s)", provider.name, model_name, request.task_type)
        response = await provider.generate_text(request)

        # If primary provider fails and is not Gemini, attempt fallback to Gemini
        if not response.success and provider.name != "google_gemini":
            gemini = self.router.providers["google_gemini"]
            if gemini.is_available():
                logger.info("Primary provider %s failed, gracefully failing over to Google Gemini", provider.name)
                request.preferred_model = "gemini-3.8-flash"
                response = await gemini.generate_text(request)

        return response

    async def stream(
        self,
        request: AIRequest,
        on_chunk: Optional[Callable[[str], Any]] = None
    ) -> AIResponse:
        """Executes streaming AI request with intelligent provider fallback."""
        if not request.task_type:
            request.task_type = self.router.detect_task_type(request.prompt)

        provider, model_name = self.router.route_request(request)
        request.preferred_model = model_name

        logger.info("VORTEX Gateway streaming from provider: %s, model: %s (task: %s)", provider.name, model_name, request.task_type)
        response = await provider.stream_text(request, on_chunk=on_chunk)

        # Failover to Gemini if primary failed
        if not response.success and provider.name != "google_gemini":
            gemini = self.router.providers["google_gemini"]
            if gemini.is_available():
                logger.info("Primary stream provider %s failed, gracefully failing over to Google Gemini", provider.name)
                request.preferred_model = "gemini-3.8-flash"
                response = await gemini.stream_text(request, on_chunk=on_chunk)

        return response


# Global singleton gateway instance
vortex_gateway = VortexAIGateway()
