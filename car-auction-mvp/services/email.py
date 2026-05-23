import smtplib
from email.message import EmailMessage

from flask import current_app


def send_email(to_email: str, subject: str, body: str) -> bool:
    host = current_app.config.get("SMTP_HOST")
    username = current_app.config.get("SMTP_USERNAME")
    password = current_app.config.get("SMTP_PASSWORD")
    from_email = current_app.config.get("SMTP_FROM_EMAIL") or username

    if not host or not username or not password or not from_email:
        current_app.logger.info(
            "Email not configured. Message for %s: %s\n%s",
            to_email,
            subject,
            body,
        )
        return False

    port = int(current_app.config.get("SMTP_PORT", 587))
    use_tls = current_app.config.get("SMTP_USE_TLS", True)

    message = EmailMessage()
    message["From"] = from_email
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(host, port, timeout=15) as smtp:
        if use_tls:
            smtp.starttls()
        smtp.login(username, password)
        smtp.send_message(message)

    return True
