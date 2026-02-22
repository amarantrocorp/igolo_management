from __future__ import annotations

import enum
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


class Item(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "items"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    base_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    selling_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    current_stock: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    reorder_level: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    suppliers: Mapped[List["VendorItem"]] = relationship(
        "VendorItem", back_populates="item"
    )
    stock_transactions: Mapped[List["StockTransaction"]] = relationship(
        "StockTransaction", back_populates="item"
    )


class Vendor(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "vendors"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_person: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    gst_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Relationships
    items_supplied: Mapped[List["VendorItem"]] = relationship(
        "VendorItem", back_populates="vendor"
    )
    purchase_orders: Mapped[List["PurchaseOrder"]] = relationship(
        "PurchaseOrder", back_populates="vendor"
    )


class VendorItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "vendor_items"

    vendor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("items.id"), nullable=False
    )
    vendor_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    lead_time_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="items_supplied")
    item: Mapped["Item"] = relationship("Item", back_populates="suppliers")


class POStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ORDERED = "ORDERED"
    RECEIVED = "RECEIVED"
    CANCELLED = "CANCELLED"


class PurchaseOrder(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "purchase_orders"

    vendor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False
    )
    status: Mapped[POStatus] = mapped_column(
        Enum(POStatus), default=POStatus.DRAFT, nullable=False
    )
    is_project_specific: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bill_document_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Relationships
    vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="purchase_orders")
    items: Mapped[List["POItem"]] = relationship(
        "POItem", back_populates="purchase_order", cascade="all, delete-orphan"
    )
    project: Mapped[Optional["Project"]] = relationship("Project")
    created_by: Mapped["User"] = relationship("User")


class POItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "po_items"

    purchase_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("items.id"), nullable=False
    )
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Relationships
    purchase_order: Mapped["PurchaseOrder"] = relationship(
        "PurchaseOrder", back_populates="items"
    )
    item: Mapped["Item"] = relationship("Item")


class StockTransactionType(str, enum.Enum):
    PURCHASE_IN = "PURCHASE_IN"
    PROJECT_ISSUE = "PROJECT_ISSUE"
    DAMAGED = "DAMAGED"
    RETURNED = "RETURNED"


class StockTransaction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "stock_transactions"

    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("items.id"), nullable=False
    )
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    transaction_type: Mapped[StockTransactionType] = mapped_column(
        Enum(StockTransactionType), nullable=False
    )
    reference_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    performed_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    unit_cost_at_time: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    item: Mapped["Item"] = relationship("Item", back_populates="stock_transactions")
    performed_by_user: Mapped["User"] = relationship("User")
