from __future__ import annotations

import enum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.crm import Client, Lead
    from app.models.notification import Notification


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
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

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
