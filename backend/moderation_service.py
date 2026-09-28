import os
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


async def analyze_report_with_ai(
    reported_username: str,
    category: str,
    description: Optional[str],
    message_text: Optional[str]
) -> Dict[str, Any]:
    """
    Evaluates reported content/user conduct using Google Gemini AI.
    Returns:
        {
            "severity": "low" | "medium" | "high" | "critical",
            "category": str,
            "confidence": float,
            "explanation": str,
            "auto_restrict": bool
        }
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        logger.warning("[MODERATION] GEMINI_API_KEY not configured. Falling back to rule-based moderation.")
        return rule_based_fallback(category, description, message_text)

    prompt = f"""
You are the ChatTornado Automated Content Safety & Moderation Classifier.
Analyze the following user report and content to evaluate risk severity, confidence, and recommended action.

Report Details:
- Target User: {reported_username}
- Claimed Category: {category}
- Reporter Description: {description or "None provided"}
- Context Message/Content: "{message_text or "No specific message attached"}"

Guidelines:
1. Severity levels:
   - "critical": Imminent violent threats, child exploitation, extreme hate speech, or severe credential harvesting.
   - "high": Repeated malicious harassment, scam links, hate speech, dox attempts.
   - "medium": Spam, offensive language, mild impersonation.
   - "low": Minor disagreement, misunderstandings, frivolous reports.
2. Confidence score: Float from 0.0 to 1.0 indicating your certainty.
3. Auto-restrict recommendation: Set true ONLY if severity is "critical" or "high" with confidence >= 0.82.
4. Output STRICT JSON only without Markdown backticks, matching this schema:
{{
    "severity": "low" | "medium" | "high" | "critical",
    "category": "{category}",
    "confidence": 0.90,
    "explanation": "concise explanation citing evidence",
    "auto_restrict": true | false
}}
"""

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=gemini_key)
        response = await client.aio.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json"
            )
        )

        raw_text = response.text or "{}"
        raw_text = raw_text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`").replace("json\n", "", 1).strip()

        data = json.loads(raw_text)
        sev = str(data.get("severity", "medium")).lower()
        if sev not in ["low", "medium", "high", "critical"]:
            sev = "medium"

        conf = float(data.get("confidence", 0.7))
        auto_rest = bool(data.get("auto_restrict", False)) or (sev in ["high", "critical"] and conf >= 0.82)

        return {
            "severity": sev,
            "category": data.get("category", category),
            "confidence": min(1.0, max(0.0, conf)),
            "explanation": data.get("explanation", "AI analyzed content against platform safety policies."),
            "auto_restrict": auto_rest
        }

    except Exception as e:
        logger.error(f"[MODERATION] AI Analysis error: {e}")
        return rule_based_fallback(category, description, message_text)


def rule_based_fallback(category: str, description: Optional[str], message_text: Optional[str]) -> Dict[str, Any]:
    cat = (category or "").lower()
    combined = f"{description or ''} {message_text or ''}".lower()

    critical_keywords = ["bomb", "kill you", "suicide", "murder", "weapon"]
    high_keywords = ["scam", "phishing", "steal", "hack", "dox", "nigger", "faggot", "child"]

    if any(k in combined for k in critical_keywords):
        return {
            "severity": "critical",
            "category": category,
            "confidence": 0.85,
            "explanation": "Keyword heuristics detected critical safety or threat language.",
            "auto_restrict": True
        }
    if any(k in combined for k in high_keywords) or cat in ["threatening behavior", "malicious links"]:
        return {
            "severity": "high",
            "category": category,
            "confidence": 0.80,
            "explanation": "Heuristic match for harassment or dangerous content pattern.",
            "auto_restrict": False
        }
    if cat in ["spam", "impersonation"]:
        return {
            "severity": "medium",
            "category": category,
            "confidence": 0.70,
            "explanation": "Flagged as suspected spam or impersonation requiring staff review.",
            "auto_restrict": False
        }

    return {
        "severity": "low",
        "category": category,
        "confidence": 0.60,
        "explanation": "Standard report received; queued for regular moderator assessment.",
        "auto_restrict": False
    }
