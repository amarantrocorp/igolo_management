from __future__ import annotations

import enum
import uuid
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Date, Enum, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.project import Project, Sprint
    from app.models.user import User


class Specialization(str, enum.Enum):
    CIVIL = "CIVIL"
    CARPENTRY = "CARPENTRY"
    PAINTING = "PAINTING"
    ELECTRICAL = "ELECTRICAL"
    PLUMBING = "PLUMBING"
    GENERAL = "GENERAL"


class PaymentModel(str, enum.Enum):
    DAILY_WAGE = "DAILY_WAGE"
    CONTRACT_FIXED = "CONTRACT_FIXED"


class SkillLevel(str, enum.Enum):
    HELPER = "HELPER"
    SKILLED = "SKILLED"
    FOREMAN = "FOREMAN"


class AttendanceStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED_BY_MANAGER = "APPROVED_BY_MANAGER"
    PAID = "PAID"


class LaborTeam(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "labor_teams"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    leader_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    specialization: Mapped[Specialization] = mapped_column(
        Enum(Specialization), nullable=False
    )
    payment_model: Mapped[PaymentModel] = mapped_column(
        Enum(PaymentModel), nullable=False
    )
    default_daily_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    supervisor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    # Relationships
    workers: Mapped[List["Worker"]] = relationship(
        "Worker", back_populates="team", cascade="all, delete-orphan"
    )
    supervisor: Mapped[Optional["User"]] = relationship("User")
    attendance_logs: Mapped[List["AttendanceLog"]] = relationship(
        "AttendanceLog", back_populates="team"
    )


class Worker(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "workers"

    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("labor_teams.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    skill_level: Mapped[SkillLevel] = mapped_column(
        Enum(SkillLevel), default=SkillLevel.HELPER, nullable=False
    )
    daily_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Relationships
    team: Mapped["LaborTeam"] = relationship("LaborTeam", back_populates="workers")


class AttendanceLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "attendance_logs"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    sprint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sprints.id"), nullable=False
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("labor_teams.id"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    workers_present: Mapped[int] = mapped_column(Integer, nullable=False)
    total_hours: Mapped[float] = mapped_column(Float, default=8.0, nullable=False)
    calculated_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus), default=AttendanceStatus.PENDING, nullable=False
    )
    site_photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logged_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project")
    sprint: Mapped["Sprint"] = relationship("Sprint")
    team: Mapped["LaborTeam"] = relationship(
        "LaborTeam", back_populates="attendance_logs"
    )
    logged_by: Mapped["User"] = relationship("User")
