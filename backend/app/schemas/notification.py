from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.notification import NotificationType


class NotificationCreate(BaseModel):
    recipient_id: UUID
    type: NotificationType
    title: str
    body: str
    action_url: Optional[str] = None


class NotificationResponse(BaseModel):
    id: UUID
    recipient_id: UUID
    type: NotificationType
    title: str
    body: str
    action_url: Optional[str]
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
