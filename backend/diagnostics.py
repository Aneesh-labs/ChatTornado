"""
Diagnostic Observability & Structured Message Tracing for ChatTornado.
Provides unified, production-grade lifecycle tracking with correlation IDs.
"""

import logging
import traceback
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any

default_trace_logger = logging.getLogger("chat_tornado.trace")

# Sensitive fields to scrub from logs
SENSITIVE_KEYS = {"password", "token", "jwt", "authorization", "api_key", "secret", "gemini_api_key", "openrouter_api_key"}

def sanitize_data(data: Any) -> Any:
    """Recursively scrub sensitive keys from dictionaries or lists."""
    if isinstance(data, dict):
        clean = {}
        for k, v in data.items():
            if str(k).lower() in SENSITIVE_KEYS:
                clean[k] = "[REDACTED]"
            else:
                clean[k] = sanitize_data(v)
        return clean
    elif isinstance(data, list):
        return [sanitize_data(item) for item in data]
    return data

def generate_correlation_id(prefix: str = "msg") -> str:
    """Generate a unique correlation ID for tracing message operations."""
    return f"{prefix}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"

def log_message_event(
    *args,
    event_name: Optional[str] = None,
    correlation_id: Optional[str] = None,
    sender_id: Optional[int] = None,
    user_id: Optional[int] = None,
    receiver_id: Optional[int] = None,
    group_id: Optional[int] = None,
    message_id: Optional[int] = None,
    temp_id: Optional[str] = None,
    message_type: str = "USER",
    provider: Optional[str] = None,
    model: Optional[str] = None,
    status: str = "SUCCESS",
    details: Optional[Dict[str, Any]] = None,
    level: int = logging.INFO,
    **kwargs
) -> None:
    """
    Log an explicit lifecycle event in structured format.
    Format:
    [MESSAGE TRACE] event=<EVENT> correlation_id=<ID> message_id=<ID> sender_id=<ID> receiver_id=<ID> ...
    """
    target_logger = default_trace_logger

    # Parse positional arguments dynamically
    for arg in args:
        if isinstance(arg, logging.Logger):
            target_logger = arg
        elif isinstance(arg, str) and event_name is None:
            event_name = arg
        elif isinstance(arg, str) and correlation_id is None:
            correlation_id = arg

    event_name = event_name or "MESSAGE_EVENT"
    correlation_id = correlation_id or kwargs.get("corr_id") or generate_correlation_id()
    sender_id = sender_id if sender_id is not None else user_id

    now_iso = datetime.now(timezone.utc).isoformat()
    clean_details = sanitize_data(details or {})
    if temp_id:
        clean_details["temp_id"] = temp_id
    for k, v in kwargs.items():
        if k not in clean_details:
            clean_details[k] = v

    extra_info = []
    if group_id is not None:
        extra_info.append(f"group_id={group_id}")
    if provider:
        extra_info.append(f"provider={provider}")
    if model:
        extra_info.append(f"model={model}")
    if clean_details:
        extra_info.append(f"details={json.dumps(clean_details, default=str)}")

    extra_str = " ".join(extra_info)
    log_line = (
        f"[MESSAGE TRACE] event={event_name} correlation_id={correlation_id} "
        f"message_id={message_id or 'none'} sender_id={sender_id or 'none'} "
        f"receiver_id={receiver_id or 'none'} type={message_type} "
        f"status={status} timestamp={now_iso} {extra_str}".strip()
    )
    
    target_logger.log(level, log_line)


def log_message_error(
    *args,
    event_name: Optional[str] = None,
    correlation_id: Optional[str] = None,
    error: Optional[Any] = None,
    sender_id: Optional[int] = None,
    user_id: Optional[int] = None,
    receiver_id: Optional[int] = None,
    group_id: Optional[int] = None,
    message_id: Optional[int] = None,
    temp_id: Optional[str] = None,
    message_type: str = "USER",
    provider: Optional[str] = None,
    model: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    include_traceback: bool = True,
    **kwargs
) -> None:
    """
    Log a structured error event including exception type, message, and traceback.
    """
    target_logger = default_trace_logger
    for arg in args:
        if isinstance(arg, logging.Logger):
            target_logger = arg
        elif isinstance(arg, str) and event_name is None:
            event_name = arg
        elif (isinstance(arg, Exception) or isinstance(arg, str)) and error is None:
            error = arg
        elif isinstance(arg, str) and correlation_id is None:
            correlation_id = arg

    event_name = event_name or "MESSAGE_ERROR"
    correlation_id = correlation_id or generate_correlation_id()
    sender_id = sender_id if sender_id is not None else user_id

    error_type = type(error).__name__ if isinstance(error, Exception) else "Error"
    error_msg = str(error) if error is not None else "Unknown error"
    tb_str = traceback.format_exc() if include_traceback and isinstance(error, Exception) else None
    
    err_details = details or {}
    err_details["error_type"] = error_type
    err_details["error_message"] = error_msg
    if temp_id:
        err_details["temp_id"] = temp_id
    if tb_str:
        err_details["traceback"] = tb_str.strip().split("\n")[-3:]

    log_message_event(
        target_logger,
        event_name=event_name,
        correlation_id=correlation_id,
        sender_id=sender_id,
        receiver_id=receiver_id,
        group_id=group_id,
        message_id=message_id,
        message_type=message_type,
        provider=provider,
        model=model,
        status="ERROR",
        details=err_details,
        level=logging.ERROR,
        **kwargs
    )
