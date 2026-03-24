from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User


class NotificationType(str, enum.Enum):
    ALERT = "ALERT"
    APPROVAL_REQ = "APPROVAL_REQ"
    INFO = "INFO"
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED"


class Notification(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "notifications"

    recipient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    action_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    recipient: Mapped["User"] = relationship("User", back_populates="notifications")


class WhatsAppLog(Base, UUIDMixin, TimestampMixin):
    """Immutable log of every WhatsApp message sent via the Meta Cloud API."""

    __tablename__ = "whatsapp_logs"

    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    template_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="sent"
    )  # "sent", "failed", "delivered"
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
