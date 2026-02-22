from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.core.security import get_password_hash
from app.models.crm import Client, Lead, LeadStatus
from app.models.user import User, UserRole
from app.schemas.crm import LeadCreate, LeadUpdate


async def create_lead(data: LeadCreate, db: AsyncSession) -> Lead:
    """Create a new lead in the CRM pipeline."""
    lead = Lead(
        name=data.name,
        contact_number=data.contact_number,
        email=data.email,
        source=data.source,
        location=data.location,
        notes=data.notes,
        assigned_to_id=data.assigned_to_id,
        status=LeadStatus.NEW,
        # Project Details
        property_type=data.property_type,
        property_status=data.property_status,
        carpet_area=data.carpet_area,
        scope_of_work=data.scope_of_work,
        floor_plan_url=data.floor_plan_url,
        # Preferences
        budget_range=data.budget_range,
        design_style=data.design_style,
        possession_date=data.possession_date,
        site_visit_availability=data.site_visit_availability,
    )
    db.add(lead)
    await db.commit()
    # Re-fetch with relationship eagerly loaded for response serialization
    result = await db.execute(
        select(Lead).options(selectinload(Lead.assigned_to)).where(Lead.id == lead.id)
    )
    return result.scalar_one()


async def get_leads(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[LeadStatus] = None,
    assigned_to_filter: Optional[UUID] = None,
) -> List[Lead]:
    """Retrieve a paginated list of leads with optional status and assignee filters."""
    query = select(Lead).options(selectinload(Lead.assigned_to))

    if status_filter:
        query = query.where(Lead.status == status_filter)
    if assigned_to_filter:
        query = query.where(Lead.assigned_to_id == assigned_to_filter)

    query = query.order_by(Lead.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_lead(lead_id: UUID, db: AsyncSession) -> Lead:
    """Retrieve a single lead by ID with relationships loaded."""
    result = await db.execute(
        select(Lead)
        .options(selectinload(Lead.assigned_to), selectinload(Lead.quotations))
        .where(Lead.id == lead_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise NotFoundException(detail=f"Lead with id '{lead_id}' not found")
    return lead


async def update_lead(lead_id: UUID, data: LeadUpdate, db: AsyncSession) -> Lead:
    """Update lead fields. Only non-None fields from the update schema are applied."""
    lead = await get_lead(lead_id, db)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)

    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead


async def convert_lead_to_client(lead_id: UUID, db: AsyncSession) -> Client:
    """Convert a lead to a client.

    Steps:
    1. Validate the lead exists and is not already converted.
    2. Create a User record with the CLIENT role for portal access.
    3. Create a Client record linked to both the User and the Lead.
    4. Update the lead status to CONVERTED.
    """
    lead = await get_lead(lead_id, db)

    if lead.status == LeadStatus.CONVERTED:
        raise BadRequestException(detail="Lead has already been converted to a client")

    # Check if a client record already exists for this lead
    existing_client = await db.execute(select(Client).where(Client.lead_id == lead_id))
    if existing_client.scalar_one_or_none():
        raise BadRequestException(detail="A client record already exists for this lead")

    # Create a User account with CLIENT role for the lead
    # Use lead email or generate a placeholder if not available
    client_email = lead.email or f"client_{lead.contact_number}@placeholder.local"

    # Check if a user with this email already exists
    existing_user = await db.execute(select(User).where(User.email == client_email))
    if existing_user.scalar_one_or_none():
        raise BadRequestException(
            detail=f"A user with email '{client_email}' already exists. "
            "Please update the lead's email before converting."
        )

    client_user = User(
        email=client_email,
        hashed_password=get_password_hash("changeme123"),  # Default password
        full_name=lead.name,
        phone=lead.contact_number,
        role=UserRole.CLIENT,
    )
    db.add(client_user)
    await db.flush()  # Flush to get the user ID without committing

    # Create the Client record
    client = Client(
        user_id=client_user.id,
        lead_id=lead.id,
    )
    db.add(client)

    # Update lead status
    lead.status = LeadStatus.CONVERTED
    db.add(lead)

    await db.commit()
    await db.refresh(client)
    return client
