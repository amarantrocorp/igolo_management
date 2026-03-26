from __future__ import annotations

import enum
import uuid
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    Date,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.crm import Client
    from app.models.finance import ProjectWallet
    from app.models.quotation import Quotation
    from app.models.user import User


class ProjectStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"


class SprintStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    DELAYED = "DELAYED"


class VOStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PAID = "PAID"


class Project(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    accepted_quotation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("quotations.id"), nullable=False
    )
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), default=ProjectStatus.NOT_STARTED, nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    total_project_value: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    manager_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    supervisor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    site_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    site_latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    site_longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    geofence_radius_meters: Mapped[int] = mapped_column(
        Integer, default=500, nullable=False, server_default="500"
    )
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    client: Mapped["Client"] = relationship("Client", back_populates="projects")
    accepted_quotation: Mapped["Quotation"] = relationship("Quotation")
    manager: Mapped[Optional["User"]] = relationship("User", foreign_keys=[manager_id])
    supervisor: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[supervisor_id]
    )
    sprints: Mapped[List["Sprint"]] = relationship(
        "Sprint", back_populates="project", cascade="all, delete-orphan"
    )
    variation_orders: Mapped[List["VariationOrder"]] = relationship(
        "VariationOrder", back_populates="project", cascade="all, delete-orphan"
    )
    daily_logs: Mapped[List["DailyLog"]] = relationship(
        "DailyLog", back_populates="project", cascade="all, delete-orphan"
    )
    wallet: Mapped[Optional["ProjectWallet"]] = relationship(
        "ProjectWallet", back_populates="project", uselist=False
    )


class Sprint(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "sprints"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[SprintStatus] = mapped_column(
        Enum(SprintStatus), default=SprintStatus.PENDING, nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    dependency_sprint_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sprints.id"), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    planned_quantity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    executed_quantity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    quantity_unit: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    completion_percentage: Mapped[float] = mapped_column(
        Float, default=0.0, nullable=False
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="sprints")
    dependency: Mapped[Optional["Sprint"]] = relationship(
        "Sprint", remote_side="Sprint.id"
    )


class VariationOrder(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "variation_orders"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    additional_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[VOStatus] = mapped_column(
        Enum(VOStatus), default=VOStatus.REQUESTED, nullable=False
    )
    linked_sprint_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sprints.id"), nullable=True
    )
    requested_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    supporting_doc_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project", back_populates="variation_orders"
    )
    linked_sprint: Mapped[Optional["Sprint"]] = relationship("Sprint")
    requested_by: Mapped["User"] = relationship("User")


class DailyLog(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "daily_logs"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    sprint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sprints.id"), nullable=False
    )
    logged_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False)
    blockers: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_urls: Mapped[Optional[list]] = mapped_column(ARRAY(String), nullable=True)
    visible_to_client: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="daily_logs")
    sprint: Mapped["Sprint"] = relationship("Sprint")
    logged_by: Mapped["User"] = relationship("User")
