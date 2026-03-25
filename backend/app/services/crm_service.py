import re
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.email import send_email_fire_and_forget
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.security import get_password_hash
from app.models.crm import ActivityType, Client, Lead, LeadActivity, LeadStatus
from app.models.notification import NotificationType
from app.models.organization import OrgMembership
from app.models.user import User, UserRole
from app.schemas.crm import LeadActivityCreate, LeadCreate, LeadUpdate
from app.core.plan_limits import enforce_lead_limit
from app.services.notification_service import create_notification


def strip_html(text: str) -> str:
    """Remove HTML tags from a string."""
    return re.sub(r'<[^>]+>', '', text) if text else text


async def create_lead(data: LeadCreate, org_id: UUID, db: AsyncSession) -> Lead:
    """Create a new lead in the CRM pipeline."""
    await enforce_lead_limit(org_id, db)

    # Sanitize text fields
    data.name = strip_html(data.name)
    if data.notes:
        data.notes = strip_html(data.notes)

    # Normalize empty email to None
    if data.email is not None and data.email.strip() == "":
        data.email = None

    lead = Lead(
        name=data.name,
        contact_number=data.contact_number,
        email=data.email,
        source=data.source,
        location=data.location,
        notes=data.notes,
        assigned_to_id=data.assigned_to_id,
        status=LeadStatus.NEW,
        org_id=org_id,
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
    lead = result.scalar_one()

    # Notify the assigned BDE/Sales person
    if lead.assigned_to_id:
        # Truncate name to prevent exceeding DB column limits (title is String(255))
        notification_name = lead.name[:100] if len(lead.name) > 100 else lead.name
        await create_notification(
            db=db,
            recipient_id=lead.assigned_to_id,
            org_id=org_id,
            type=NotificationType.INFO,
            title=f"New Lead: {notification_name}",
            body=f"New lead from {lead.source} - {lead.contact_number}",
            action_url=f"/dashboard/sales/leads/{lead.id}",
            email_template="new_lead.html",
            email_data={
                "recipient_name": (
                    lead.assigned_to.full_name if lead.assigned_to else "Team"
                ),
                "lead_name": lead.name,
                "lead_phone": lead.contact_number,
                "lead_source": lead.source,
                "lead_location": lead.location or "N/A",
                "action_url": f"/dashboard/sales/leads/{lead.id}",
            },
        )

    return lead


async def get_leads(
    db: AsyncSession,
    org_id: UUID,
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[LeadStatus] = None,
    assigned_to_filter: Optional[UUID] = None,
) -> List[Lead]:
    """Retrieve a paginated list of leads with optional status and assignee filters."""
    query = (
        select(Lead)
        .options(selectinload(Lead.assigned_to))
        .where(Lead.org_id == org_id)
    )

    if status_filter:
        query = query.where(Lead.status == status_filter)
    if assigned_to_filter:
        query = query.where(Lead.assigned_to_id == assigned_to_filter)

    query = query.order_by(Lead.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_lead(lead_id: UUID, org_id: UUID, db: AsyncSession) -> Lead:
    """Retrieve a single lead by ID with relationships loaded."""
    result = await db.execute(
        select(Lead)
        .options(selectinload(Lead.assigned_to), selectinload(Lead.quotations))
        .where(Lead.id == lead_id)
    )
    lead = result.scalar_one_or_none()
    if not lead or lead.org_id != org_id:
        raise NotFoundException(detail=f"Lead with id '{lead_id}' not found")
    return lead


async def update_lead(
    lead_id: UUID, data: LeadUpdate, org_id: UUID, db: AsyncSession
) -> Lead:
    """Update lead fields. Only non-None fields from the update schema are applied."""
    lead = await get_lead(lead_id, org_id, db)

    # Normalize empty email to None
    if data.email is not None and data.email.strip() == "":
        data.email = None

    # Validate assigned user belongs to the same organization and is active
    if data.assigned_to_id is not None:
        membership = await db.execute(
            select(OrgMembership).where(
                OrgMembership.user_id == data.assigned_to_id,
                OrgMembership.org_id == org_id,
                OrgMembership.is_active.is_(True),
            )
        )
        if not membership.scalar_one_or_none():
            raise BadRequestException(
                detail="Assigned user is not a member of this organization"
            )

        # Also verify the user account itself is active
        user_result = await db.execute(
            select(User).where(User.id == data.assigned_to_id)
        )
        user = user_result.scalar_one_or_none()
        if not user or not user.is_active:
            raise BadRequestException(detail="Cannot assign lead to an inactive user")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)

    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead


async def convert_lead_to_client(
    lead_id: UUID, org_id: UUID, db: AsyncSession
) -> Client:
    """Convert a lead to a client.

    Steps:
    1. Validate the lead exists and is not already converted.
    2. Create a User record with the CLIENT role for portal access.
    3. Create an OrgMembership for the new user.
    4. Create a Client record linked to both the User and the Lead.
    5. Update the lead status to CONVERTED.
    """
    lead = await get_lead(lead_id, org_id, db)

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

    # Create OrgMembership for the new client user
    membership = OrgMembership(
        user_id=client_user.id,
        org_id=org_id,
        role=UserRole.CLIENT,
        is_default=True,
        is_active=True,
    )
    db.add(membership)

    # Create the Client record
    client = Client(
        user_id=client_user.id,
        lead_id=lead.id,
        org_id=org_id,
    )
    db.add(client)

    # Update lead status
    lead.status = LeadStatus.CONVERTED
    db.add(lead)

    await db.commit()

    # Re-fetch with eager-loaded relationships to avoid lazy-load errors
    result = await db.execute(
        select(Client)
        .options(
            selectinload(Client.user),
            selectinload(Client.lead),
        )
        .where(Client.id == client.id)
    )
    client = result.scalar_one()

    # Email client their portal credentials
    if client_email and not client_email.endswith("@placeholder.local"):
        send_email_fire_and_forget(
            subject="Welcome to IntDesign ERP - Your Portal Access",
            email_to=client_email,
            template_name="client_welcome.html",
            template_data={
                "subject": "Welcome to IntDesign ERP",
                "client_name": lead.name,
                "email": client_email,
                "password": "changeme123",
                "login_url": f"{settings.FRONTEND_URL}/login",
            },
        )

    return client


async def create_lead_activity(
    lead_id: UUID,
    data: LeadActivityCreate,
    user_id: UUID,
    org_id: UUID,
    db: AsyncSession,
) -> LeadActivity:
    """Create a follow-up / interaction record on a lead."""
    # Verify lead exists and belongs to the org
    await get_lead(lead_id, org_id, db)

    # Validate activity type
    try:
        activity_type = ActivityType(data.type)
    except ValueError:
        raise BadRequestException(
            detail=f"Invalid activity type '{data.type}'. "
            f"Must be one of: {', '.join(t.value for t in ActivityType)}"
        )

    activity = LeadActivity(
        lead_id=lead_id,
        org_id=org_id,
        type=activity_type,
        description=data.description,
        date=data.date,
        created_by_id=user_id,
    )
    db.add(activity)
    await db.commit()

    result = await db.execute(
        select(LeadActivity)
        .options(selectinload(LeadActivity.created_by))
        .where(LeadActivity.id == activity.id)
    )
    return result.scalar_one()


async def get_lead_activities(
    lead_id: UUID,
    org_id: UUID,
    db: AsyncSession,
) -> List[LeadActivity]:
    """Retrieve all activities for a lead, ordered by date descending."""
    # Verify lead exists and belongs to the org
    await get_lead(lead_id, org_id, db)

    result = await db.execute(
        select(LeadActivity)
        .options(selectinload(LeadActivity.created_by))
        .where(LeadActivity.lead_id == lead_id, LeadActivity.org_id == org_id)
        .order_by(LeadActivity.date.desc(), LeadActivity.created_at.desc())
    )
    return list(result.scalars().all())
