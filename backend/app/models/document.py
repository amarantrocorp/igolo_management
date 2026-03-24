"""Per-project document management model."""

import enum

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin


class DocumentCategory(str, enum.Enum):
    DRAWING = "DRAWING"
    BOQ = "BOQ"
    CONTRACT = "CONTRACT"
    PHOTO = "PHOTO"
    REPORT = "REPORT"
    INVOICE = "INVOICE"
    OTHER = "OTHER"


class ProjectDocument(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "project_documents"

    project_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[DocumentCategory] = mapped_column(
        Enum(DocumentCategory),
        default=DocumentCategory.OTHER,
        nullable=False,
    )
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_by_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
