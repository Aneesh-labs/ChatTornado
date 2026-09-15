import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_verification_email(to_email: str, token: str):
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    email_from = os.getenv("EMAIL_FROM", "noreply@chattornado.com")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    if not all([smtp_server, smtp_port, smtp_user, smtp_password]):
        if os.getenv("ENVIRONMENT") == "production":
            raise Exception("SMTP is not configured. Cannot send email in production.")
        else:
            # Mock sending if no SMTP configured in development
            print(f"MOCK EMAIL: Verify {to_email} with token: {token}")
            print(f"MOCK URL: {frontend_url}/verify-email?token={token}")
            return

    verification_link = f"{frontend_url}/verify-email?token={token}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Verify your ChatTornado Account"
    msg["From"] = email_from
    msg["To"] = to_email

    text = f"Welcome to ChatTornado! Please verify your email by clicking the link: {verification_link}"
    html = f"""
    <html>
      <body>
        <h2>Welcome to ChatTornado!</h2>
        <p>Please click the button below to verify your email address:</p>
        <a href="{verification_link}" style="display:inline-block;padding:10px 20px;color:white;background-color:#6366f1;text-decoration:none;border-radius:5px;">Verify Email</a>
        <p>Or paste this link into your browser: <br>{verification_link}</p>
      </body>
    </html>
    """

    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")
    msg.attach(part1)
    msg.attach(part2)

    try:
        with smtplib.SMTP(smtp_server, int(smtp_port)) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(email_from, to_email, msg.as_string())
    except Exception as e:
        print(f"Error sending verification email: {e}")
