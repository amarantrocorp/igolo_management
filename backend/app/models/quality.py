from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.project import Project, Sprint
    from app.models.user import User


class InspectionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class ChecklistItemStatus(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    NA = "NA"
    PENDING = "PENDING"


class SnagSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class SnagStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    VERIFIED = "VERIFIED"


class Inspection(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "inspections"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    sprint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sprints.id"), nullable=False
    )
    inspector_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[InspectionStatus] = mapped_column(
        Enum(InspectionStatus),
        default=InspectionStatus.DRAFT,
        nullable=False,
    )
    inspection_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    overall_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project")
    sprint: Mapped["Sprint"] = relationship("Sprint")
    inspector: Mapped["User"] = relationship("User")
    checklist_items: Mapped[List["InspectionItem"]] = relationship(
        "InspectionItem",
        back_populates="inspection",
        cascade="all, delete-orphan",
    )


class InspectionItem(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "inspection_items"

    inspection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inspections.id", ondelete="CASCADE"),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[ChecklistItemStatus] = mapped_column(
        Enum(ChecklistItemStatus),
        default=ChecklistItemStatus.PENDING,
        nullable=False,
    )
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    inspection: Mapped["Inspection"] = relationship(
        "Inspection", back_populates="checklist_items"
    )


class SnagItem(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "snag_items"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    sprint_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sprints.id"), nullable=True
    )
    inspection_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inspections.id"), nullable=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[SnagSeverity] = mapped_column(Enum(SnagSeverity), nullable=False)
    status: Mapped[SnagStatus] = mapped_column(
        Enum(SnagStatus), default=SnagStatus.OPEN, nullable=False
    )
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    assigned_to_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project")
    sprint: Mapped[Optional["Sprint"]] = relationship("Sprint")
    inspection: Mapped[Optional["Inspection"]] = relationship("Inspection")
    assigned_to: Mapped[Optional["User"]] = relationship("User")
