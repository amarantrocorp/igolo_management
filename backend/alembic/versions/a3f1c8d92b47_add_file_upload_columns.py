"""add_file_upload_columns

Revision ID: a3f1c8d92b47
Revises: eddce3ff0117
Create Date: 2026-02-22 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a3f1c8d92b47"
down_revision: Union[str, None] = "eddce3ff0117"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_url", sa.String(500), nullable=True))
    op.add_column(
        "quotations", sa.Column("cover_image_url", sa.String(500), nullable=True)
    )
    op.add_column(
        "projects", sa.Column("cover_image_url", sa.String(500), nullable=True)
    )
    op.add_column(
        "variation_orders",
        sa.Column("supporting_doc_url", sa.String(500), nullable=True),
    )
    op.add_column(
        "purchase_orders",
        sa.Column("bill_document_url", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("purchase_orders", "bill_document_url")
    op.drop_column("variation_orders", "supporting_doc_url")
    op.drop_column("projects", "cover_image_url")
    op.drop_column("quotations", "cover_image_url")
    op.drop_column("users", "avatar_url")
