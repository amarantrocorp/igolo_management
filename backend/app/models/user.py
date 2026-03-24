from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.crm import Client, Lead
    from app.models.notification import Notification
    from app.models.organization import OrgMembership


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    MANAGER = "MANAGER"
    BDE = "BDE"
    SALES = "SALES"
    SUPERVISOR = "SUPERVISOR"
    CLIENT = "CLIENT"
    LABOR_LEAD = "LABOR_LEAD"


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    role: Mapped[Optional[UserRole]] = mapped_column(Enum(UserRole), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_platform_admin: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, server_default="false"
    )

    # Relationships
    leads_assigned: Mapped[List["Lead"]] = relationship(
        "Lead", back_populates="assigned_to", foreign_keys="Lead.assigned_to_id"
    )
    client_profile: Mapped[Optional["Client"]] = relationship(
        "Client", back_populates="user", uselist=False
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="recipient"
    )
    memberships: Mapped[List["OrgMembership"]] = relationship(
        "OrgMembership", back_populates="user"
    )
    password_reset_tokens: Mapped[List["PasswordResetToken"]] = relationship(
        "PasswordResetToken", back_populates="user"
    )


class PasswordResetToken(Base, UUIDMixin):
    __tablename__ = "password_reset_tokens"

    user_id: Mapped["uuid.UUID"] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    token: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="password_reset_tokens")
