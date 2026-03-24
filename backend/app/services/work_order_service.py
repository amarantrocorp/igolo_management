"""Work Order and RA Bill business logic."""

from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.finance import (
    Transaction,
    TransactionCategory,
    TransactionSource,
    TransactionStatus,
)
from app.models.work_order import RABill, RABillStatus, WorkOrder, WorkOrderStatus
from app.schemas.work_order import RABillCreate, WorkOrderCreate, WorkOrderUpdate
from app.services.finance_service import authorize_expense, get_wallet


# ---------------------------------------------------------------------------
# Work Order CRUD
# ---------------------------------------------------------------------------


async def _next_wo_number(org_id: UUID, db: AsyncSession) -> str:
    """Generate the next sequential work order number (WO-00001), scoped to org."""
    result = await db.execute(
        select(func.count(WorkOrder.id)).where(WorkOrder.org_id == org_id)
    )
    count = result.scalar() or 0
    return f"WO-{count + 1:05d}"


async def create_work_order(data: WorkOrderCreate, org_id: UUID, db: AsyncSession) -> WorkOrder:
    """Create a new work order in DRAFT status."""
    wo_number = await _next_wo_number(org_id, db)
    wo = WorkOrder(
        project_id=data.project_id,
        vendor_id=data.vendor_id,
        team_id=data.team_id,
        wo_number=wo_number,
        description=data.description,
        scope_of_work=data.scope_of_work,
        contract_amount=data.contract_amount,
        unit_rate=data.unit_rate,
        estimated_quantity=data.estimated_quantity,
        unit=data.unit,
        linked_sprint_id=data.linked_sprint_id,
        status=WorkOrderStatus.DRAFT,
        org_id=org_id,
    )
    db.add(wo)
    await db.commit()
    return await get_work_order(wo.id, org_id, db)


async def get_work_order(wo_id: UUID, org_id: UUID, db: AsyncSession) -> WorkOrder:
    """Fetch a single work order with its RA bills."""
    result = await db.execute(
        select(WorkOrder)
        .options(selectinload(WorkOrder.ra_bills))
        .where(WorkOrder.id == wo_id)
    )
    wo = result.scalar_one_or_none()
    if not wo or wo.org_id != org_id:
        raise NotFoundException(detail=f"Work order '{wo_id}' not found")
    return wo


async def list_work_orders(
    db: AsyncSession,
    org_id: UUID,
    project_id: Optional[UUID] = None,
    status: Optional[WorkOrderStatus] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[WorkOrder]:
    """List work orders with optional filters."""
    q = (
        select(WorkOrder)
        .options(selectinload(WorkOrder.ra_bills))
        .where(WorkOrder.org_id == org_id)
    )
    if project_id:
        q = q.where(WorkOrder.project_id == project_id)
    if status:
        q = q.where(WorkOrder.status == status)
    q = q.order_by(WorkOrder.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def update_work_order(
    wo_id: UUID, data: WorkOrderUpdate, org_id: UUID, db: AsyncSession
) -> WorkOrder:
    """Update work order fields."""
    wo = await get_work_order(wo_id, org_id, db)
    if data.status is not None:
        wo.status = WorkOrderStatus(data.status)
    if data.description is not None:
        wo.description = data.description
    if data.scope_of_work is not None:
        wo.scope_of_work = data.scope_of_work
    if data.contract_amount is not None:
        wo.contract_amount = data.contract_amount
    await db.commit()
    return await get_work_order(wo_id, org_id, db)


# ---------------------------------------------------------------------------
# RA Bill Management
# ---------------------------------------------------------------------------


async def submit_ra_bill(
    wo_id: UUID, data: RABillCreate, org_id: UUID, db: AsyncSession
) -> RABill:
    """Submit a Running Account bill for a work order.

    Automatically computes cumulative_quantity and cumulative_amount from
    previous bills on the same work order.
    """
    wo = await get_work_order(wo_id, org_id, db)
    if wo.status not in (WorkOrderStatus.ACTIVE, WorkOrderStatus.DRAFT):
        raise BadRequestException(
            detail="Cannot submit RA bills for completed or cancelled work orders"
        )

    # Determine next bill number and cumulative totals
    result = await db.execute(
        select(
            func.coalesce(func.max(RABill.bill_number), 0),
            func.coalesce(func.sum(RABill.quantity_executed), 0),
            func.coalesce(func.sum(RABill.amount), 0),
        ).where(RABill.work_order_id == wo_id)
    )
    row = result.one()
    next_bill = int(row[0]) + 1
    cumulative_qty = float(row[1]) + data.quantity_executed
    cumulative_amt = float(row[2]) + data.amount

    bill = RABill(
        work_order_id=wo_id,
        bill_number=next_bill,
        period_from=data.period_from,
        period_to=data.period_to,
        quantity_executed=data.quantity_executed,
        amount=data.amount,
        cumulative_quantity=cumulative_qty,
        cumulative_amount=cumulative_amt,
        status=RABillStatus.SUBMITTED,
        org_id=org_id,
    )
    db.add(bill)

    # Mark WO as ACTIVE if still DRAFT
    if wo.status == WorkOrderStatus.DRAFT:
        wo.status = WorkOrderStatus.ACTIVE

    await db.commit()
    await db.refresh(bill)
    return bill


async def update_ra_bill_status(
    bill_id: UUID, new_status: str, org_id: UUID, db: AsyncSession
) -> RABill:
    """Progress an RA bill through its lifecycle.

    When status becomes APPROVED, the spending lock is enforced and an OUTFLOW
    transaction is created on the project wallet.
    """
    result = await db.execute(select(RABill).where(RABill.id == bill_id))
    bill = result.scalar_one_or_none()
    if not bill or bill.org_id != org_id:
        raise NotFoundException(detail=f"RA Bill '{bill_id}' not found")

    target = RABillStatus(new_status)

    # Validate transitions
    valid_transitions = {
        RABillStatus.SUBMITTED: [RABillStatus.VERIFIED],
        RABillStatus.VERIFIED: [RABillStatus.APPROVED],
        RABillStatus.APPROVED: [RABillStatus.PAID],
    }
    allowed = valid_transitions.get(bill.status, [])
    if target not in allowed:
        raise BadRequestException(
            detail=f"Cannot transition from {bill.status.value} to {target.value}"
        )

    # When approving, enforce spending lock and create OUTFLOW transaction
    if target == RABillStatus.APPROVED:
        wo = await get_work_order(bill.work_order_id, org_id, db)
        await authorize_expense(wo.project_id, Decimal(str(bill.amount)), db)

        wallet = await get_wallet(wo.project_id, db)
        wallet.total_spent += Decimal(str(bill.amount))

        txn = Transaction(
            project_id=wo.project_id,
            category=TransactionCategory.OUTFLOW,
            source=TransactionSource.VENDOR,
            amount=Decimal(str(bill.amount)),
            description=f"RA Bill #{bill.bill_number} for WO {wo.wo_number}",
            status=TransactionStatus.CLEARED,
            org_id=org_id,
        )
        db.add(txn)

    bill.status = target
    await db.commit()
    await db.refresh(bill)
    return bill
