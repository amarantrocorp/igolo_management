from pathlib import Path
from typing import Optional

from fastapi import BackgroundTasks
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from app.core.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_USER,
    MAIL_PASSWORD=settings.SMTP_PASSWORD,
    MAIL_FROM=settings.SMTP_USER or "noreply@intdesignerp.com",
    MAIL_PORT=settings.SMTP_PORT,
    MAIL_SERVER=settings.SMTP_HOST,
    MAIL_FROM_NAME=settings.EMAILS_FROM_NAME,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=bool(settings.SMTP_USER),
    VALIDATE_CERTS=True,
    TEMPLATE_FOLDER=Path(__file__).parent.parent / "templates",
)

fm = FastMail(conf)


async def send_email_background(
    background_tasks: BackgroundTasks,
    subject: str,
    email_to: str,
    template_name: str,
    template_data: dict,
    file_path: Optional[str] = None,
):
    message = MessageSchema(
        subject=subject,
        recipients=[email_to],
        template_body=template_data,
        subtype=MessageType.html,
    )
    if file_path:
        message.attachments = [file_path]

    background_tasks.add_task(fm.send_message, message, template_name=template_name)
