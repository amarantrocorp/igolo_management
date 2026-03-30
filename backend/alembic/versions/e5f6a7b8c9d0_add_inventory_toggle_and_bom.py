"""add inventory_enabled toggle and project_bom_items table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-03-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None

# BOM status enum
bom_status = postgresql.ENUM(
    "PENDING", "IN_STOCK", "ORDERED", "PARTIALLY_FULFILLED", "FULFILLED",
    name="bomstatus", create_type=False,
)


def upgrade() -> None:
    # 1. Add inventory_enabled to organizations (public schema)
    op.add_column(
        "organizations",
        sa.Column(
            "inventory_enabled",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
    )

    # 2. Create BOM status enum
    bom_status_enum = postgresql.ENUM(
        "PENDING", "IN_STOCK", "ORDERED", "PARTIALLY_FULFILLED", "FULFILLED",
        name="bomstatus",
    )
    bom_status_enum.create(op.get_bind(), checkfirst=True)

    # 3. Create project_bom_items table (will be created in tenant schemas
    #    by provisioner; this creates it in public for Alembic tracking)
    op.create_table(
        "project_bom_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("inventory_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("items.id"), nullable=True),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("category", sa.String(100), nullable=False, server_default="GENERAL"),
        sa.Column("quantity_required", sa.Float, nullable=False, server_default="0"),
        sa.Column("quantity_in_stock", sa.Float, nullable=False, server_default="0"),
        sa.Column("quantity_ordered", sa.Float, nullable=False, server_default="0"),
        sa.Column("quantity_issued", sa.Float, nullable=False, server_default="0"),
        sa.Column("unit", sa.String(20), nullable=False, server_default="nos"),
        sa.Column("estimated_unit_cost", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", bom_status, nullable=False, server_default="PENDING"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_bom_items_project", "project_bom_items", ["project_id"])
    op.create_index("ix_bom_items_inventory", "project_bom_items", ["inventory_item_id"])


def downgrade() -> None:
    op.drop_table("project_bom_items")
    postgresql.ENUM(name="bomstatus").drop(op.get_bind(), checkfirst=True)
    op.drop_column("organizations", "inventory_enabled")
