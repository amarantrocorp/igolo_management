"""Add schema_name column and provision tenant schemas.

Revision ID: c1d2e3f4g5h6
Revises: bdc2529576a3
Create Date: 2026-03-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1d2e3f4g5h6"
down_revision: Union[str, None] = "bdc2529576a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add schema_name column to organizations
    op.add_column(
        "organizations",
        sa.Column("schema_name", sa.String(100), unique=True, nullable=True),
    )

    # 2. Backfill existing organizations with tenant_{slug}
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE organizations SET schema_name = 'tenant_' || REPLACE(slug, '-', '_') WHERE schema_name IS NULL"
        )
    )

    # 3. Create the tenant schema for each existing org
    result = conn.execute(sa.text("SELECT schema_name FROM organizations WHERE schema_name IS NOT NULL"))
    for row in result:
        schema = row[0]
        conn.execute(sa.text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))


def downgrade() -> None:
    # Drop tenant schemas
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT schema_name FROM organizations WHERE schema_name IS NOT NULL"))
    for row in result:
        schema = row[0]
        conn.execute(sa.text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))

    op.drop_column("organizations", "schema_name")
