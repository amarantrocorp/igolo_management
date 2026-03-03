from typing import List, Optional
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.email import send_email_fire_and_forget
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserRole


async def create_notification(
    db: AsyncSession,
    recipient_id: UUID,
    type: NotificationType,
    title: str,
    body: str,
    action_url: Optional[str] = None,
    email_subject: Optional[str] = None,
    email_template: Optional[str] = None,
    email_data: Optional[dict] = None,
) -> Notification:
    """Create an in-app notification and optionally send an email."""
    notification = Notification(
        recipient_id=recipient_id,
        type=type,
        title=title,
        body=body,
        action_url=action_url,
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)

    # Send email if template provided
    if email_template and email_data:
        result = await db.execute(select(User.email).where(User.id == recipient_id))
        email = result.scalar_one_or_none()
        if email:
            email_data.setdefault("subject", email_subject or title)
            email_data.setdefault("frontend_url", settings.FRONTEND_URL)
            send_email_fire_and_forget(
                subject=email_subject or title,
                email_to=email,
                template_name=email_template,
                template_data=email_data,
            )

    return notification


async def notify_role(
    db: AsyncSession,
    role: UserRole,
    type: NotificationType,
    title: str,
    body: str,
    action_url: Optional[str] = None,
    email_template: Optional[str] = None,
    email_data: Optional[dict] = None,
):
    """Send notification + email to all active users with a given role."""
    result = await db.execute(
        select(User).where(User.role == role, User.is_active == True)
    )
    users = result.scalars().all()
    for user in users:
        await create_notification(
            db=db,
            recipient_id=user.id,
            type=type,
            title=title,
            body=body,
            action_url=action_url,
            email_subject=title,
            email_template=email_template,
            email_data={**(email_data or {}), "recipient_name": user.full_name},
        )


async def get_notifications(
    db: AsyncSession,
    user_id: UUID,
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 50,
) -> List[Notification]:
    """List notifications for a user, optionally filtered to unread only."""
    query = select(Notification).where(Notification.recipient_id == user_id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    query = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_unread_count(db: AsyncSession, user_id: UUID) -> int:
    """Return the count of unread notifications for a user."""
    result = await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.recipient_id == user_id, Notification.is_read == False
        )
    )
    return result.scalar() or 0


async def mark_as_read(
    db: AsyncSession, notification_id: UUID, user_id: UUID
) -> None:
    """Mark a single notification as read."""
    await db.execute(
        update(Notification)
        .where(
            Notification.id == notification_id,
            Notification.recipient_id == user_id,
        )
        .values(is_read=True)
    )
    await db.commit()


async def mark_all_read(db: AsyncSession, user_id: UUID) -> None:
    """Mark all unread notifications as read for a user."""
    await db.execute(
        update(Notification)
        .where(
            Notification.recipient_id == user_id,
            Notification.is_read == False,
        )
        .values(is_read=True)
    )
    await db.commit()
