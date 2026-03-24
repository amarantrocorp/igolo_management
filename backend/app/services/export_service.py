"""CSV export service -- generates CSV for transactions, payroll, inventory."""

import csv
import io
from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.finance import Transaction, TransactionStatus
from app.models.inventory import Item
from app.models.labor import AttendanceLog


async def export_transactions_csv(
    db: AsyncSession,
    org_id: UUID,
    project_id: Optional[UUID] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> str:
    """Generate a CSV string of transactions."""
    from datetime import datetime, time, timedelta

    query = select(Transaction).where(
        Transaction.org_id == org_id
    ).order_by(Transaction.created_at.desc())
    if project_id:
        query = query.where(Transaction.project_id == project_id)
    if date_from:
        query = query.where(Transaction.created_at >= datetime.combine(date_from, time.min))
    if date_to:
        query = query.where(Transaction.created_at < datetime.combine(date_to + timedelta(days=1), time.min))

    result = await db.execute(query)
    transactions = list(result.scalars().all())

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Project ID", "Category", "Source", "Amount",
        "Description", "Status", "Date",
    ])
    for txn in transactions:
        writer.writerow([
            str(txn.id),
            str(txn.project_id),
            txn.category.value,
            txn.source.value,
            str(txn.amount),
            txn.description or "",
            txn.status.value,
            str(txn.created_at),
        ])
    return output.getvalue()


async def export_payroll_csv(
    db: AsyncSession,
    org_id: UUID,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> str:
    """Generate CSV of attendance/payroll records."""
    from sqlalchemy.orm import selectinload

    query = (
        select(AttendanceLog)
        .options(selectinload(AttendanceLog.team))
        .where(AttendanceLog.org_id == org_id)
        .order_by(AttendanceLog.date.desc())
    )
    if date_from:
        query = query.where(AttendanceLog.date >= date_from)
    if date_to:
        query = query.where(AttendanceLog.date <= date_to)

    result = await db.execute(query)
    logs = list(result.scalars().all())

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Project ID", "Sprint ID", "Team", "Date",
        "Workers Present", "Total Hours", "Calculated Cost", "Status",
    ])
    for log in logs:
        team_name = log.team.name if log.team else str(log.team_id)
        writer.writerow([
            str(log.id),
            str(log.project_id),
            str(log.sprint_id),
            team_name,
            str(log.date),
            log.workers_present,
            log.total_hours,
            str(log.calculated_cost),
            log.status.value if hasattr(log.status, "value") else str(log.status),
        ])
    return output.getvalue()


async def export_inventory_csv(db: AsyncSession, org_id: UUID) -> str:
    """Generate CSV of current inventory."""
    result = await db.execute(
        select(Item).where(Item.org_id == org_id).order_by(Item.name)
    )
    items = list(result.scalars().all())

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Name", "SKU", "Category", "Unit",
        "Base Price", "Selling Price", "Current Stock", "Reorder Level",
    ])
    for item in items:
        writer.writerow([
            str(item.id),
            item.name,
            item.sku or "",
            item.category,
            item.unit,
            str(item.base_price),
            str(item.selling_price),
            str(item.current_stock),
            str(item.reorder_level),
        ])
    return output.getvalue()


async def generate_cash_flow_report(
    db: AsyncSession,
    org_id: UUID,
    project_id: Optional[UUID] = None,
) -> str:
    """Generate a monthly cash flow CSV with running balance."""
    from sqlalchemy import case, func

    from app.models.finance import TransactionCategory

    period = func.date_trunc("month", Transaction.created_at).label("period")
    query = (
        select(
            period,
            func.coalesce(
                func.sum(case(
                    (Transaction.category == TransactionCategory.INFLOW, Transaction.amount),
                    else_=Decimal("0"),
                )),
                Decimal("0"),
            ).label("inflow"),
            func.coalesce(
                func.sum(case(
                    (Transaction.category == TransactionCategory.OUTFLOW, Transaction.amount),
                    else_=Decimal("0"),
                )),
                Decimal("0"),
            ).label("outflow"),
        )
        .where(
            Transaction.status == TransactionStatus.CLEARED,
            Transaction.org_id == org_id,
        )
        .group_by(period)
        .order_by(period)
    )
    if project_id:
        query = query.where(Transaction.project_id == project_id)

    rows = (await db.execute(query)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Month", "Inflow", "Outflow", "Net", "Running Balance"])

    running = Decimal("0")
    for row in rows:
        inflow = row.inflow or Decimal("0")
        outflow = row.outflow or Decimal("0")
        net = inflow - outflow
        running += net
        writer.writerow([
            row.period.strftime("%Y-%m") if row.period else "",
            str(inflow),
            str(outflow),
            str(net),
            str(running),
        ])
    return output.getvalue()
