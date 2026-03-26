from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


class CheckInStatus(str, enum.Enum):
    CHECKED_IN = "CHECKED_IN"
    CHECKED_OUT = "CHECKED_OUT"


class CheckIn(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "check_ins"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    check_in_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    check_out_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    check_in_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    check_in_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    check_out_latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    check_out_longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    distance_from_site_meters: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[CheckInStatus] = mapped_column(
        Enum(CheckInStatus), default=CheckInStatus.CHECKED_IN, nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User")
    project: Mapped["Project"] = relationship("Project")
