"""Tenant schema provisioning service.

Handles creating, migrating, and dropping per-tenant PostgreSQL schemas.
Each tenant gets their own schema (e.g., tenant_acme) that contains
all tenant-specific tables (projects, leads, quotes, etc.).
"""

import re
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import engine

logger = logging.getLogger(__name__)


def slugify_schema_name(slug: str) -> str:
    """Convert an org slug to a safe PostgreSQL schema name."""
    safe = re.sub(r"[^a-z0-9_]", "_", slug.lower())
    return f"tenant_{safe}"


async def create_tenant_schema(schema_name: str, db: AsyncSession) -> None:
    """Create a new PostgreSQL schema for a tenant.

    Args:
        schema_name: The schema name (e.g., 'tenant_acme')
        db: Database session (control plane)
    """
    logger.info(f"Creating tenant schema: {schema_name}")
    await db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
    await db.commit()
    logger.info(f"Tenant schema '{schema_name}' created successfully")


async def provision_tenant_tables(schema_name: str) -> None:
    """Create tenant-specific tables inside the given schema.

    This creates the Data Plane tables (projects, leads, quotes, etc.)
    inside the tenant's schema by running DDL statements with the
    search_path set to the tenant schema.
    """
    from app.db.base import Base
    # Import all models so metadata is populated
    import app.models  # noqa: F401

    # Define which tables belong to the tenant (Data Plane)
    # Control Plane tables (users, organizations, org_memberships, org_invitations)
    # remain in the public schema
    TENANT_TABLES = {
        "projects", "project_sprints", "project_rooms",
        "leads", "lead_activities",
        "quotations", "quotation_items",
        "invoices", "invoice_items",
        "material_requests", "material_request_items",
        "work_orders", "work_order_items",
        "vendors", "vendor_categories",
        "assets",
        "inventory_items", "stock_movements", "purchase_orders", "purchase_order_items",
        "approvals",
        "budget_items",
        "documents",
        "expenses", "expense_categories",
        "labor_entries", "labor_contractors", "labor_attendance",
        "quality_checklists", "quality_checklist_items", "quality_inspections",
        "vendor_bills", "vendor_bill_items",
        "usage_logs",
        "notifications",
        "password_reset_tokens",
        "whatsapp_message_log",
    }

    logger.info(f"Provisioning tables in schema '{schema_name}'")

    async with engine.begin() as conn:
        # Set the search path to the tenant schema
        await conn.execute(text(f'SET search_path TO "{schema_name}", public'))

        # Create only the tenant-specific tables
        for table_name, table in Base.metadata.tables.items():
            if table_name in TENANT_TABLES:
                await conn.run_sync(
                    lambda sync_conn, t=table: t.create(sync_conn, checkfirst=True)
                )

        # Reset search path
        await conn.execute(text("SET search_path TO public"))

    logger.info(f"Tables provisioned in schema '{schema_name}'")


async def drop_tenant_schema(schema_name: str, db: AsyncSession) -> None:
    """Drop a tenant schema and all its data. DESTRUCTIVE!"""
    logger.warning(f"Dropping tenant schema: {schema_name}")
    await db.execute(text(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE'))
    await db.commit()
    logger.info(f"Tenant schema '{schema_name}' dropped")


async def schema_exists(schema_name: str, db: AsyncSession) -> bool:
    """Check if a tenant schema already exists."""
    result = await db.execute(
        text("SELECT 1 FROM information_schema.schemata WHERE schema_name = :name"),
        {"name": schema_name},
    )
    return result.scalar() is not None
