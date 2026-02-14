from __future__ import annotations

import enum
import uuid
from datetime import date as date_type
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Date, Enum, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.quotation import Quotation
    from app.models.user import User


class LeadStatus(str, enum.Enum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    QUALIFIED = "QUALIFIED"
    QUOTATION_SENT = "QUOTATION_SENT"
    NEGOTIATION = "NEGOTIATION"
    CONVERTED = "CONVERTED"
    LOST = "LOST"


class PropertyType(str, enum.Enum):
    APARTMENT = "APARTMENT"
    VILLA = "VILLA"
    INDEPENDENT_HOUSE = "INDEPENDENT_HOUSE"
    PENTHOUSE = "PENTHOUSE"
    STUDIO = "STUDIO"
    OFFICE = "OFFICE"
    RETAIL = "RETAIL"
    OTHER = "OTHER"


class PropertyStatus(str, enum.Enum):
    UNDER_CONSTRUCTION = "UNDER_CONSTRUCTION"
    READY_TO_MOVE = "READY_TO_MOVE"
    OCCUPIED = "OCCUPIED"
    RENOVATION = "RENOVATION"


class SiteVisitAvailability(str, enum.Enum):
    WEEKDAYS = "WEEKDAYS"
    WEEKENDS = "WEEKENDS"
    ANYTIME = "ANYTIME"
    NOT_AVAILABLE = "NOT_AVAILABLE"


class Lead(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "leads"

    # ── Contact ──
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_number: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[LeadStatus] = mapped_column(
        Enum(LeadStatus), default=LeadStatus.NEW, nullable=False
    )
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Project Details (Enrichment) ──
    property_type: Mapped[Optional[PropertyType]] = mapped_column(
        Enum(PropertyType), nullable=True
    )
    property_status: Mapped[Optional[PropertyStatus]] = mapped_column(
        Enum(PropertyStatus), nullable=True
    )
    carpet_area: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    scope_of_work: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), nullable=True
    )
    floor_plan_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # ── Preferences ──
    budget_range: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    design_style: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    possession_date: Mapped[Optional[date_type]] = mapped_column(Date, nullable=True)
    site_visit_availability: Mapped[Optional[SiteVisitAvailability]] = mapped_column(
        Enum(SiteVisitAvailability), nullable=True
    )

    assigned_to_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Relationships
    assigned_to: Mapped["User"] = relationship(
        "User", back_populates="leads_assigned", foreign_keys=[assigned_to_id]
    )
    quotations: Mapped[List["Quotation"]] = relationship(
        "Quotation", back_populates="lead"
    )
    client: Mapped[Optional["Client"]] = relationship(
        "Client", back_populates="lead", uselist=False
    )


class Client(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "clients"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False
    )
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id"), unique=True, nullable=False
    )
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    gst_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="client_profile")
    lead: Mapped["Lead"] = relationship("Lead", back_populates="client")
    projects: Mapped[List["Project"]] = relationship("Project", back_populates="client")
