from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthContext, role_required
from app.db.session import get_db
from app.models.crm import LeadStatus
from app.schemas.crm import (
    ClientResponse,
    LeadActivityCreate,
    LeadActivityResponse,
    LeadCreate,
    LeadResponse,
    LeadUpdate,
)
from app.services import crm_service

router = APIRouter()


@router.post("/leads", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    payload: LeadCreate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(
        role_required(["BDE", "SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Create a new lead in the CRM pipeline."""
    if payload.assigned_to_id is None:
        payload.assigned_to_id = ctx.user.id
    lead = await crm_service.create_lead(data=payload, org_id=ctx.org_id, db=db)
    return lead


@router.get("/leads", response_model=list[LeadResponse], status_code=status.HTTP_200_OK)
async def list_leads(
    status_filter: Optional[LeadStatus] = Query(None, alias="status"),
    assigned_to: Optional[UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
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
    db: AsyncSession = Depends(get_db),
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
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(
        role_required(["BDE", "SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Update an existing lead."""
    lead = await crm_service.update_lead(lead_id=lead_id, data=payload, org_id=ctx.org_id, db=db)
    return lead


@router.post(
    "/leads/{lead_id}/convert",
    response_model=ClientResponse,
    status_code=status.HTTP_201_CREATED,
)
async def convert_lead_to_client(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Convert a qualified lead into a client. Creates a User account with CLIENT role
    and a Client record linked to the original lead."""
    client = await crm_service.convert_lead_to_client(lead_id=lead_id, org_id=ctx.org_id, db=db)
    return client


@router.post(
    "/leads/{lead_id}/activities",
    response_model=LeadActivityResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_lead_activity(
    lead_id: UUID,
    payload: LeadActivityCreate,
    db: AsyncSession = Depends(get_db),
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
    db: AsyncSession = Depends(get_db),
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
