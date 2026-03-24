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
    org_id: UUID,
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
        org_id=org_id,
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
    org_id: UUID,
    type: NotificationType,
    title: str,
    body: str,
    action_url: Optional[str] = None,
    email_template: Optional[str] = None,
    email_data: Optional[dict] = None,
):
    """Send notification + email to all active members with a given role in the org."""
    from app.models.organization import OrgMembership

    # Query org memberships for the given role within the org
    mem_result = await db.execute(
        select(OrgMembership).where(
            OrgMembership.org_id == org_id,
            OrgMembership.role == role,
            OrgMembership.is_active == True,  # noqa: E712
        )
    )
    memberships = mem_result.scalars().all()

    for membership in memberships:
        # Fetch user details for the email
        user_result = await db.execute(
            select(User).where(User.id == membership.user_id, User.is_active == True)  # noqa: E712
        )
        user = user_result.scalar_one_or_none()
        if not user:
            continue

        await create_notification(
            db=db,
            recipient_id=user.id,
            org_id=org_id,
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
    org_id: UUID,
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 50,
) -> List[Notification]:
    """List notifications for a user, optionally filtered to unread only."""
    query = select(Notification).where(
        Notification.recipient_id == user_id,
        Notification.org_id == org_id,
    )
    if unread_only:
        query = query.where(Notification.is_read == False)  # noqa: E712
    query = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_unread_count(db: AsyncSession, user_id: UUID, org_id: UUID) -> int:
    """Return the count of unread notifications for a user."""
    result = await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.recipient_id == user_id,
            Notification.org_id == org_id,
            Notification.is_read == False,  # noqa: E712
        )
    )
    return result.scalar() or 0


async def mark_as_read(
    db: AsyncSession, notification_id: UUID, user_id: UUID, org_id: UUID
) -> None:
    """Mark a single notification as read."""
    from app.core.exceptions import NotFoundException

    result = await db.execute(
        update(Notification)
        .where(
            Notification.id == notification_id,
            Notification.recipient_id == user_id,
            Notification.org_id == org_id,
        )
        .values(is_read=True)
    )
    if result.rowcount == 0:
        raise NotFoundException(detail="Notification not found")
    await db.commit()


async def mark_all_read(db: AsyncSession, user_id: UUID, org_id: UUID) -> None:
    """Mark all unread notifications as read for a user."""
    await db.execute(
        update(Notification)
        .where(
            Notification.recipient_id == user_id,
            Notification.org_id == org_id,
            Notification.is_read == False,  # noqa: E712
        )
        .values(is_read=True)
    )
    await db.commit()
