"""Asset/Equipment management models."""

import enum

from sqlalchemy import (
    Date,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin


class AssetCondition(str, enum.Enum):
    EXCELLENT = "EXCELLENT"
    GOOD = "GOOD"
    FAIR = "FAIR"
    POOR = "POOR"


class AssetStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    MAINTENANCE = "MAINTENANCE"
    RETIRED = "RETIRED"


class Asset(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "assets"
    __table_args__ = (
        UniqueConstraint("org_id", "serial_number", name="uq_assets_org_serial"),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    serial_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    purchase_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    purchase_cost: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    condition: Mapped[AssetCondition] = mapped_column(
        Enum(AssetCondition), default=AssetCondition.GOOD, nullable=False
    )
    status: Mapped[AssetStatus] = mapped_column(
        Enum(AssetStatus), default=AssetStatus.AVAILABLE, nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    usage_logs: Mapped[list["AssetUsageLog"]] = relationship(
        "AssetUsageLog", back_populates="asset", cascade="all, delete-orphan"
    )


class AssetUsageLog(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "asset_usage_logs"

    asset_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    assigned_date: Mapped[str] = mapped_column(Date, nullable=False)
    returned_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    condition_on_return: Mapped[AssetCondition | None] = mapped_column(
        Enum(AssetCondition), nullable=True
    )

    # Relationships
    asset: Mapped["Asset"] = relationship("Asset", back_populates="usage_logs")
