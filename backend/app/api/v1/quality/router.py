from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_auth_context, role_required, AuthContext
from app.db.session import get_db
from app.models.quality import SnagSeverity, SnagStatus
from app.schemas.quality import (
    InspectionCreate,
    InspectionItemUpdate,
    InspectionItemResponse,
    InspectionResponse,
    QualitySummaryResponse,
    SnagItemCreate,
    SnagItemResponse,
    SnagItemUpdate,
)
from app.services import quality_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Inspections
# ---------------------------------------------------------------------------


@router.post("/inspections", response_model=InspectionResponse, status_code=201)
async def create_inspection(
    data: InspectionCreate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["SUPERVISOR", "MANAGER", "SUPER_ADMIN"])),
):
    """Create a new inspection with checklist items."""
    return await quality_service.create_inspection(data, ctx.user.id, ctx.org_id, db)


@router.get("/inspections", response_model=List[InspectionResponse])
async def list_inspections(
    project_id: Optional[UUID] = Query(None),
    sprint_id: Optional[UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List inspections with optional filters."""
    return await quality_service.list_inspections(
        db,
        org_id=ctx.org_id,
        project_id=project_id,
        sprint_id=sprint_id,
        skip=skip,
        limit=limit,
    )


@router.get("/inspections/{inspection_id}", response_model=InspectionResponse)
async def get_inspection(
    inspection_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Get a single inspection with checklist items."""
    return await quality_service._get_inspection(inspection_id, ctx.org_id, db)


@router.patch(
    "/inspections/{inspection_id}/items/{item_id}",
    response_model=InspectionItemResponse,
)
async def update_inspection_item(
    inspection_id: UUID,
    item_id: UUID,
    data: InspectionItemUpdate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["SUPERVISOR", "MANAGER", "SUPER_ADMIN"])),
):
    """Update a checklist item's status, photo, or notes."""
    return await quality_service.update_inspection_item(item_id, data, ctx.org_id, db)


@router.post(
    "/inspections/{inspection_id}/complete",
    response_model=InspectionResponse,
)
async def complete_inspection(
    inspection_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["SUPERVISOR", "MANAGER", "SUPER_ADMIN"])),
):
    """Complete an inspection, compute score, and auto-create snags from FAILs."""
    return await quality_service.complete_inspection(inspection_id, ctx.org_id, db)


# ---------------------------------------------------------------------------
# Snags
# ---------------------------------------------------------------------------


@router.post("/snags", response_model=SnagItemResponse, status_code=201)
async def create_snag(
    data: SnagItemCreate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["SUPERVISOR", "MANAGER", "SUPER_ADMIN"])),
):
    """Create a standalone snag item."""
    return await quality_service.create_snag(data, ctx.org_id, db)


@router.get("/snags", response_model=List[SnagItemResponse])
async def list_snags(
    project_id: Optional[UUID] = Query(None),
    severity: Optional[SnagSeverity] = Query(None),
    status: Optional[SnagStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List snag items with optional filters."""
    return await quality_service.list_snags(
        db,
        org_id=ctx.org_id,
        project_id=project_id,
        severity=severity,
        status=status,
        skip=skip,
        limit=limit,
    )


@router.patch("/snags/{snag_id}", response_model=SnagItemResponse)
async def update_snag(
    snag_id: UUID,
    data: SnagItemUpdate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["SUPERVISOR", "MANAGER", "SUPER_ADMIN"])),
):
    """Update a snag item's status, severity, assignment, etc."""
    return await quality_service.update_snag(snag_id, data, ctx.org_id, db)


# ---------------------------------------------------------------------------
# Quality Summary
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/summary",
    response_model=QualitySummaryResponse,
)
async def get_quality_summary(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Get quality metrics summary for a project."""
    return await quality_service.get_project_quality_summary(project_id, ctx.org_id, db)
