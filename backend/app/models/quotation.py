from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.crm import Lead
    from app.models.inventory import Item
    from app.models.user import User


class QuoteStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ARCHIVED = "ARCHIVED"


class Quotation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "quotations"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    status: Mapped[QuoteStatus] = mapped_column(
        Enum(QuoteStatus), default=QuoteStatus.DRAFT, nullable=False
    )
    valid_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Relationships
    lead: Mapped["Lead"] = relationship("Lead", back_populates="quotations")
    created_by: Mapped["User"] = relationship("User")
    rooms: Mapped[List["QuoteRoom"]] = relationship(
        "QuoteRoom", back_populates="quotation", cascade="all, delete-orphan"
    )


class QuoteRoom(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "quote_rooms"

    quotation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quotations.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    area_sqft: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    quotation: Mapped["Quotation"] = relationship("Quotation", back_populates="rooms")
    items: Mapped[List["QuoteItem"]] = relationship(
        "QuoteItem", back_populates="room", cascade="all, delete-orphan"
    )


class QuoteItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "quote_items"

    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quote_rooms.id", ondelete="CASCADE"),
        nullable=False,
    )
    inventory_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("items.id"), nullable=True
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="nos", nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    markup_percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    final_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Relationships
    room: Mapped["QuoteRoom"] = relationship("QuoteRoom", back_populates="items")
    inventory_item: Mapped[Optional["Item"]] = relationship("Item")
