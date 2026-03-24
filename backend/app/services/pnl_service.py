"""Project P&L (Profit & Loss) Service.

No new models -- computed from existing Transaction, ProjectWallet, and VariationOrder data.
"""

from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.finance import (
    ProjectWallet,
    Transaction,
    TransactionCategory,
    TransactionSource,
    TransactionStatus,
)
from app.models.project import Project, VariationOrder, VOStatus


async def get_project_pnl(project_id: UUID, org_id: UUID, db: AsyncSession) -> dict:
    """Compute a full P&L statement for a project.

    Returns:
        revenue: total_agreed_value + approved/paid VOs
        cost_breakdown: by source (VENDOR -> materials, LABOR -> labor, PETTY_CASH -> overhead)
        gross_profit: revenue - total_cost
        margin_percent: (gross_profit / revenue) * 100
        status: PROFITABLE / BREAK_EVEN / LOSS_MAKING
        monthly_burn_rate: total_cost / months_elapsed
    """
    # Fetch project + wallet
    proj_result = await db.execute(select(Project).where(Project.id == project_id))
    project = proj_result.scalar_one_or_none()
    if not project or project.org_id != org_id:
        raise NotFoundException(detail=f"Project '{project_id}' not found")

    wallet_result = await db.execute(
        select(ProjectWallet).where(ProjectWallet.project_id == project_id)
    )
    wallet = wallet_result.scalar_one_or_none()
    if not wallet or wallet.org_id != org_id:
        raise NotFoundException(detail=f"Wallet for project '{project_id}' not found")

    # Revenue: agreed value + approved VOs
    vo_result = await db.execute(
        select(
            func.coalesce(func.sum(VariationOrder.additional_cost), Decimal("0"))
        ).where(
            VariationOrder.project_id == project_id,
            VariationOrder.org_id == org_id,
            VariationOrder.status.in_(
                [
                    VOStatus.APPROVED,
                    VOStatus.PAID,
                ]
            ),
        )
    )
    approved_vo_total = vo_result.scalar() or Decimal("0")
    revenue = wallet.total_agreed_value + approved_vo_total

    # Cost breakdown by source (only CLEARED OUTFLOW)
    cost_query = (
        select(
            Transaction.source,
            func.coalesce(func.sum(Transaction.amount), Decimal("0")).label("total"),
        )
        .where(
            Transaction.project_id == project_id,
            Transaction.org_id == org_id,
            Transaction.category == TransactionCategory.OUTFLOW,
            Transaction.status == TransactionStatus.CLEARED,
        )
        .group_by(Transaction.source)
    )
    cost_rows = (await db.execute(cost_query)).all()

    source_map = {
        TransactionSource.VENDOR: "materials",
        TransactionSource.LABOR: "labor",
        TransactionSource.PETTY_CASH: "overhead",
        TransactionSource.CLIENT: "other",
    }

    cost_breakdown = {
        "materials": Decimal("0"),
        "labor": Decimal("0"),
        "overhead": Decimal("0"),
        "other": Decimal("0"),
    }
    for row in cost_rows:
        key = source_map.get(row.source, "other")
        cost_breakdown[key] += row.total or Decimal("0")

    total_cost = sum(cost_breakdown.values())
    gross_profit = revenue - total_cost

    # Margin
    if revenue > Decimal("0"):
        margin_percent = float((gross_profit / revenue) * Decimal("100"))
    else:
        margin_percent = 0.0

    # Status
    if gross_profit > Decimal("0"):
        status = "PROFITABLE"
    elif gross_profit == Decimal("0"):
        status = "BREAK_EVEN"
    else:
        status = "LOSS_MAKING"

    # Monthly burn rate
    from datetime import date as date_type

    start = project.start_date
    today = date_type.today()
    if start and today > start:
        months_elapsed = max(
            1, ((today.year - start.year) * 12 + today.month - start.month) or 1
        )
        monthly_burn_rate = float(total_cost / Decimal(str(months_elapsed)))
    else:
        monthly_burn_rate = 0.0

    return {
        "project_id": str(project_id),
        "revenue": revenue,
        "approved_vo_total": approved_vo_total,
        "cost_breakdown": {k: v for k, v in cost_breakdown.items()},
        "total_cost": total_cost,
        "gross_profit": gross_profit,
        "margin_percent": round(margin_percent, 2),
        "status": status,
        "monthly_burn_rate": round(monthly_burn_rate, 2),
        "total_received": wallet.total_received,
        "total_spent": wallet.total_spent,
        "pending_approvals": wallet.pending_approvals,
    }
