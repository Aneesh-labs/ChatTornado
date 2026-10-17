"""VORTEX AI Modular Provider Architecture - Base Classes & Interfaces.

Every AI provider (Google Gemini, OpenRouter, Local Ollama, etc.) inherits from BaseAIProvider
and implements standardized generation, streaming, capability detection, and error normalization.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Any, Optional, AsyncIterator, Callable
import logging

logger = logging.getLogger("chat_tornado.vortex.providers.base")


class TaskType(str, Enum):
    CONVERSATION = "conversation"
    REASONING = "reasoning"
    CODING = "coding"
    VISION = "vision"
    SUMMARIZATION = "summarization"
    DEBATE = "debate"
    SAFETY = "safety"
    RESEARCH = "research"


@dataclass
class ProviderCapabilities:
    supports_text: bool = True
    supports_streaming: bool = True
    supports_vision: bool = False
    supports_tool_calling: bool = False
    supports_search_grounding: bool = False
    supports_json_schema: bool = True
    context_window_tokens: int = 128000
    is_local: bool = False
    is_free_tier: bool = False


@dataclass
class AIRequest:
    prompt: str
    chat_history: List[Dict[str, Any]] = field(default_factory=list)
    system_prompt: str = ""
    preferred_model: Optional[str] = None
    task_type: TaskType = TaskType.CONVERSATION
    temperature: float = 0.7
    max_tokens: int = 4096
    images: List[Dict[str, Any]] = field(default_factory=list)
    allow_search_grounding: bool = False
    user_id: Optional[int] = None
    stream: bool = False


@dataclass
class AIResponse:
    text: str
    model_used: str
    provider: str
    success: bool = True
    error_message: Optional[str] = None
    citations: List[str] = field(default_factory=list)
    token_usage: Dict[str, int] = field(default_factory=dict)


class BaseAIProvider(ABC):
    """Abstract Base Class for all VORTEX AI Provider Adapters."""

    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def is_available(self) -> bool:
        """Returns True if the provider credentials/endpoints are active and reachable."""
        pass

    @abstractmethod
    def get_capabilities(self) -> ProviderCapabilities:
        """Reports concrete capabilities supported by this provider."""
        pass

    @abstractmethod
    async def list_models(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """Returns catalog of models available through this provider."""
        pass

    @abstractmethod
    async def generate_text(self, request: AIRequest) -> AIResponse:
        """Executes non-streaming text generation."""
        pass

    @abstractmethod
    async def stream_text(
        self,
        request: AIRequest,
        on_chunk: Optional[Callable[[str], Any]] = None
    ) -> AIResponse:
        """Executes real-time streaming text generation with callback."""
        pass
