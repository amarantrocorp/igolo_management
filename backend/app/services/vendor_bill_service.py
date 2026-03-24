"""Vendor bill management service."""

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.vendor_bill import VendorBill, VendorBillStatus
from app.schemas.vendor_bill import VendorBillCreate, VendorBillUpdate


async def create_vendor_bill(
    data: VendorBillCreate, org_id: UUID, db: AsyncSession
) -> VendorBill:
    """Create a new vendor bill."""
    bill = VendorBill(
        vendor_id=data.vendor_id,
        po_id=data.po_id,
        bill_number=data.bill_number,
        bill_date=data.bill_date,
        amount=data.amount,
        tax_amount=data.tax_amount,
        total_amount=data.total_amount,
        status=VendorBillStatus.RECEIVED,
        notes=data.notes,
        org_id=org_id,
    )
    db.add(bill)
    await db.commit()
    await db.refresh(bill)
    return bill


async def list_vendor_bills(
    db: AsyncSession,
    org_id: UUID,
    vendor_id: Optional[UUID] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[VendorBill]:
    """List vendor bills with optional filters."""
    q = select(VendorBill).where(VendorBill.org_id == org_id)
    if vendor_id:
        q = q.where(VendorBill.vendor_id == vendor_id)
    if status:
        q = q.where(VendorBill.status == VendorBillStatus(status))
    q = q.order_by(VendorBill.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_vendor_bill(bill_id: UUID, org_id: UUID, db: AsyncSession) -> VendorBill:
    """Get a single vendor bill."""
    result = await db.execute(select(VendorBill).where(VendorBill.id == bill_id))
    bill = result.scalar_one_or_none()
    if not bill or bill.org_id != org_id:
        raise NotFoundException(detail=f"Vendor bill '{bill_id}' not found")
    return bill


async def update_vendor_bill(
    bill_id: UUID, data: VendorBillUpdate, org_id: UUID, db: AsyncSession
) -> VendorBill:
    """Update vendor bill status or notes."""
    bill = await get_vendor_bill(bill_id, org_id, db)
    if data.status is not None:
        bill.status = VendorBillStatus(data.status)
    if data.notes is not None:
        bill.notes = data.notes
    await db.commit()
    await db.refresh(bill)
    return bill
