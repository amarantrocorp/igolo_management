from decimal import Decimal
from typing import List
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.budget import BudgetCategory, BudgetLineItem
from app.models.finance import (
    Transaction,
    TransactionCategory,
    TransactionSource,
    TransactionStatus,
)
from app.models.notification import NotificationType
from app.models.user import UserRole
from app.schemas.budget import BudgetLineItemCreate, BudgetLineItemUpdate
from app.services import notification_service


# Mapping from TransactionSource to BudgetCategory
SOURCE_TO_BUDGET = {
    TransactionSource.VENDOR: BudgetCategory.MATERIAL,
    TransactionSource.LABOR: BudgetCategory.LABOR,
    TransactionSource.PETTY_CASH: BudgetCategory.OVERHEAD,
}


async def create_budget_line_items(
    project_id: UUID,
    items: List[BudgetLineItemCreate],
    org_id: UUID,
    db: AsyncSession,
) -> List[BudgetLineItem]:
    """Bulk create budget line items for a project."""
    created = []
    for item_data in items:
        bli = BudgetLineItem(
            project_id=project_id,
            category=item_data.category,
            description=item_data.description,
            budgeted_amount=item_data.budgeted_amount,
            org_id=org_id,
        )
        db.add(bli)
        created.append(bli)
    await db.commit()
    for bli in created:
        await db.refresh(bli)
    return created


async def get_budget_line_items(
    project_id: UUID, org_id: UUID, db: AsyncSession
) -> List[BudgetLineItem]:
    """List all budget line items for a project."""
    result = await db.execute(
        select(BudgetLineItem)
        .where(
            BudgetLineItem.project_id == project_id,
            BudgetLineItem.org_id == org_id,
        )
        .order_by(BudgetLineItem.category)
    )
    return list(result.scalars().all())


async def update_budget_line_item(
    item_id: UUID, data: BudgetLineItemUpdate, org_id: UUID, db: AsyncSession
) -> BudgetLineItem:
    """Update a budget line item."""
    result = await db.execute(
        select(BudgetLineItem).where(BudgetLineItem.id == item_id)
    )
    bli = result.scalar_one_or_none()
    if not bli or bli.org_id != org_id:
        raise NotFoundException(detail="Budget line item not found")

    if data.description is not None:
        bli.description = data.description
    if data.budgeted_amount is not None:
        bli.budgeted_amount = data.budgeted_amount

    await db.commit()
    await db.refresh(bli)
    return bli


async def delete_budget_line_item(
    item_id: UUID, org_id: UUID, db: AsyncSession
) -> None:
    """Delete a budget line item."""
    result = await db.execute(
        select(BudgetLineItem).where(BudgetLineItem.id == item_id)
    )
    bli = result.scalar_one_or_none()
    if not bli or bli.org_id != org_id:
        raise NotFoundException(detail="Budget line item not found")
    await db.delete(bli)
    await db.commit()


async def get_budget_vs_actual(
    project_id: UUID, org_id: UUID, db: AsyncSession
) -> dict:
    """Compute budget vs actual spend per category for a project.

    Maps TransactionSource to BudgetCategory:
      VENDOR -> MATERIAL, LABOR -> LABOR, PETTY_CASH -> OVERHEAD
    """
    # Get budget line items grouped by category
    budget_result = await db.execute(
        select(
            BudgetLineItem.category,
            func.sum(BudgetLineItem.budgeted_amount).label("total"),
        )
        .where(
            BudgetLineItem.project_id == project_id,
            BudgetLineItem.org_id == org_id,
        )
        .group_by(BudgetLineItem.category)
    )
    budgeted_by_cat = {
        row.category: row.total for row in budget_result.all()
    }

    # Get actual spend grouped by source (OUTFLOW only, CLEARED)
    actual_result = await db.execute(
        select(
            Transaction.source,
            func.sum(Transaction.amount).label("total"),
        )
        .where(
            Transaction.project_id == project_id,
            Transaction.category == TransactionCategory.OUTFLOW,
            Transaction.status == TransactionStatus.CLEARED,
            Transaction.org_id == org_id,
        )
        .group_by(Transaction.source)
    )
    actual_by_source = {
        row.source: row.total for row in actual_result.all()
    }

    # Map actual spend to budget categories
    actual_by_cat = {}
    for source, budget_cat in SOURCE_TO_BUDGET.items():
        amt = actual_by_source.get(source, Decimal("0.00"))
        actual_by_cat[budget_cat] = actual_by_cat.get(
            budget_cat, Decimal("0.00")
        ) + amt

    # Build variance report
    all_categories = set(budgeted_by_cat.keys()) | set(actual_by_cat.keys())
    items = []
    total_budgeted = Decimal("0.00")
    total_actual = Decimal("0.00")

    for cat in sorted(all_categories, key=lambda c: c.value):
        budgeted = budgeted_by_cat.get(cat, Decimal("0.00"))
        actual = actual_by_cat.get(cat, Decimal("0.00"))
        variance = actual - budgeted
        variance_pct = (
            float((variance / budgeted) * 100) if budgeted > 0 else 0.0
        )
        items.append(
            {
                "category": cat.value,
                "budgeted": budgeted,
                "actual": actual,
                "variance": variance,
                "variance_pct": round(variance_pct, 1),
                "alert": variance_pct > 10.0,
            }
        )
        total_budgeted += budgeted
        total_actual += actual

    return {
        "project_id": str(project_id),
        "line_items": items,
        "total_budgeted": total_budgeted,
        "total_actual": total_actual,
        "total_variance": total_actual - total_budgeted,
    }


async def check_variance_alerts(
    project_id: UUID, org_id: UUID, db: AsyncSession
) -> None:
    """Check if any budget category exceeds 10% variance and send alerts."""
    report = await get_budget_vs_actual(project_id, org_id, db)
    alerts = [i for i in report["line_items"] if i["alert"]]

    if alerts:
        categories = ", ".join(a["category"] for a in alerts)
        await notification_service.notify_role(
            db=db,
            role=UserRole.MANAGER,
            type=NotificationType.ALERT,
            title="Budget Variance Alert",
            body=f"Budget exceeded >10% in: {categories} for project.",
            action_url="/dashboard/projects",
        )
