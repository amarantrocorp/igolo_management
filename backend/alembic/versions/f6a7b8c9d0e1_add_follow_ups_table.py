"""add follow_ups table

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-03-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enums
    followup_status = postgresql.ENUM(
        "PENDING", "COMPLETED", "CANCELLED", "RESCHEDULED",
        name="followupstatus",
    )
    followup_status.create(op.get_bind(), checkfirst=True)

    followup_type = postgresql.ENUM(
        "CALL", "SITE_VISIT", "MEETING", "EMAIL",
        name="followuptype",
    )
    followup_type.create(op.get_bind(), checkfirst=True)

    # Create table
    op.create_table(
        "follow_ups",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", followup_type, nullable=False),
        sa.Column("scheduled_date", sa.Date, nullable=False),
        sa.Column("scheduled_time", sa.String(10), nullable=True),
        sa.Column("assigned_to_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("status", followup_status, nullable=False, server_default="PENDING"),
        sa.Column("reminder", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("outcome_notes", sa.Text, nullable=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_follow_ups_lead", "follow_ups", ["lead_id"])
    op.create_index("ix_follow_ups_assigned", "follow_ups", ["assigned_to_id"])
    op.create_index("ix_follow_ups_date", "follow_ups", ["scheduled_date"])


def downgrade() -> None:
    op.drop_table("follow_ups")
    postgresql.ENUM(name="followupstatus").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="followuptype").drop(op.get_bind(), checkfirst=True)
