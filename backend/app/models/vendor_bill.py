"""Vendor bill management model."""

import enum

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin


class VendorBillStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    VERIFIED = "VERIFIED"
    APPROVED = "APPROVED"
    PAID = "PAID"
    DISPUTED = "DISPUTED"


class VendorBill(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "vendor_bills"

    vendor_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False, index=True,
    )
    po_id: Mapped[str | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("purchase_orders.id"), nullable=True,
    )
    bill_number: Mapped[str] = mapped_column(String(100), nullable=False)
    bill_date: Mapped[str] = mapped_column(Date, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[VendorBillStatus] = mapped_column(
        Enum(VendorBillStatus), default=VendorBillStatus.RECEIVED, nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
