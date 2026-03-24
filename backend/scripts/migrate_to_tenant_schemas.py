"""Migrate existing data from public schema to per-tenant schemas.

This script moves org-scoped data from public.{table} into {schema_name}.{table}
for each organization that has a schema_name configured.

Usage:
    # Dry run (count rows only, no changes)
    python -m scripts.migrate_to_tenant_schemas --dry-run

    # Migrate all orgs
    python -m scripts.migrate_to_tenant_schemas

    # Migrate a single org
    python -m scripts.migrate_to_tenant_schemas --org-id <uuid>

    # Verbose logging
    python -m scripts.migrate_to_tenant_schemas --verbose
"""

import argparse
import asyncio
import logging
import sys
import uuid
from dataclasses import dataclass, field

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncConnection

# ---------------------------------------------------------------------------
# Setup path so we can import app modules when run as `python -m scripts.…`
# ---------------------------------------------------------------------------
sys.path.insert(0, ".")  # noqa: E402

from app.core.config import settings  # noqa: E402

logger = logging.getLogger("tenant_migration")

# ---------------------------------------------------------------------------
# Tenant tables in dependency order.
#
# Parent tables must come before children so that foreign key constraints
# are satisfied when inserting into the tenant schema.
#
# The list below is derived from the actual SQLAlchemy models that use
# TenantMixin (i.e. have an org_id column).  We include EVERY such table
# here so nothing is silently skipped.
#
# Tables in the tenant_provisioner TENANT_TABLES set may use slightly
# different names (e.g. "project_sprints" vs "sprints"). This script
# operates on the real __tablename__ values from the models.
# ---------------------------------------------------------------------------

MIGRATION_ORDER: list[str] = [
    # ── Tier 0: No FK dependencies on other tenant tables ──
    "leads",
    "vendors",
    "items",
    "labor_teams",
    "assets",
    "approval_rules",

    # ── Tier 1: Depend on Tier 0 ──
    "lead_activities",        # FK -> leads
    "clients",                # FK -> leads
    "quotations",             # FK -> leads
    "vendor_items",           # FK -> vendors, items
    "workers",                # FK -> labor_teams
    "notifications",          # FK -> users (control plane, always present)
    "password_reset_tokens",  # FK -> users

    # ── Tier 2: Depend on Tier 1 ──
    "quote_rooms",            # FK -> quotations
    "projects",               # FK -> clients, quotations
    "purchase_orders",        # FK -> vendors, (projects nullable)

    # ── Tier 3: Depend on Tier 2 ──
    "quote_items",            # FK -> quote_rooms, (items nullable)
    "po_items",               # FK -> purchase_orders, items
    "sprints",                # FK -> projects
    "project_wallets",        # FK -> projects (PK = project_id)
    "variation_orders",       # FK -> projects, (sprints nullable)
    "daily_logs",             # FK -> projects, sprints
    "transactions",           # FK -> projects, (purchase_orders, attendance_logs, variation_orders nullable)
    "invoices",               # FK -> projects
    "material_requests",      # FK -> projects, (sprints nullable)
    "budget_line_items",      # FK -> projects
    "work_orders",            # FK -> projects, (vendors, labor_teams, sprints nullable)
    "inspections",            # FK -> projects, sprints
    "vendor_bills",           # FK -> vendors, (purchase_orders nullable)
    "asset_usage_logs",       # FK -> assets, projects
    "project_documents",      # FK -> projects
    "stock_transactions",     # FK -> items
    "attendance_logs",        # FK -> projects, sprints, labor_teams

    # ── Tier 4: Depend on Tier 3 ──
    "invoice_items",          # FK -> invoices, (sprints nullable)
    "material_request_items", # FK -> material_requests, items
    "ra_bills",               # FK -> work_orders
    "inspection_items",       # FK -> inspections
    "snag_items",             # FK -> projects, (sprints, inspections nullable)
    "approval_logs",          # FK -> (users, generic entity_id)
]

# Tables that do NOT have an org_id column (WhatsApp logs use TenantMixin? No.)
# whatsapp_logs does NOT use TenantMixin -- it has no org_id, so skip it.
# org_usage is control-plane, skip it.


@dataclass
class MigrationStats:
    """Accumulates per-org migration statistics."""
    org_name: str
    schema_name: str
    table_counts: dict[str, int] = field(default_factory=dict)
    skipped_tables: dict[str, int] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)

    @property
    def total_migrated(self) -> int:
        return sum(self.table_counts.values())

    @property
    def total_skipped(self) -> int:
        return sum(self.skipped_tables.values())


async def table_exists_in_schema(conn: AsyncConnection, schema: str, table: str) -> bool:
    """Check if a table exists in the given schema."""
    result = await conn.execute(
        text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = :schema AND table_name = :table"
        ),
        {"schema": schema, "table": table},
    )
    return result.scalar() is not None


async def table_exists_in_public(conn: AsyncConnection, table: str) -> bool:
    """Check if a table exists in the public schema."""
    return await table_exists_in_schema(conn, "public", table)


async def count_rows(conn: AsyncConnection, schema: str, table: str, org_id: uuid.UUID | None = None) -> int:
    """Count rows in a table, optionally filtered by org_id."""
    if org_id is not None:
        result = await conn.execute(
            text(f'SELECT COUNT(*) FROM "{schema}"."{table}" WHERE org_id = :org_id'),
            {"org_id": str(org_id)},
        )
    else:
        result = await conn.execute(
            text(f'SELECT COUNT(*) FROM "{schema}"."{table}"'),
        )
    return result.scalar() or 0


async def get_table_columns(conn: AsyncConnection, schema: str, table: str) -> list[str]:
    """Get column names for a table in a given schema."""
    result = await conn.execute(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = :schema AND table_name = :table "
            "ORDER BY ordinal_position"
        ),
        {"schema": schema, "table": table},
    )
    return [row[0] for row in result.fetchall()]


async def migrate_table(
    conn: AsyncConnection,
    schema: str,
    table: str,
    org_id: uuid.UUID,
    dry_run: bool = False,
) -> int:
    """Migrate rows for a single table from public to the tenant schema.

    Returns the number of rows migrated.
    """
    # Check if the table exists in the public schema
    if not await table_exists_in_public(conn, table):
        logger.debug(f"    {table}: does not exist in public schema, skipping")
        return 0

    # Check if the table exists in the tenant schema
    if not await table_exists_in_schema(conn, schema, table):
        logger.warning(f"    {table}: does not exist in tenant schema '{schema}', skipping")
        return 0

    # Check public table has org_id column (it should, but be safe)
    public_columns = await get_table_columns(conn, "public", table)
    if "org_id" not in public_columns:
        logger.debug(f"    {table}: no org_id column in public schema, skipping")
        return 0

    # Count source rows
    source_count = await count_rows(conn, "public", table, org_id)
    if source_count == 0:
        logger.debug(f"    {table}: 0 rows in public for this org, skipping")
        return 0

    # Check if already migrated (idempotent) -- if tenant schema table has rows, skip
    tenant_columns = await get_table_columns(conn, schema, table)
    if "org_id" in tenant_columns:
        existing_count = await count_rows(conn, schema, table, org_id)
    else:
        existing_count = await count_rows(conn, schema, table)

    if existing_count > 0:
        logger.info(f"    {table}: already has {existing_count} rows in tenant schema, skipping")
        return -existing_count  # Negative signals "skipped"

    if dry_run:
        logger.info(f"    {table}: {source_count} rows would be migrated (dry run)")
        return source_count

    # Determine the common columns between public and tenant schema tables.
    # The tenant schema might not have all columns (unlikely but safe).
    common_columns = [c for c in public_columns if c in tenant_columns]
    cols_str = ", ".join(f'"{c}"' for c in common_columns)

    # Copy data
    insert_sql = (
        f'INSERT INTO "{schema}"."{table}" ({cols_str}) '
        f'SELECT {cols_str} FROM "public"."{table}" '
        f"WHERE org_id = :org_id"
    )
    result = await conn.execute(text(insert_sql), {"org_id": str(org_id)})
    migrated = result.rowcount
    logger.info(f"    {table}: migrated {migrated} rows")
    return migrated


async def ensure_schema_and_tables(conn: AsyncConnection, schema_name: str) -> None:
    """Create the schema and provision tables if they don't exist.

    We replicate the tenant provisioner logic here using raw SQL so this
    script can run standalone without the full async app context.
    Instead of re-implementing DDL, we create the schema and then use
    the provisioner via a separate engine connection.
    """
    # Create schema if not exists
    await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
    logger.info(f"  Schema '{schema_name}' ensured")


async def provision_tables_if_needed(schema_name: str, engine) -> None:
    """Use the tenant provisioner to create tables in the schema.

    This imports the app models and creates any missing tables.
    """
    from app.db.base import Base
    import app.models  # noqa: F401 -- ensure all models registered

    # The TENANT_TABLES set from the provisioner
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

    # Also include the actual table names from models that the provisioner
    # might not list (due to naming mismatches). We create ALL tables that
    # use TenantMixin so the migration has somewhere to write.
    ACTUAL_TENANT_TABLES = {
        "leads", "lead_activities", "clients",
        "quotations", "quote_rooms", "quote_items",
        "items", "vendors", "vendor_items",
        "purchase_orders", "po_items", "stock_transactions",
        "projects", "sprints", "variation_orders", "daily_logs",
        "project_wallets", "transactions",
        "labor_teams", "workers", "attendance_logs",
        "notifications", "password_reset_tokens",
        "material_requests", "material_request_items",
        "inspections", "inspection_items", "snag_items",
        "budget_line_items",
        "invoices", "invoice_items",
        "approval_rules", "approval_logs",
        "work_orders", "ra_bills",
        "assets", "asset_usage_logs",
        "project_documents",
        "vendor_bills",
    }

    all_tables = TENANT_TABLES | ACTUAL_TENANT_TABLES

    async with engine.begin() as conn:
        await conn.execute(text(f'SET search_path TO "{schema_name}", public'))

        for table_name, table in Base.metadata.tables.items():
            if table_name in all_tables:
                await conn.run_sync(
                    lambda sync_conn, t=table: t.create(sync_conn, checkfirst=True)
                )

        await conn.execute(text("SET search_path TO public"))

    logger.info(f"  Tables provisioned in schema '{schema_name}'")


async def get_organizations(conn: AsyncConnection, org_id: uuid.UUID | None = None) -> list[dict]:
    """Fetch organizations that have a schema_name set."""
    if org_id:
        result = await conn.execute(
            text(
                "SELECT id, name, slug, schema_name FROM public.organizations "
                "WHERE schema_name IS NOT NULL AND id = :org_id"
            ),
            {"org_id": str(org_id)},
        )
    else:
        result = await conn.execute(
            text(
                "SELECT id, name, slug, schema_name FROM public.organizations "
                "WHERE schema_name IS NOT NULL ORDER BY created_at"
            )
        )

    rows = result.fetchall()
    return [
        {"id": row[0], "name": row[1], "slug": row[2], "schema_name": row[3]}
        for row in rows
    ]


async def migrate_org(
    conn: AsyncConnection,
    engine,
    org: dict,
    dry_run: bool = False,
) -> MigrationStats:
    """Migrate all data for a single organization."""
    stats = MigrationStats(org_name=org["name"], schema_name=org["schema_name"])
    org_id = org["id"]
    schema = org["schema_name"]

    logger.info(f"Migrating org '{org['name']}' (id={org_id}) -> schema '{schema}'")

    if not dry_run:
        # Ensure schema exists
        await ensure_schema_and_tables(conn, schema)
        await conn.commit()

        # Provision tables (uses its own connection)
        await provision_tables_if_needed(schema, engine)

    for table in MIGRATION_ORDER:
        try:
            result = await migrate_table(conn, schema, table, org_id, dry_run=dry_run)
            if result < 0:
                # Skipped (already migrated)
                stats.skipped_tables[table] = abs(result)
            elif result > 0:
                stats.table_counts[table] = result
        except Exception as e:
            error_msg = f"    {table}: ERROR - {e}"
            logger.error(error_msg)
            stats.errors.append(error_msg)

    return stats


def print_report(all_stats: list[MigrationStats], dry_run: bool) -> None:
    """Print a summary report of the migration."""
    mode = "DRY RUN" if dry_run else "MIGRATION"
    print(f"\n{'=' * 60}")
    print(f"  TENANT DATA {mode} REPORT")
    print(f"{'=' * 60}\n")

    grand_total_migrated = 0
    grand_total_skipped = 0
    grand_total_errors = 0

    for stats in all_stats:
        print(f"  Org: {stats.org_name}  ->  Schema: {stats.schema_name}")
        print(f"  {'—' * 50}")

        if stats.table_counts:
            action = "Would migrate" if dry_run else "Migrated"
            for table, count in stats.table_counts.items():
                print(f"    {action}: {table:.<40} {count:>6} rows")

        if stats.skipped_tables:
            for table, count in stats.skipped_tables.items():
                print(f"    Skipped (exists): {table:.<33} {count:>6} rows")

        if stats.errors:
            for error in stats.errors:
                print(f"    ERROR: {error}")

        migrated = stats.total_migrated
        skipped = stats.total_skipped
        errors = len(stats.errors)
        print(f"\n    Total: {migrated} migrated, {skipped} skipped, {errors} errors\n")

        grand_total_migrated += migrated
        grand_total_skipped += skipped
        grand_total_errors += errors

    print(f"{'=' * 60}")
    print(f"  Grand Total: {grand_total_migrated} rows migrated, "
          f"{grand_total_skipped} rows skipped, {grand_total_errors} errors")
    print(f"{'=' * 60}\n")


async def main(dry_run: bool = False, org_id: uuid.UUID | None = None) -> None:
    """Main entry point for the migration."""
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
    )

    all_stats: list[MigrationStats] = []

    try:
        async with engine.begin() as conn:
            # Fetch orgs to migrate
            orgs = await get_organizations(conn, org_id)

            if not orgs:
                if org_id:
                    logger.error(
                        f"No organization found with id={org_id} that has a schema_name set."
                    )
                else:
                    logger.error("No organizations found with schema_name set.")
                return

            logger.info(f"Found {len(orgs)} organization(s) to migrate")

            for org in orgs:
                if dry_run:
                    # Dry run: read-only, no transaction needed per org
                    stats = await migrate_org(conn, engine, org, dry_run=True)
                    all_stats.append(stats)
                else:
                    # Each org's migration is wrapped in a savepoint so a
                    # failure in one org doesn't roll back others.
                    try:
                        nested = await conn.begin_nested()
                        stats = await migrate_org(conn, engine, org, dry_run=False)
                        all_stats.append(stats)

                        if stats.errors:
                            logger.warning(
                                f"Org '{org['name']}' had errors; rolling back this org's migration"
                            )
                            await nested.rollback()
                        else:
                            await nested.commit()
                    except Exception as e:
                        logger.error(
                            f"Fatal error migrating org '{org['name']}': {e}"
                        )
                        all_stats.append(
                            MigrationStats(
                                org_name=org["name"],
                                schema_name=org["schema_name"],
                                errors=[str(e)],
                            )
                        )
                        # The nested transaction auto-rolls-back on exception

    finally:
        await engine.dispose()

    print_report(all_stats, dry_run)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Migrate existing data from public schema to per-tenant schemas."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Only count rows; do not perform any writes.",
    )
    parser.add_argument(
        "--org-id",
        type=str,
        default=None,
        help="Migrate only the org with this UUID.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        default=False,
        help="Enable DEBUG-level logging.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    target_org_id = uuid.UUID(args.org_id) if args.org_id else None

    if args.dry_run:
        logger.info("Starting tenant data migration (DRY RUN)")
    else:
        logger.info("Starting tenant data migration")

    asyncio.run(main(dry_run=args.dry_run, org_id=target_org_id))
