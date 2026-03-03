import asyncio
import logging
from pathlib import Path
from typing import Optional

from fastapi import BackgroundTasks
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from app.core.config import settings

logger = logging.getLogger("app.email")

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


async def send_email(
    subject: str,
    email_to: str,
    template_name: str,
    template_data: dict,
    file_path: Optional[str] = None,
):
    """Send email directly. Silently fails if SMTP is not configured."""
    if not settings.SMTP_USER:
        print(f"[EMAIL] SMTP not configured, skipping email to {email_to}: {subject}")
        return
    try:
        print(f"[EMAIL] Sending email to {email_to}: {subject}")
        message = MessageSchema(
            subject=subject,
            recipients=[email_to],
            template_body=template_data,
            subtype=MessageType.html,
        )
        if file_path:
            message.attachments = [file_path]
        await fm.send_message(message, template_name=template_name)
        print(f"[EMAIL] Sent successfully to {email_to}")
    except Exception as e:
        print(f"[EMAIL] FAILED to send to {email_to}: {e}")


def _task_done_callback(task: asyncio.Task) -> None:
    """Log any unhandled exception from a fire-and-forget email task."""
    if task.cancelled():
        return
    exc = task.exception()
    if exc:
        print(f"[EMAIL] Fire-and-forget task error: {exc}")


def send_email_fire_and_forget(
    subject: str,
    email_to: str,
    template_name: str,
    template_data: dict,
    file_path: Optional[str] = None,
):
    """Schedule email sending as a fire-and-forget background task.

    Safe to call from any service function without needing BackgroundTasks.
    """
    try:
        loop = asyncio.get_running_loop()
        task = loop.create_task(
            send_email(subject, email_to, template_name, template_data, file_path)
        )
        task.add_done_callback(_task_done_callback)
    except RuntimeError:
        print(f"[EMAIL] No running event loop, cannot send email to {email_to}")


async def send_email_background(
    background_tasks: BackgroundTasks,
    subject: str,
    email_to: str,
    template_name: str,
    template_data: dict,
    file_path: Optional[str] = None,
):
    """Send email via FastAPI BackgroundTasks (legacy helper)."""
    message = MessageSchema(
        subject=subject,
        recipients=[email_to],
        template_body=template_data,
        subtype=MessageType.html,
    )
    if file_path:
        message.attachments = [file_path]

    background_tasks.add_task(fm.send_message, message, template_name=template_name)
