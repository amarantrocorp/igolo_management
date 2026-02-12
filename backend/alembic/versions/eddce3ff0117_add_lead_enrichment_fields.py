"""add_lead_enrichment_fields

Revision ID: eddce3ff0117
Revises: e2b0a9efe239
Create Date: 2026-02-11 08:19:25.174507

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'eddce3ff0117'
down_revision: Union[str, None] = 'e2b0a9efe239'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Define enum types to create explicitly
propertytype = postgresql.ENUM(
    'APARTMENT', 'VILLA', 'INDEPENDENT_HOUSE', 'PENTHOUSE',
    'STUDIO', 'OFFICE', 'RETAIL', 'OTHER',
    name='propertytype', create_type=False,
)
propertystatus = postgresql.ENUM(
    'UNDER_CONSTRUCTION', 'READY_TO_MOVE', 'OCCUPIED', 'RENOVATION',
    name='propertystatus', create_type=False,
)
sitevisitavailability = postgresql.ENUM(
    'WEEKDAYS', 'WEEKENDS', 'ANYTIME', 'NOT_AVAILABLE',
    name='sitevisitavailability', create_type=False,
)


def upgrade() -> None:
    # Create enum types first
    propertytype.create(op.get_bind(), checkfirst=True)
    propertystatus.create(op.get_bind(), checkfirst=True)
    sitevisitavailability.create(op.get_bind(), checkfirst=True)

    # Add columns
    op.add_column('leads', sa.Column('property_type', propertytype, nullable=True))
    op.add_column('leads', sa.Column('property_status', propertystatus, nullable=True))
    op.add_column('leads', sa.Column('carpet_area', sa.Float(), nullable=True))
    op.add_column('leads', sa.Column('scope_of_work', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('leads', sa.Column('floor_plan_url', sa.String(length=500), nullable=True))
    op.add_column('leads', sa.Column('design_style', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('possession_date', sa.Date(), nullable=True))
    op.add_column('leads', sa.Column('site_visit_availability', sitevisitavailability, nullable=True))


def downgrade() -> None:
    op.drop_column('leads', 'site_visit_availability')
    op.drop_column('leads', 'possession_date')
    op.drop_column('leads', 'design_style')
    op.drop_column('leads', 'floor_plan_url')
    op.drop_column('leads', 'scope_of_work')
    op.drop_column('leads', 'carpet_area')
    op.drop_column('leads', 'property_status')
    op.drop_column('leads', 'property_type')

    # Drop enum types
    sitevisitavailability.drop(op.get_bind(), checkfirst=True)
    propertystatus.drop(op.get_bind(), checkfirst=True)
    propertytype.drop(op.get_bind(), checkfirst=True)
