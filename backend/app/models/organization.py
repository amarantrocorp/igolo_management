from __future__ import annotations

import enum
import uuid as _uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.user import UserRole

if TYPE_CHECKING:
    from app.models.user import User


class PlanTier(str, enum.Enum):
    FREE = "FREE"
    STARTER = "STARTER"
    PRO = "PRO"
    ENTERPRISE = "ENTERPRISE"


class SubscriptionStatus(str, enum.Enum):
    TRIAL = "TRIAL"
    ACTIVE = "ACTIVE"
    PAST_DUE = "PAST_DUE"
    CANCELLED = "CANCELLED"
    SUSPENDED = "SUSPENDED"


class Organization(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    gst_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    plan_tier: Mapped[PlanTier] = mapped_column(
        Enum(PlanTier), default=PlanTier.FREE, nullable=False
    )

    # SaaS / Multi-tenancy fields
    trial_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    subscription_status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus),
        default=SubscriptionStatus.TRIAL,
        nullable=False,
        server_default="TRIAL",
    )
    max_users: Mapped[int] = mapped_column(
        Integer, default=3, nullable=False, server_default="3"
    )
    max_projects: Mapped[int] = mapped_column(
        Integer, default=2, nullable=False, server_default="2"
    )

    # Feature toggles
    inventory_enabled: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, server_default="true"
    )

    # Schema-per-tenant: the PostgreSQL schema name for this tenant's data
    schema_name: Mapped[str | None] = mapped_column(
        String(100), unique=True, nullable=True
    )

    # Relationships
    memberships: Mapped[List["OrgMembership"]] = relationship(
        "OrgMembership", back_populates="organization", cascade="all, delete-orphan"
    )
    invitations: Mapped[List["OrgInvitation"]] = relationship(
        "OrgInvitation", back_populates="organization", cascade="all, delete-orphan"
    )


class OrgMembership(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "org_memberships"
    __table_args__ = (UniqueConstraint("user_id", "org_id", name="uq_user_org"),)

    user_id: Mapped[_uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    org_id: Mapped[_uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="memberships")
    organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="memberships"
    )


class OrgInvitation(Base, UUIDMixin):
    __tablename__ = "org_invitations"

    org_id: Mapped[_uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="SALES", nullable=False)
    token: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    accepted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    invited_by: Mapped[Optional[_uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="invitations"
    )
