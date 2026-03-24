from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_auth_context, AuthContext
from app.db.session import get_db
from app.schemas.notification import NotificationResponse
from app.services import notification_service

router = APIRouter()


@router.get(
    "",
    response_model=list[NotificationResponse],
    status_code=status.HTTP_200_OK,
)
async def list_notifications(
    unread_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List the current user's notifications."""
    return await notification_service.get_notifications(
        db=db,
        user_id=ctx.user.id,
        org_id=ctx.org_id,
        unread_only=unread_only,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/unread-count",
    status_code=status.HTTP_200_OK,
)
async def unread_count(
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Return the count of unread notifications for the current user."""
    count = await notification_service.get_unread_count(
        db=db, user_id=ctx.user.id, org_id=ctx.org_id
    )
    return {"count": count}


@router.patch(
    "/{notification_id}/read",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def mark_notification_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Mark a single notification as read."""
    await notification_service.mark_as_read(
        db=db, notification_id=notification_id,
        user_id=ctx.user.id, org_id=ctx.org_id
    )


@router.post(
    "/mark-all-read",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Mark all notifications as read for the current user."""
    await notification_service.mark_all_read(
        db=db, user_id=ctx.user.id, org_id=ctx.org_id
    )
