"""Vendor performance analytics."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.inventory import PurchaseOrder, Vendor


async def get_vendor_performance(vendor_id: UUID, org_id: UUID, db: AsyncSession) -> dict:
    """Get performance metrics for a vendor based on PO history."""
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor or vendor.org_id != org_id:
        raise NotFoundException(detail=f"Vendor '{vendor_id}' not found")

    # Total spend: sum of all non-cancelled POs
    spend_result = await db.execute(
        select(
            func.count(PurchaseOrder.id),
            func.coalesce(func.sum(PurchaseOrder.total_amount), 0),
        ).where(
            PurchaseOrder.vendor_id == vendor_id,
            PurchaseOrder.org_id == org_id,
            PurchaseOrder.status != "CANCELLED",
        )
    )
    row = spend_result.one()
    total_orders = int(row[0])
    total_spend = float(row[1])

    # Count by status
    status_result = await db.execute(
        select(PurchaseOrder.status, func.count(PurchaseOrder.id))
        .where(
            PurchaseOrder.vendor_id == vendor_id,
            PurchaseOrder.org_id == org_id,
        )
        .group_by(PurchaseOrder.status)
    )
    status_breakdown = {str(r[0].value) if hasattr(r[0], "value") else str(r[0]): int(r[1]) for r in status_result.all()}

    received_count = status_breakdown.get("RECEIVED", 0)
    delivery_rate = (received_count / total_orders * 100) if total_orders > 0 else 0

    return {
        "vendor_id": str(vendor_id),
        "vendor_name": vendor.name,
        "total_orders": total_orders,
        "total_spend": total_spend,
        "delivery_rate": round(delivery_rate, 1),
        "status_breakdown": status_breakdown,
    }
