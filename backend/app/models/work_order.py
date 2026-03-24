"""Work Order and Running Account (RA) Billing models."""

import enum

from sqlalchemy import (
    Date,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin


class WorkOrderStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class RABillStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    VERIFIED = "VERIFIED"
    APPROVED = "APPROVED"
    PAID = "PAID"


class WorkOrder(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "work_orders"
    __table_args__ = (
        UniqueConstraint("org_id", "wo_number", name="uq_work_orders_org_number"),
    )

    project_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True
    )
    vendor_id: Mapped[str | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("vendors.id"), nullable=True
    )
    team_id: Mapped[str | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("labor_teams.id"), nullable=True
    )
    wo_number: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    scope_of_work: Mapped[str | None] = mapped_column(Text, nullable=True)
    contract_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    unit_rate: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    estimated_quantity: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[WorkOrderStatus] = mapped_column(
        Enum(WorkOrderStatus), default=WorkOrderStatus.DRAFT, nullable=False
    )
    linked_sprint_id: Mapped[str | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("sprints.id"), nullable=True
    )

    # Relationships
    ra_bills: Mapped[list["RABill"]] = relationship(
        "RABill", back_populates="work_order", cascade="all, delete-orphan"
    )


class RABill(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "ra_bills"

    work_order_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False
    )
    bill_number: Mapped[int] = mapped_column(Integer, nullable=False)
    period_from: Mapped[str] = mapped_column(Date, nullable=False)
    period_to: Mapped[str] = mapped_column(Date, nullable=False)
    quantity_executed: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    cumulative_quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    cumulative_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[RABillStatus] = mapped_column(
        Enum(RABillStatus), default=RABillStatus.SUBMITTED, nullable=False
    )

    # Relationships
    work_order: Mapped["WorkOrder"] = relationship("WorkOrder", back_populates="ra_bills")
