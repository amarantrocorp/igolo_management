from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
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
    from app.models.inventory import Item
    from app.models.project import Project, Sprint
    from app.models.user import User


class MaterialRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    PARTIALLY_APPROVED = "PARTIALLY_APPROVED"
    REJECTED = "REJECTED"
    FULFILLED = "FULFILLED"


class MaterialRequest(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "material_requests"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    sprint_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sprints.id"), nullable=True
    )
    requested_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    status: Mapped[MaterialRequestStatus] = mapped_column(
        Enum(MaterialRequestStatus),
        default=MaterialRequestStatus.PENDING,
        nullable=False,
    )
    urgency: Mapped[str] = mapped_column(
        String(20), default="NORMAL", nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project")
    sprint: Mapped[Optional["Sprint"]] = relationship("Sprint")
    requested_by: Mapped["User"] = relationship(
        "User", foreign_keys=[requested_by_id]
    )
    approved_by: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[approved_by_id]
    )
    items: Mapped[List["MaterialRequestItem"]] = relationship(
        "MaterialRequestItem",
        back_populates="material_request",
        cascade="all, delete-orphan",
    )


class MaterialRequestItem(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "material_request_items"

    material_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("material_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("items.id"), nullable=False
    )
    quantity_requested: Mapped[float] = mapped_column(Float, nullable=False)
    quantity_approved: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    material_request: Mapped["MaterialRequest"] = relationship(
        "MaterialRequest", back_populates="items"
    )
    item: Mapped["Item"] = relationship("Item")
