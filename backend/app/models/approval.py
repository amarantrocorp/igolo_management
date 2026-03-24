"""Multi-level approval models."""

import enum

from sqlalchemy import (
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin


class ApprovalEntityType(str, enum.Enum):
    PO = "PO"
    VO = "VO"
    EXPENSE = "EXPENSE"
    MATERIAL_REQUEST = "MATERIAL_REQUEST"
    INVOICE = "INVOICE"


class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ApprovalRule(Base, UUIDMixin, TimestampMixin, TenantMixin):
    """Configurable approval rules: for a given entity type and amount range,
    which roles need to approve."""

    __tablename__ = "approval_rules"

    entity_type: Mapped[ApprovalEntityType] = mapped_column(
        Enum(ApprovalEntityType), nullable=False, index=True
    )
    min_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    max_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    required_roles: Mapped[list[str]] = mapped_column(ARRAY(String(50)), nullable=False)


class ApprovalLog(Base, UUIDMixin, TimestampMixin, TenantMixin):
    """Tracks each approval step for a specific entity."""

    __tablename__ = "approval_logs"

    entity_type: Mapped[ApprovalEntityType] = mapped_column(
        Enum(ApprovalEntityType), nullable=False, index=True
    )
    entity_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=True), nullable=False, index=True
    )
    level: Mapped[int] = mapped_column(default=1, nullable=False)
    required_role: Mapped[str] = mapped_column(String(50), nullable=False)
    approver_id: Mapped[str | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False
    )
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
