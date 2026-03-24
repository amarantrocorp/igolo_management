from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_auth_context, role_required, AuthContext
from app.db.session import get_db
from app.models.work_order import WorkOrderStatus
from app.schemas.work_order import (
    RABillCreate,
    RABillResponse,
    WorkOrderCreate,
    WorkOrderResponse,
    WorkOrderUpdate,
)
from app.services import work_order_service

router = APIRouter()


@router.post("/", response_model=WorkOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_work_order(
    data: WorkOrderCreate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Create a new work order."""
    return await work_order_service.create_work_order(data, ctx.org_id, db)


@router.get("/", response_model=list[WorkOrderResponse])
async def list_work_orders(
    project_id: Optional[UUID] = Query(None),
    wo_status: Optional[WorkOrderStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List work orders with optional filters."""
    return await work_order_service.list_work_orders(
        db,
        org_id=ctx.org_id,
        project_id=project_id,
        status=wo_status,
        skip=skip,
        limit=limit,
    )


@router.get("/{wo_id}", response_model=WorkOrderResponse)
async def get_work_order(
    wo_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Get a single work order with its RA bills."""
    return await work_order_service.get_work_order(wo_id, ctx.org_id, db)


@router.patch("/{wo_id}", response_model=WorkOrderResponse)
async def update_work_order(
    wo_id: UUID,
    data: WorkOrderUpdate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Update a work order."""
    return await work_order_service.update_work_order(wo_id, data, ctx.org_id, db)


@router.post(
    "/{wo_id}/ra-bills",
    response_model=RABillResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_ra_bill(
    wo_id: UUID,
    data: RABillCreate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Submit a Running Account bill for a work order."""
    return await work_order_service.submit_ra_bill(wo_id, data, ctx.org_id, db)


@router.patch("/{wo_id}/ra-bills/{bill_id}/status", response_model=RABillResponse)
async def update_ra_bill_status(
    wo_id: UUID,
    bill_id: UUID,
    new_status: str = Query(..., alias="status"),
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Update RA bill status (SUBMITTED -> VERIFIED -> APPROVED -> PAID)."""
    return await work_order_service.update_ra_bill_status(
        bill_id, new_status, ctx.org_id, db
    )


@router.get("/{wo_id}/pdf", status_code=status.HTTP_200_OK)
async def download_work_order_pdf(
    wo_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Download work order as PDF."""
    from io import BytesIO

    from fastapi.responses import StreamingResponse

    from app.services import pdf_service

    pdf_bytes = await pdf_service.generate_work_order_pdf(wo_id, ctx.org_id, db)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=wo-{wo_id}.pdf"},
    )
