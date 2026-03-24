from __future__ import annotations

import uuid as _uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OrgUsage(Base):
    __tablename__ = "org_usage"

    org_id: Mapped[_uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), primary_key=True
    )
    total_leads: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")
    total_projects: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")
    total_users: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")
    storage_used_bytes: Mapped[int] = mapped_column(
        BigInteger, default=0, nullable=False, server_default="0"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
