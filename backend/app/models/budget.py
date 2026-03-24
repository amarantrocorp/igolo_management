from __future__ import annotations

import enum
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.project import Project


class BudgetCategory(str, enum.Enum):
    MATERIAL = "MATERIAL"
    LABOR = "LABOR"
    SUBCONTRACTOR = "SUBCONTRACTOR"
    OVERHEAD = "OVERHEAD"
    CONTINGENCY = "CONTINGENCY"


class BudgetLineItem(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "budget_line_items"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    category: Mapped[BudgetCategory] = mapped_column(
        Enum(BudgetCategory), nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    budgeted_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project")
