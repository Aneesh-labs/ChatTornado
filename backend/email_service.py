"""
email_service.py
================
Abstraction layer for sending transactional emails.

Provider priority:
  1. Resend  — if RESEND_API_KEY is set (production)
  2. SMTP    — if SMTP_SERVER / SMTP_PORT / SMTP_USER / SMTP_PASSWORD are all set (fallback)
  3. Mock    — in development; prints to stdout
  4. Crash   — in production if neither provider is configured

Environment variables
---------------------
RESEND_API_KEY      Resend API key  (re_xxxxxxxx)
EMAIL_FROM          Sender address  (e.g. "ChatTornado <noreply@yourdomain.com>")
FRONTEND_URL        Base URL of the frontend (e.g. https://chat-tornado.vercel.app)
ENVIRONMENT         Set to "production" on Render; anything else = dev mode

SMTP_SERVER         SMTP host (fallback if no Resend key)
SMTP_PORT           SMTP port (usually 587)
SMTP_USER           SMTP username
SMTP_PASSWORD       SMTP password
"""

import os
import logging

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _frontend_url() -> str:
    url = os.getenv("FRONTEND_URL", "https://chattornado.vercel.app").strip().rstrip("/")
    if url and not url.startswith("http://") and not url.startswith("https://"):
        url = f"https://{url}"
    return url


def _email_from() -> str:
    return os.getenv("EMAIL_FROM", "ChatTornado <noreply@chattornado.com>")


def _is_production() -> bool:
    return os.getenv("ENVIRONMENT", "development").lower() == "production"


def _build_html(verification_link: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your ChatTornado account</title>
</head>
<body style="margin:0;padding:0;background-color:#07090d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:40px 20px;text-align:center;">
        <table role="presentation" style="max-width:480px;margin:0 auto;background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1));text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                🌪️ ChatTornado
              </h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.4);">Email Verification</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <h2 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#ffffff;">
                Verify your email address
              </h2>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.5);">
                Thanks for signing up! Click the button below to verify your email address and activate your account. This link expires in 24 hours.
              </p>
              <div style="text-align:center;margin:28px 0;">
                <a href="{verification_link}"
                   style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">
                  Verify Email →
                </a>
              </div>
              <p style="margin:20px 0 0;font-size:12px;color:rgba(255,255,255,0.3);word-break:break-all;">
                Or paste this link into your browser:<br>
                <span style="color:rgba(99,102,241,0.7);">{verification_link}</span>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 40px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);">
                If you didn't create a ChatTornado account, you can safely ignore this email.<br>
                This link will expire in 24 hours.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _build_plain(verification_link: str) -> str:
    return (
        f"Welcome to ChatTornado!\n\n"
        f"Please verify your email address by visiting the link below:\n"
        f"{verification_link}\n\n"
        f"This link expires in 24 hours. If you didn't create an account, ignore this email."
    )


# ---------------------------------------------------------------------------
# Provider: Resend
# ---------------------------------------------------------------------------

def _send_via_resend(to_email: str, html: str, plain: str) -> None:
    """Send using the Resend API (https://resend.com)."""
    try:
        import resend  # type: ignore
    except ImportError:
        raise RuntimeError("resend package is not installed. Add 'resend' to requirements.txt.")

    api_key = os.getenv("RESEND_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("RESEND_API_KEY is not set.")

    resend.api_key = api_key

    params = {
        "from": _email_from(),
        "to": [to_email],
        "subject": "Verify your ChatTornado account",
        "html": html,
        "text": plain,
    }

    result = resend.Emails.send(params)

    # Resend returns {"id": "..."} on success
    if not result or "id" not in result:
        raise RuntimeError(f"Resend returned unexpected response: {result}")

    logger.info("Verification email sent via Resend to %s (id=%s)", to_email, result["id"])


# ---------------------------------------------------------------------------
# Provider: SMTP
# ---------------------------------------------------------------------------

def _send_via_smtp(to_email: str, html: str, plain: str) -> None:
    """Send using standard SMTP (starttls)."""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Verify your ChatTornado account"
    msg["From"] = _email_from()
    msg["To"] = to_email
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(smtp_server, smtp_port, timeout=15) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(_email_from(), to_email, msg.as_string())

    logger.info("Verification email sent via SMTP to %s", to_email)


# ---------------------------------------------------------------------------
# Public interface — called by auth_routes.py
# ---------------------------------------------------------------------------

def send_verification_email(to_email: str, token: str) -> None:
    """
    Send a verification email to *to_email*.

    Raises an exception in production if no provider is configured.
    Logs a mock URL in development if no provider is configured.
    """
    frontend_url = _frontend_url()
    verification_link = f"{frontend_url}/verify-email?token={token}"
    html = _build_html(verification_link)
    plain = _build_plain(verification_link)

    resend_key = os.getenv("RESEND_API_KEY", "").strip()
    smtp_configured = all([
        os.getenv("SMTP_SERVER"),
        os.getenv("SMTP_PORT"),
        os.getenv("SMTP_USER"),
        os.getenv("SMTP_PASSWORD"),
    ])

    # --- Try Resend first ---
    if resend_key:
        _send_via_resend(to_email, html, plain)
        return

    # --- Fall back to SMTP ---
    if smtp_configured:
        _send_via_smtp(to_email, html, plain)
        return

    # --- No provider configured ---
    if _is_production():
        raise RuntimeError(
            "No email provider configured. "
            "Set RESEND_API_KEY (recommended) or SMTP_* environment variables on Render."
        )

    # Development mock — print verification URL to server logs
    logger.warning("DEV MOCK — no email provider configured.")
    print(f"\n{'='*60}")
    print(f"[MOCK EMAIL] To: {to_email}")
    print(f"[MOCK EMAIL] Link: {verification_link}")
    print(f"{'='*60}\n")
