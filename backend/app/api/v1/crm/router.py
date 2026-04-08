from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthContext, get_tenant_session, role_required
from app.models.crm import LeadStatus
from app.schemas.crm import (
    ClientResponse,
    FollowUpCreate,
    FollowUpResponse,
    FollowUpUpdate,
    LeadActivityCreate,
    LeadActivityResponse,
    LeadCreate,
    LeadResponse,
    LeadUpdate,
)
from app.services import crm_service
from app.services.whatsapp_service import notify_lead_assigned

router = APIRouter()


@router.post("/leads", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    payload: LeadCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(
        role_required(["BDE", "SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Create a new lead in the CRM pipeline."""
    if payload.assigned_to_id is None:
        payload.assigned_to_id = ctx.user.id
    lead = await crm_service.create_lead(data=payload, org_id=ctx.org_id, db=db)

    # Fire-and-forget WhatsApp notification to the assigned person
    if lead.contact_number and lead.assigned_to:
        background_tasks.add_task(
            notify_lead_assigned,
            lead.contact_number,
            lead.name,
            lead.assigned_to.full_name,
        )

    return lead


@router.get("/leads", response_model=list[LeadResponse], status_code=status.HTTP_200_OK)
async def list_leads(
    status_filter: Optional[LeadStatus] = Query(None, alias="status"),
    assigned_to: Optional[UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(
        role_required(["BDE", "SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """List leads with optional filters for status and assigned user."""
    leads = await crm_service.get_leads(
        db=db,
        org_id=ctx.org_id,
        skip=skip,
        limit=limit,
        status_filter=status_filter,
        assigned_to_filter=assigned_to,
    )
    return leads


@router.get(
    "/leads/{lead_id}", response_model=LeadResponse, status_code=status.HTTP_200_OK
)
async def get_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(
        role_required(["BDE", "SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Retrieve a single lead by ID."""
    lead = await crm_service.get_lead(lead_id=lead_id, org_id=ctx.org_id, db=db)
    return lead


@router.put(
    "/leads/{lead_id}", response_model=LeadResponse, status_code=status.HTTP_200_OK
)
async def update_lead(
    lead_id: UUID,
    payload: LeadUpdate,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(
        role_required(["BDE", "SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Update an existing lead."""
    lead = await crm_service.update_lead(
        lead_id=lead_id, data=payload, org_id=ctx.org_id, db=db
    )
    return lead


@router.post(
    "/leads/{lead_id}/convert",
    response_model=ClientResponse,
    status_code=status.HTTP_201_CREATED,
)
async def convert_lead_to_client(
    lead_id: UUID,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Convert a qualified lead into a client. Creates a User account with CLIENT role
    and a Client record linked to the original lead."""
    client = await crm_service.convert_lead_to_client(
        lead_id=lead_id, org_id=ctx.org_id, db=db
    )
    return client


@router.post(
    "/leads/{lead_id}/activities",
    response_model=LeadActivityResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_lead_activity(
    lead_id: UUID,
    payload: LeadActivityCreate,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(
        role_required(["BDE", "SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Log a follow-up activity (call, email, meeting, note, site visit) on a lead."""
    activity = await crm_service.create_lead_activity(
        lead_id=lead_id,
        data=payload,
        user_id=ctx.user.id,
        org_id=ctx.org_id,
        db=db,
    )
    return activity


@router.get(
    "/leads/{lead_id}/activities",
    response_model=list[LeadActivityResponse],
    status_code=status.HTTP_200_OK,
)
async def list_lead_activities(
    lead_id: UUID,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(
        role_required(["BDE", "SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """List all activities for a lead, ordered by date descending."""
    activities = await crm_service.get_lead_activities(
        lead_id=lead_id,
        org_id=ctx.org_id,
        db=db,
    )
    return activities


# ── Follow-Ups ──


def _serialize_follow_up(fu) -> dict:
    """Build a FollowUpResponse-compatible dict with computed fields."""
    data = {
        "id": fu.id,
        "lead_id": fu.lead_id,
        "lead_name": fu.lead.name if fu.lead else "",
        "type": fu.type.value if hasattr(fu.type, "value") else fu.type,
        "scheduled_date": fu.scheduled_date,
        "scheduled_time": fu.scheduled_time,
        "assigned_to_id": fu.assigned_to_id,
        "assigned_to_name": fu.assigned_to.full_name if fu.assigned_to else "",
        "notes": fu.notes,
        "status": fu.status.value if hasattr(fu.status, "value") else fu.status,
        "reminder": fu.reminder,
        "completed_at": fu.completed_at,
        "outcome_notes": fu.outcome_notes,
        "created_at": fu.created_at,
    }
    return data


@router.post(
    "/follow-ups",
    response_model=FollowUpResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_follow_up(
    payload: FollowUpCreate,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(
        role_required(["BDE", "SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Schedule a follow-up (call, site visit, meeting, email) for a lead."""
    fu = await crm_service.create_follow_up(
        data=payload,
        user_id=ctx.user.id,
        org_id=ctx.org_id,
        db=db,
    )
    return _serialize_follow_up(fu)


@router.get(
    "/follow-ups",
    response_model=list[FollowUpResponse],
    status_code=status.HTTP_200_OK,
)
async def list_follow_ups(
    lead_id: UUID = Query(...),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(
        role_required(["BDE", "SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """List follow-ups for a specific lead, with optional status filter."""
    follow_ups = await crm_service.get_follow_ups(
        lead_id=lead_id,
        org_id=ctx.org_id,
        db=db,
        status_filter=status_filter,
    )
    return [_serialize_follow_up(fu) for fu in follow_ups]


@router.get(
    "/follow-ups/my-upcoming",
    response_model=list[FollowUpResponse],
    status_code=status.HTTP_200_OK,
)
async def my_upcoming_follow_ups(
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(
        role_required(["BDE", "SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Get all pending follow-ups assigned to the current user from today onwards."""
    follow_ups = await crm_service.get_upcoming_follow_ups(
        user_id=ctx.user.id,
        org_id=ctx.org_id,
        db=db,
    )
    return [_serialize_follow_up(fu) for fu in follow_ups]


@router.patch(
    "/follow-ups/{follow_up_id}",
    response_model=FollowUpResponse,
    status_code=status.HTTP_200_OK,
)
async def update_follow_up(
    follow_up_id: UUID,
    payload: FollowUpUpdate,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(
        role_required(["BDE", "SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Update a follow-up (reschedule, change status, add notes)."""
    fu = await crm_service.update_follow_up(
        follow_up_id=follow_up_id,
        data=payload,
        org_id=ctx.org_id,
        db=db,
    )
    return _serialize_follow_up(fu)


@router.post(
    "/follow-ups/{follow_up_id}/complete",
    response_model=FollowUpResponse,
    status_code=status.HTTP_200_OK,
)
async def complete_follow_up(
    follow_up_id: UUID,
    outcome_notes: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(
        role_required(["BDE", "SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Mark a follow-up as completed with optional outcome notes."""
    fu = await crm_service.complete_follow_up(
        follow_up_id=follow_up_id,
        outcome_notes=outcome_notes,
        org_id=ctx.org_id,
        db=db,
    )
    return _serialize_follow_up(fu)
