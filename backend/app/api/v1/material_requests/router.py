from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_auth_context, role_required, AuthContext
from app.db.session import get_db
from app.models.material_request import MaterialRequestStatus
from app.schemas.material_request import (
    MaterialRequestApproval,
    MaterialRequestCreate,
    MaterialRequestResponse,
)
from app.services import material_request_service

router = APIRouter()


@router.post("/", response_model=MaterialRequestResponse, status_code=201)
async def create_material_request(
    data: MaterialRequestCreate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(
        role_required(["SUPERVISOR", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Create a new material request (indent)."""
    return await material_request_service.create_material_request(
        data, ctx.user.id, ctx.org_id, db
    )


@router.get("/", response_model=List[MaterialRequestResponse])
async def list_material_requests(
    project_id: Optional[UUID] = Query(None),
    status: Optional[MaterialRequestStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List material requests with optional filters."""
    return await material_request_service.get_material_requests(
        db, org_id=ctx.org_id, project_id=project_id, status=status, skip=skip, limit=limit
    )


@router.get("/{request_id}", response_model=MaterialRequestResponse)
async def get_material_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Get a single material request."""
    return await material_request_service.get_material_request(request_id, ctx.org_id, db)


@router.patch(
    "/{request_id}/approve", response_model=MaterialRequestResponse
)
async def approve_material_request(
    request_id: UUID,
    approval: MaterialRequestApproval,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(
        role_required(["MANAGER", "SUPER_ADMIN"])
    ),
):
    """Approve a material request with approved quantities."""
    return await material_request_service.approve_material_request(
        request_id, approval, ctx.user.id, ctx.org_id, db
    )


@router.patch(
    "/{request_id}/reject", response_model=MaterialRequestResponse
)
async def reject_material_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(
        role_required(["MANAGER", "SUPER_ADMIN"])
    ),
):
    """Reject a material request."""
    return await material_request_service.reject_material_request(
        request_id, ctx.user.id, ctx.org_id, db
    )


@router.post(
    "/{request_id}/fulfill", response_model=MaterialRequestResponse
)
async def fulfill_material_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(
        role_required(["MANAGER", "SUPER_ADMIN"])
    ),
):
    """Fulfill an approved request by issuing stock from warehouse."""
    return await material_request_service.fulfill_material_request(
        request_id, ctx.user.id, ctx.org_id, db
    )
