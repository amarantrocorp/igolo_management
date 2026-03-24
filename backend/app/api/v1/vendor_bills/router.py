from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_auth_context, role_required, AuthContext
from app.db.session import get_db
from app.schemas.vendor_bill import VendorBillCreate, VendorBillResponse, VendorBillUpdate
from app.services import vendor_bill_service

router = APIRouter()


@router.post("/", response_model=VendorBillResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor_bill(
    data: VendorBillCreate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Create a new vendor bill."""
    return await vendor_bill_service.create_vendor_bill(data, ctx.org_id, db)


@router.get("/", response_model=list[VendorBillResponse])
async def list_vendor_bills(
    vendor_id: Optional[UUID] = Query(None),
    bill_status: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List vendor bills with optional filters."""
    return await vendor_bill_service.list_vendor_bills(
        db, org_id=ctx.org_id, vendor_id=vendor_id, status=bill_status, skip=skip, limit=limit,
    )


@router.get("/{bill_id}", response_model=VendorBillResponse)
async def get_vendor_bill(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Get a single vendor bill."""
    return await vendor_bill_service.get_vendor_bill(bill_id, ctx.org_id, db)


@router.patch("/{bill_id}", response_model=VendorBillResponse)
async def update_vendor_bill(
    bill_id: UUID,
    data: VendorBillUpdate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Update vendor bill status."""
    return await vendor_bill_service.update_vendor_bill(bill_id, data, ctx.org_id, db)
