"""
VORTEX Security Pipeline & Deterministic Event Moderation
Guards against prompt injection, credential exfiltration, and toxic payloads
with zero-latency regex matching and auditable security event logging.
"""

import re
import json
import logging
from typing import Optional, Tuple, Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session
from models import VortexSecurityAuditLog

logger = logging.getLogger("vortex.security")

# Fast compiled patterns for prompt injections
PROMPT_INJECTION_PATTERNS = [
    re.compile(r"(?i)\bignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions\b"),
    re.compile(r"(?i)\bdisregard\s+(?:all\s+)?(?:system|developer)\s+prompts?\b"),
    re.compile(r"(?i)\breveal\s+(?:the\s+)?(?:full\s+)?system\s+prompt\b"),
    re.compile(r"(?i)\byou\s+are\s+now\s+(?:DAN|jailbroken|unrestricted|in\s+developer\s+mode)\b"),
    re.compile(r"(?i)\bbypass\s+(?:all\s+)?(?:safety|content)\s+filters?\b"),
    re.compile(r"(?i)\bpretend\s+to\s+have\s+no\s+(?:ethics|rules|restrictions)\b"),
    re.compile(r"(?i)\[SYSTEM\s+OVERRIDE\]"),
]

# Sensitive credential leaks
CREDENTIAL_LEAK_PATTERNS = [
    (re.compile(r"AIzaSy[A-Za-z0-9_-]{33}"), "Google Gemini API Key"),
    (re.compile(r"sk-[A-Za-z0-9_-]{32,}"), "OpenAI/OpenRouter API Key"),
    (re.compile(r"ghp_[A-Za-z0-9]{36}"), "GitHub Personal Access Token"),
    (re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}"), "Slack Token"),
    (re.compile(r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----"), "Cryptographic Private Key"),
    (re.compile(r"eyJ[A-Za-z0-9-_]{10,}\.eyJ[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}"), "JWT Bearer Token"),
]


class SecurityScanResult:
    def __init__(self, passed: bool, action: str, reason: str = "", sanitized_text: str = "", metadata: Optional[Dict[str, Any]] = None):
        self.passed = passed
        self.action = action  # "ALLOW", "WARN", "BLOCK", "MASK"
        self.reason = reason
        self.sanitized_text = sanitized_text
        self.metadata = metadata or {}


def scan_user_input(
    text: str,
    user_id: Optional[int] = None,
    group_id: Optional[int] = None,
    db: Optional[Session] = None
) -> SecurityScanResult:
    """
    Scans incoming prompt text for security vulnerabilities.
    Logs deterministic security events to database if db session provided.
    """
    if not text or not isinstance(text, str):
        return SecurityScanResult(passed=True, action="ALLOW", sanitized_text=text or "")

    sanitized = text
    events_to_log: List[Tuple[str, str, str]] = []  # (event_type, severity, details)

    # 1. Credential / Secret Detection
    for pattern, cred_name in CREDENTIAL_LEAK_PATTERNS:
        matches = pattern.findall(sanitized)
        if matches:
            sanitized = pattern.sub("[REDACTED_CREDENTIAL]", sanitized)
            events_to_log.append((
                "CREDENTIAL_LEAK_PREVENTED",
                "CRITICAL",
                json.dumps({"credential_type": cred_name, "count": len(matches)})
            ))

    # 2. Prompt Injection Detection
    for pattern in PROMPT_INJECTION_PATTERNS:
        if pattern.search(text):
            events_to_log.append((
                "PROMPT_INJECTION_DETECTED",
                "WARNING",
                json.dumps({"pattern": pattern.pattern, "snippet": text[:120]})
            ))
            # Flag warning but allow sanitized query with neutralization prefix
            sanitized = f"[SECURITY NOTICE: The following user input contained adversarial instruction overrides that were neutralized by VORTEX Security Pipeline]\n{sanitized}"
            break

    # Persist audit records
    if db and events_to_log:
        try:
            for event_type, severity, details in events_to_log:
                log_entry = VortexSecurityAuditLog(
                    event_type=event_type,
                    severity=severity,
                    user_id=user_id,
                    group_id=group_id,
                    details=details,
                    created_at=datetime.utcnow()
                )
                db.add(log_entry)
            db.commit()
            logger.info("VORTEX Security Pipeline logged %d security event(s)", len(events_to_log))
        except Exception as err:
            logger.error("Failed to commit security audit log: %s", err)
            db.rollback()

    if any(sev == "CRITICAL" for _, sev, _ in events_to_log):
        return SecurityScanResult(
            passed=False,
            action="MASK",
            reason="Exposed private credential detected and redacted.",
            sanitized_text=sanitized,
            metadata={"events": [e[0] for e in events_to_log]}
        )

    return SecurityScanResult(
        passed=True,
        action="ALLOW" if not events_to_log else "WARN",
        reason="Security checks passed" if not events_to_log else "Adversarial patterns sanitized",
        sanitized_text=sanitized,
        metadata={"events": [e[0] for e in events_to_log]}
    )
