from __future__ import annotations

import enum
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


class TransactionCategory(str, enum.Enum):
    INFLOW = "INFLOW"
    OUTFLOW = "OUTFLOW"


class TransactionSource(str, enum.Enum):
    CLIENT = "CLIENT"
    VENDOR = "VENDOR"
    LABOR = "LABOR"
    PETTY_CASH = "PETTY_CASH"


class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    CLEARED = "CLEARED"
    REJECTED = "REJECTED"


class ProjectWallet(Base, TimestampMixin, TenantMixin):
    __tablename__ = "project_wallets"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), primary_key=True
    )
    total_agreed_value: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    total_received: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    total_spent: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    pending_approvals: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )

    @property
    def current_balance(self) -> Decimal:
        return self.total_received - self.total_spent

    @property
    def effective_balance(self) -> Decimal:
        return self.total_received - (self.total_spent + self.pending_approvals)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="wallet")


class Transaction(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "transactions"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    category: Mapped[TransactionCategory] = mapped_column(
        Enum(TransactionCategory), nullable=False
    )
    source: Mapped[TransactionSource] = mapped_column(
        Enum(TransactionSource), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reference_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Polymorphic linkage
    related_po_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("purchase_orders.id"), nullable=True
    )
    related_labor_log_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attendance_logs.id"), nullable=True
    )
    related_vo_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("variation_orders.id"), nullable=True
    )

    # Audit
    recorded_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    proof_doc_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus), default=TransactionStatus.PENDING, nullable=False
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project")
    recorded_by: Mapped["User"] = relationship("User")
