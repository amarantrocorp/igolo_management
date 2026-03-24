"""add_multi_tenancy

Revision ID: b4c7d2e8f103
Revises: a3f1c8d92b47
Create Date: 2026-03-03 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b4c7d2e8f103"
down_revision: Union[str, None] = "a3f1c8d92b47"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# ── Enum types for new tables ────────────────────────────────────────────
plantier = postgresql.ENUM(
    "FREE",
    "STARTER",
    "PRO",
    "ENTERPRISE",
    name="plantier",
    create_type=False,
)
materialrequeststatus = postgresql.ENUM(
    "PENDING",
    "APPROVED",
    "PARTIALLY_APPROVED",
    "REJECTED",
    "FULFILLED",
    name="materialrequeststatus",
    create_type=False,
)
inspectionstatus = postgresql.ENUM(
    "DRAFT",
    "IN_PROGRESS",
    "COMPLETED",
    name="inspectionstatus",
    create_type=False,
)
checklistitemstatus = postgresql.ENUM(
    "PASS",
    "FAIL",
    "NA",
    "PENDING",
    name="checklistitemstatus",
    create_type=False,
)
snagseverity = postgresql.ENUM(
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
    name="snagseverity",
    create_type=False,
)
snagstatus = postgresql.ENUM(
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
    "VERIFIED",
    name="snagstatus",
    create_type=False,
)
budgetcategory = postgresql.ENUM(
    "MATERIAL",
    "LABOR",
    "SUBCONTRACTOR",
    "OVERHEAD",
    "CONTINGENCY",
    name="budgetcategory",
    create_type=False,
)
invoicestatus = postgresql.ENUM(
    "DRAFT",
    "SENT",
    "PAID",
    "OVERDUE",
    "CANCELLED",
    name="invoicestatus",
    create_type=False,
)
approvalentitytype = postgresql.ENUM(
    "PO",
    "VO",
    "EXPENSE",
    "MATERIAL_REQUEST",
    "INVOICE",
    name="approvalentitytype",
    create_type=False,
)
approvalstatus = postgresql.ENUM(
    "PENDING",
    "APPROVED",
    "REJECTED",
    name="approvalstatus",
    create_type=False,
)
workorderstatus = postgresql.ENUM(
    "DRAFT",
    "ACTIVE",
    "COMPLETED",
    "CANCELLED",
    name="workorderstatus",
    create_type=False,
)
rabillstatus = postgresql.ENUM(
    "SUBMITTED",
    "VERIFIED",
    "APPROVED",
    "PAID",
    name="rabillstatus",
    create_type=False,
)
assetcondition = postgresql.ENUM(
    "EXCELLENT",
    "GOOD",
    "FAIR",
    "POOR",
    name="assetcondition",
    create_type=False,
)
assetstatus = postgresql.ENUM(
    "AVAILABLE",
    "ASSIGNED",
    "MAINTENANCE",
    "RETIRED",
    name="assetstatus",
    create_type=False,
)
documentcategory = postgresql.ENUM(
    "DRAWING",
    "BOQ",
    "CONTRACT",
    "PHOTO",
    "REPORT",
    "INVOICE",
    "OTHER",
    name="documentcategory",
    create_type=False,
)
vendorbillstatus = postgresql.ENUM(
    "RECEIVED",
    "VERIFIED",
    "APPROVED",
    "PAID",
    "DISPUTED",
    name="vendorbillstatus",
    create_type=False,
)


def upgrade() -> None:
    # ── 0. Create enum types ─────────────────────────────────────────────
    plantier.create(op.get_bind(), checkfirst=True)
    materialrequeststatus.create(op.get_bind(), checkfirst=True)
    inspectionstatus.create(op.get_bind(), checkfirst=True)
    checklistitemstatus.create(op.get_bind(), checkfirst=True)
    snagseverity.create(op.get_bind(), checkfirst=True)
    snagstatus.create(op.get_bind(), checkfirst=True)
    budgetcategory.create(op.get_bind(), checkfirst=True)
    invoicestatus.create(op.get_bind(), checkfirst=True)
    approvalentitytype.create(op.get_bind(), checkfirst=True)
    approvalstatus.create(op.get_bind(), checkfirst=True)
    workorderstatus.create(op.get_bind(), checkfirst=True)
    rabillstatus.create(op.get_bind(), checkfirst=True)
    assetcondition.create(op.get_bind(), checkfirst=True)
    assetstatus.create(op.get_bind(), checkfirst=True)
    documentcategory.create(op.get_bind(), checkfirst=True)
    vendorbillstatus.create(op.get_bind(), checkfirst=True)

    # ── 1. Create organizations table ────────────────────────────────────
    op.create_table(
        "organizations",
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("gst_number", sa.String(20), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("plan_tier", plantier, nullable=False, server_default="FREE"),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_organizations_slug"), "organizations", ["slug"], unique=True
    )

    # ── 2. Create org_memberships table ──────────────────────────────────
    op.create_table(
        "org_memberships",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM(
                "SUPER_ADMIN",
                "MANAGER",
                "BDE",
                "SALES",
                "SUPERVISOR",
                "CLIENT",
                "LABOR_LEAD",
                name="userrole",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "org_id", name="uq_user_org"),
    )

    # ── 3. Add is_platform_admin to users ────────────────────────────────
    op.add_column(
        "users",
        sa.Column(
            "is_platform_admin", sa.Boolean(), nullable=False, server_default="false"
        ),
    )

    # ── 4. Make users.role nullable (role now lives on OrgMembership) ────
    op.alter_column(
        "users",
        "role",
        existing_type=sa.Enum(
            "SUPER_ADMIN",
            "MANAGER",
            "BDE",
            "SALES",
            "SUPERVISOR",
            "CLIENT",
            "LABOR_LEAD",
            name="userrole",
        ),
        nullable=True,
    )

    # ── 5. Insert default organization & backfill ────────────────────────
    #    We use raw SQL for the data migration part.
    op.execute(
        """
        INSERT INTO organizations (id, name, slug, is_active, plan_tier, created_at, updated_at)
        VALUES (
            'a0000000-0000-0000-0000-000000000001',
            'Default Organization',
            'default',
            true,
            'FREE',
            NOW(),
            NOW()
        )
        ON CONFLICT DO NOTHING
    """
    )

    # Create OrgMembership for every existing user, copying their role
    op.execute(
        """
        INSERT INTO org_memberships (id, user_id, org_id, role, is_default, is_active, created_at, updated_at)
        SELECT
            gen_random_uuid(),
            u.id,
            'a0000000-0000-0000-0000-000000000001',
            u.role,
            true,
            true,
            NOW(),
            NOW()
        FROM users u
        WHERE u.role IS NOT NULL
        ON CONFLICT DO NOTHING
    """
    )

    # ── 6. Add org_id (NULLABLE) to all existing tenant tables ───────────
    _existing_tables = [
        "leads",
        "clients",
        "quotations",
        "quote_rooms",
        "quote_items",
        "items",
        "vendors",
        "vendor_items",
        "purchase_orders",
        "po_items",
        "stock_transactions",
        "projects",
        "sprints",
        "variation_orders",
        "daily_logs",
        "project_wallets",
        "transactions",
        "labor_teams",
        "workers",
        "attendance_logs",
        "notifications",
    ]

    for tbl in _existing_tables:
        op.add_column(tbl, sa.Column("org_id", sa.UUID(), nullable=True))

    # Backfill org_id for all existing rows
    for tbl in _existing_tables:
        op.execute(
            f"""
            UPDATE {tbl}
            SET org_id = 'a0000000-0000-0000-0000-000000000001'
            WHERE org_id IS NULL
        """
        )

    # Make org_id NOT NULL and add FK + index
    for tbl in _existing_tables:
        op.alter_column(tbl, "org_id", nullable=False)
        op.create_foreign_key(
            f"fk_{tbl}_org_id",
            tbl,
            "organizations",
            ["org_id"],
            ["id"],
        )
        op.create_index(f"ix_{tbl}_org_id", tbl, ["org_id"])

    # ── 7. Create new tables (these already include org_id via TenantMixin) ──

    # material_requests
    op.create_table(
        "material_requests",
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("sprint_id", sa.UUID(), nullable=True),
        sa.Column("requested_by_id", sa.UUID(), nullable=False),
        sa.Column(
            "status", materialrequeststatus, nullable=False, server_default="PENDING"
        ),
        sa.Column("urgency", sa.String(20), nullable=False, server_default="NORMAL"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("approved_by_id", sa.UUID(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["sprint_id"], ["sprints.id"]),
        sa.ForeignKeyConstraint(["requested_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["approved_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_material_requests_org_id", "material_requests", ["org_id"])

    # material_request_items
    op.create_table(
        "material_request_items",
        sa.Column("material_request_id", sa.UUID(), nullable=False),
        sa.Column("item_id", sa.UUID(), nullable=False),
        sa.Column("quantity_requested", sa.Float(), nullable=False),
        sa.Column("quantity_approved", sa.Float(), nullable=True),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["material_request_id"], ["material_requests.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["item_id"], ["items.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_material_request_items_org_id", "material_request_items", ["org_id"]
    )

    # inspections
    op.create_table(
        "inspections",
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("sprint_id", sa.UUID(), nullable=False),
        sa.Column("inspector_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("status", inspectionstatus, nullable=False, server_default="DRAFT"),
        sa.Column("inspection_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["sprint_id"], ["sprints.id"]),
        sa.ForeignKeyConstraint(["inspector_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inspections_org_id", "inspections", ["org_id"])

    # inspection_items
    op.create_table(
        "inspection_items",
        sa.Column("inspection_id", sa.UUID(), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column(
            "status", checklistitemstatus, nullable=False, server_default="PENDING"
        ),
        sa.Column("photo_url", sa.String(500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["inspection_id"], ["inspections.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inspection_items_org_id", "inspection_items", ["org_id"])

    # snag_items
    op.create_table(
        "snag_items",
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("sprint_id", sa.UUID(), nullable=True),
        sa.Column("inspection_id", sa.UUID(), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("severity", snagseverity, nullable=False),
        sa.Column("status", snagstatus, nullable=False, server_default="OPEN"),
        sa.Column("photo_url", sa.String(500), nullable=True),
        sa.Column("assigned_to_id", sa.UUID(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["sprint_id"], ["sprints.id"]),
        sa.ForeignKeyConstraint(["inspection_id"], ["inspections.id"]),
        sa.ForeignKeyConstraint(["assigned_to_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_snag_items_org_id", "snag_items", ["org_id"])

    # budget_line_items
    op.create_table(
        "budget_line_items",
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("category", budgetcategory, nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("budgeted_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_budget_line_items_org_id", "budget_line_items", ["org_id"])

    # invoices
    op.create_table(
        "invoices",
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("invoice_number", sa.String(50), nullable=False),
        sa.Column("status", invoicestatus, nullable=False, server_default="DRAFT"),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tax_percent", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column(
            "total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_invoices_project_id", "invoices", ["project_id"])
    op.create_index("ix_invoices_org_id", "invoices", ["org_id"])
    # Composite unique: (org_id, invoice_number) instead of global unique
    op.create_unique_constraint(
        "uq_invoices_org_number", "invoices", ["org_id", "invoice_number"]
    )
    op.create_index("ix_invoices_invoice_number", "invoices", ["invoice_number"])

    # invoice_items
    op.create_table(
        "invoice_items",
        sa.Column("invoice_id", sa.UUID(), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=False, server_default="1"),
        sa.Column("rate", sa.Numeric(12, 2), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("linked_sprint_id", sa.UUID(), nullable=True),
        sa.Column("hsn_code", sa.String(20), nullable=True),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["linked_sprint_id"], ["sprints.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_invoice_items_org_id", "invoice_items", ["org_id"])

    # approval_rules
    op.create_table(
        "approval_rules",
        sa.Column("entity_type", approvalentitytype, nullable=False),
        sa.Column("min_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("max_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("required_roles", postgresql.ARRAY(sa.String(50)), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_approval_rules_entity_type", "approval_rules", ["entity_type"])
    op.create_index("ix_approval_rules_org_id", "approval_rules", ["org_id"])

    # approval_logs
    op.create_table(
        "approval_logs",
        sa.Column("entity_type", approvalentitytype, nullable=False),
        sa.Column("entity_id", sa.UUID(), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("required_role", sa.String(50), nullable=False),
        sa.Column("approver_id", sa.UUID(), nullable=True),
        sa.Column("status", approvalstatus, nullable=False, server_default="PENDING"),
        sa.Column("comments", sa.Text(), nullable=True),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["approver_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_approval_logs_entity_type", "approval_logs", ["entity_type"])
    op.create_index("ix_approval_logs_entity_id", "approval_logs", ["entity_id"])
    op.create_index("ix_approval_logs_org_id", "approval_logs", ["org_id"])

    # work_orders
    op.create_table(
        "work_orders",
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("vendor_id", sa.UUID(), nullable=True),
        sa.Column("team_id", sa.UUID(), nullable=True),
        sa.Column("wo_number", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("scope_of_work", sa.Text(), nullable=True),
        sa.Column(
            "contract_amount", sa.Numeric(12, 2), nullable=False, server_default="0"
        ),
        sa.Column("unit_rate", sa.Numeric(12, 2), nullable=True),
        sa.Column("estimated_quantity", sa.Numeric(10, 2), nullable=True),
        sa.Column("unit", sa.String(20), nullable=True),
        sa.Column("status", workorderstatus, nullable=False, server_default="DRAFT"),
        sa.Column("linked_sprint_id", sa.UUID(), nullable=True),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["vendor_id"], ["vendors.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["labor_teams.id"]),
        sa.ForeignKeyConstraint(["linked_sprint_id"], ["sprints.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_work_orders_project_id", "work_orders", ["project_id"])
    op.create_index("ix_work_orders_org_id", "work_orders", ["org_id"])
    # Composite unique: (org_id, wo_number) instead of global unique
    op.create_unique_constraint(
        "uq_work_orders_org_number", "work_orders", ["org_id", "wo_number"]
    )
    op.create_index("ix_work_orders_wo_number", "work_orders", ["wo_number"])

    # ra_bills
    op.create_table(
        "ra_bills",
        sa.Column("work_order_id", sa.UUID(), nullable=False),
        sa.Column("bill_number", sa.Integer(), nullable=False),
        sa.Column("period_from", sa.Date(), nullable=False),
        sa.Column("period_to", sa.Date(), nullable=False),
        sa.Column("quantity_executed", sa.Numeric(10, 2), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("cumulative_quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("cumulative_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", rabillstatus, nullable=False, server_default="SUBMITTED"),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["work_order_id"], ["work_orders.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ra_bills_org_id", "ra_bills", ["org_id"])

    # assets
    op.create_table(
        "assets",
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("serial_number", sa.String(100), nullable=True),
        sa.Column("purchase_date", sa.Date(), nullable=True),
        sa.Column("purchase_cost", sa.Numeric(12, 2), nullable=True),
        sa.Column("condition", assetcondition, nullable=False, server_default="GOOD"),
        sa.Column("status", assetstatus, nullable=False, server_default="AVAILABLE"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_assets_org_id", "assets", ["org_id"])
    # Composite unique: (org_id, serial_number) instead of global unique
    op.create_unique_constraint(
        "uq_assets_org_serial", "assets", ["org_id", "serial_number"]
    )

    # asset_usage_logs
    op.create_table(
        "asset_usage_logs",
        sa.Column("asset_id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("assigned_date", sa.Date(), nullable=False),
        sa.Column("returned_date", sa.Date(), nullable=True),
        sa.Column("condition_on_return", assetcondition, nullable=True),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_asset_usage_logs_org_id", "asset_usage_logs", ["org_id"])

    # project_documents
    op.create_table(
        "project_documents",
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", documentcategory, nullable=False, server_default="OTHER"),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("uploaded_by_id", sa.UUID(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_project_documents_project_id", "project_documents", ["project_id"]
    )
    op.create_index("ix_project_documents_org_id", "project_documents", ["org_id"])

    # vendor_bills
    op.create_table(
        "vendor_bills",
        sa.Column("vendor_id", sa.UUID(), nullable=False),
        sa.Column("po_id", sa.UUID(), nullable=True),
        sa.Column("bill_number", sa.String(100), nullable=False),
        sa.Column("bill_date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "status", vendorbillstatus, nullable=False, server_default="RECEIVED"
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["vendor_id"], ["vendors.id"]),
        sa.ForeignKeyConstraint(["po_id"], ["purchase_orders.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_vendor_bills_vendor_id", "vendor_bills", ["vendor_id"])
    op.create_index("ix_vendor_bills_org_id", "vendor_bills", ["org_id"])

    # ── 8. Fix existing unique constraints → composite with org_id ───────

    # items.sku: drop global unique, add composite (org_id, sku)
    op.drop_constraint("items_sku_key", "items", type_="unique")
    op.create_unique_constraint("uq_items_org_sku", "items", ["org_id", "sku"])

    # ── 9. Add composite indexes for common queries ──────────────────────
    op.create_index("ix_leads_org_status", "leads", ["org_id", "status"])
    op.create_index("ix_projects_org_status", "projects", ["org_id", "status"])
    op.create_index("ix_items_org_category", "items", ["org_id", "category"])


def downgrade() -> None:
    # ── Drop composite indexes ───────────────────────────────────────────
    op.drop_index("ix_items_org_category", table_name="items")
    op.drop_index("ix_projects_org_status", table_name="projects")
    op.drop_index("ix_leads_org_status", table_name="leads")

    # ── Restore items.sku global unique ──────────────────────────────────
    op.drop_constraint("uq_items_org_sku", "items", type_="unique")
    op.create_unique_constraint("items_sku_key", "items", ["sku"])

    # ── Drop new tables (reverse order) ──────────────────────────────────
    op.drop_index("ix_vendor_bills_org_id", table_name="vendor_bills")
    op.drop_index("ix_vendor_bills_vendor_id", table_name="vendor_bills")
    op.drop_table("vendor_bills")

    op.drop_index("ix_project_documents_org_id", table_name="project_documents")
    op.drop_index("ix_project_documents_project_id", table_name="project_documents")
    op.drop_table("project_documents")

    op.drop_index("ix_asset_usage_logs_org_id", table_name="asset_usage_logs")
    op.drop_table("asset_usage_logs")

    op.drop_constraint("uq_assets_org_serial", "assets", type_="unique")
    op.drop_index("ix_assets_org_id", table_name="assets")
    op.drop_table("assets")

    op.drop_index("ix_ra_bills_org_id", table_name="ra_bills")
    op.drop_table("ra_bills")

    op.drop_index("ix_work_orders_wo_number", table_name="work_orders")
    op.drop_constraint("uq_work_orders_org_number", "work_orders", type_="unique")
    op.drop_index("ix_work_orders_org_id", table_name="work_orders")
    op.drop_index("ix_work_orders_project_id", table_name="work_orders")
    op.drop_table("work_orders")

    op.drop_index("ix_approval_logs_org_id", table_name="approval_logs")
    op.drop_index("ix_approval_logs_entity_id", table_name="approval_logs")
    op.drop_index("ix_approval_logs_entity_type", table_name="approval_logs")
    op.drop_table("approval_logs")

    op.drop_index("ix_approval_rules_org_id", table_name="approval_rules")
    op.drop_index("ix_approval_rules_entity_type", table_name="approval_rules")
    op.drop_table("approval_rules")

    op.drop_index("ix_invoice_items_org_id", table_name="invoice_items")
    op.drop_table("invoice_items")

    op.drop_index("ix_invoices_invoice_number", table_name="invoices")
    op.drop_constraint("uq_invoices_org_number", "invoices", type_="unique")
    op.drop_index("ix_invoices_org_id", table_name="invoices")
    op.drop_index("ix_invoices_project_id", table_name="invoices")
    op.drop_table("invoices")

    op.drop_index("ix_budget_line_items_org_id", table_name="budget_line_items")
    op.drop_table("budget_line_items")

    op.drop_index("ix_snag_items_org_id", table_name="snag_items")
    op.drop_table("snag_items")

    op.drop_index("ix_inspection_items_org_id", table_name="inspection_items")
    op.drop_table("inspection_items")

    op.drop_index("ix_inspections_org_id", table_name="inspections")
    op.drop_table("inspections")

    op.drop_index(
        "ix_material_request_items_org_id", table_name="material_request_items"
    )
    op.drop_table("material_request_items")

    op.drop_index("ix_material_requests_org_id", table_name="material_requests")
    op.drop_table("material_requests")

    # ── Remove org_id from existing tables ───────────────────────────────
    _existing_tables = [
        "notifications",
        "attendance_logs",
        "workers",
        "labor_teams",
        "transactions",
        "project_wallets",
        "daily_logs",
        "variation_orders",
        "sprints",
        "projects",
        "stock_transactions",
        "po_items",
        "purchase_orders",
        "vendor_items",
        "vendors",
        "items",
        "quote_items",
        "quote_rooms",
        "quotations",
        "clients",
        "leads",
    ]

    for tbl in _existing_tables:
        op.drop_index(f"ix_{tbl}_org_id", table_name=tbl)
        op.drop_constraint(f"fk_{tbl}_org_id", tbl, type_="foreignkey")
        op.drop_column(tbl, "org_id")

    # ── Restore users.role to NOT NULL ───────────────────────────────────
    op.alter_column(
        "users",
        "role",
        existing_type=sa.Enum(
            "SUPER_ADMIN",
            "MANAGER",
            "BDE",
            "SALES",
            "SUPERVISOR",
            "CLIENT",
            "LABOR_LEAD",
            name="userrole",
        ),
        nullable=False,
    )

    # ── Drop is_platform_admin ───────────────────────────────────────────
    op.drop_column("users", "is_platform_admin")

    # ── Drop org_memberships and organizations ───────────────────────────
    op.drop_table("org_memberships")
    op.drop_index(op.f("ix_organizations_slug"), table_name="organizations")
    op.drop_table("organizations")

    # ── Drop enum types ──────────────────────────────────────────────────
    vendorbillstatus.drop(op.get_bind(), checkfirst=True)
    documentcategory.drop(op.get_bind(), checkfirst=True)
    assetstatus.drop(op.get_bind(), checkfirst=True)
    assetcondition.drop(op.get_bind(), checkfirst=True)
    rabillstatus.drop(op.get_bind(), checkfirst=True)
    workorderstatus.drop(op.get_bind(), checkfirst=True)
    approvalstatus.drop(op.get_bind(), checkfirst=True)
    approvalentitytype.drop(op.get_bind(), checkfirst=True)
    invoicestatus.drop(op.get_bind(), checkfirst=True)
    budgetcategory.drop(op.get_bind(), checkfirst=True)
    snagstatus.drop(op.get_bind(), checkfirst=True)
    snagseverity.drop(op.get_bind(), checkfirst=True)
    checklistitemstatus.drop(op.get_bind(), checkfirst=True)
    inspectionstatus.drop(op.get_bind(), checkfirst=True)
    materialrequeststatus.drop(op.get_bind(), checkfirst=True)
    plantier.drop(op.get_bind(), checkfirst=True)
