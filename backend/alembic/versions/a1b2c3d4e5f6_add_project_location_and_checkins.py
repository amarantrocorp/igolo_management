"""add_project_location_and_checkins

Revision ID: a1b2c3d4e5f6
Revises: c1d2e3f4g5h6
Create Date: 2026-03-26 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "c1d2e3f4g5h6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add location columns to projects table
    op.add_column("projects", sa.Column("site_latitude", sa.Float(), nullable=True))
    op.add_column("projects", sa.Column("site_longitude", sa.Float(), nullable=True))
    op.add_column(
        "projects",
        sa.Column(
            "geofence_radius_meters",
            sa.Integer(),
            nullable=False,
            server_default="500",
        ),
    )

    # Create the check_ins table
    op.create_table(
        "check_ins",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "check_in_time",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("check_out_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_in_latitude", sa.Float(), nullable=False),
        sa.Column("check_in_longitude", sa.Float(), nullable=False),
        sa.Column("check_out_latitude", sa.Float(), nullable=True),
        sa.Column("check_out_longitude", sa.Float(), nullable=True),
        sa.Column("distance_from_site_meters", sa.Float(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("CHECKED_IN", "CHECKED_OUT", name="checkinstatus"),
            nullable=False,
            server_default="CHECKED_IN",
        ),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
    )

    # Indexes for common queries
    op.create_index("ix_check_ins_org_id", "check_ins", ["org_id"])
    op.create_index("ix_check_ins_user_id", "check_ins", ["user_id"])
    op.create_index("ix_check_ins_project_id", "check_ins", ["project_id"])
    op.create_index("ix_check_ins_status", "check_ins", ["status"])
    op.create_index(
        "ix_check_ins_user_status",
        "check_ins",
        ["user_id", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_check_ins_user_status", table_name="check_ins")
    op.drop_index("ix_check_ins_status", table_name="check_ins")
    op.drop_index("ix_check_ins_project_id", table_name="check_ins")
    op.drop_index("ix_check_ins_user_id", table_name="check_ins")
    op.drop_index("ix_check_ins_org_id", table_name="check_ins")
    op.drop_table("check_ins")
    op.execute("DROP TYPE IF EXISTS checkinstatus")

    op.drop_column("projects", "geofence_radius_meters")
    op.drop_column("projects", "site_longitude")
    op.drop_column("projects", "site_latitude")
