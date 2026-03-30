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
    # Control Plane tables that stay in public schema:
    #   users, organizations, org_memberships, org_invitations, org_usage
    CONTROL_PLANE_TABLES = {
        "users",
        "organizations",
        "org_memberships",
        "org_invitations",
        "org_usage",
    }

    # All other tables are tenant-specific (Data Plane).
    # Built dynamically from model metadata so new models are included automatically.
    TENANT_TABLES = {
        name
        for name in Base.metadata.tables
        if name not in CONTROL_PLANE_TABLES
    }

    logger.info(f"Provisioning {len(TENANT_TABLES)} tables in schema '{schema_name}'")

    async with engine.begin() as conn:
        # Create each tenant table explicitly in the target schema.
        # We temporarily set table.schema so DDL targets the right schema,
        # then restore it to avoid side-effects on the shared metadata.
        for table_name, table in Base.metadata.tables.items():
            if table_name in TENANT_TABLES:
                original_schema = table.schema
                table.schema = schema_name
                try:
                    await conn.run_sync(
                        lambda sync_conn, t=table: t.create(
                            sync_conn, checkfirst=True
                        )
                    )
                finally:
                    table.schema = original_schema

        # Drop FK constraints that point from tenant tables to public-schema
        # copies of other tenant tables (e.g. tenant_abc.lead_activities.lead_id
        # -> public.leads). FKs to actual control-plane tables (users,
        # organizations, etc.) are kept.
        control_list = ", ".join(f"'{t}'" for t in CONTROL_PLANE_TABLES)
        fk_query = await conn.execute(text(f"""
            SELECT DISTINCT tc.constraint_name, tc.table_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_name = ccu.constraint_name
                AND tc.table_schema = ccu.constraint_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = '{schema_name}'
              AND ccu.table_schema = 'public'
              AND ccu.table_name NOT IN ({control_list})
        """))
        bad_fks = fk_query.all()
        for row in bad_fks:
            await conn.execute(text(
                f'ALTER TABLE "{schema_name}"."{row.table_name}" '
                f'DROP CONSTRAINT IF EXISTS "{row.constraint_name}"'
            ))
        if bad_fks:
            logger.info(
                f"Dropped {len(bad_fks)} cross-schema FK constraints in '{schema_name}'"
            )

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
