from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.email import send_email_fire_and_forget
from app.core.exceptions import (
    BadRequestException,
    InsufficientFundsException,
    NotFoundException,
)
from app.models.finance import (
    ProjectWallet,
    Transaction,
    TransactionCategory,
    TransactionSource,
    TransactionStatus,
)
from app.schemas.finance import TransactionCreate


async def get_wallet(project_id: UUID, db: AsyncSession) -> ProjectWallet:
    """Retrieve the financial wallet for a project."""
    result = await db.execute(
        select(ProjectWallet).where(ProjectWallet.project_id == project_id)
    )
    wallet = result.scalar_one_or_none()
    if not wallet:
        raise NotFoundException(detail=f"Wallet for project '{project_id}' not found")
    return wallet


async def authorize_expense(
    project_id: UUID, amount: Decimal, db: AsyncSession
) -> bool:
    """Check if the project wallet has sufficient funds for the given expense.

    Uses conservative logic:
        effective_balance = total_received - (total_spent + pending_approvals)

    Raises InsufficientFundsException if effective_balance < amount.
    """
    wallet = await get_wallet(project_id, db)

    effective_balance = wallet.total_received - (
        wallet.total_spent + wallet.pending_approvals
    )

    if effective_balance < amount:
        raise InsufficientFundsException(
            current=effective_balance,
            required=amount,
            message=(
                f"Project funds exhausted. Effective balance: {effective_balance}, "
                f"Required: {amount}. Request Top-up from Client."
            ),
        )
    return True


async def create_transaction(
    data: TransactionCreate, user_id: UUID, db: AsyncSession
) -> Transaction:
    """Create a financial transaction for a project.

    For OUTFLOW transactions, authorize_expense is called first to ensure
    sufficient funds. Wallet totals are updated accordingly.
    """
    wallet = await get_wallet(data.project_id, db)

    # For outflow, validate spending power
    if data.category == TransactionCategory.OUTFLOW:
        await authorize_expense(data.project_id, data.amount, db)

    transaction = Transaction(
        project_id=data.project_id,
        category=data.category,
        source=data.source,
        amount=data.amount,
        description=data.description,
        reference_id=data.reference_id,
        related_po_id=data.related_po_id,
        related_labor_log_id=data.related_labor_log_id,
        related_vo_id=data.related_vo_id,
        recorded_by_id=user_id,
        proof_doc_url=data.proof_doc_url,
        status=TransactionStatus.PENDING,
    )
    db.add(transaction)

    # Update wallet based on transaction category
    if data.category == TransactionCategory.OUTFLOW:
        # Add to pending approvals until cleared
        wallet.pending_approvals += data.amount
    elif data.category == TransactionCategory.INFLOW:
        # Inflow stays pending until verified/cleared
        pass  # Will be credited on verification

    db.add(wallet)
    await db.commit()
    await db.refresh(transaction)

    # Notify managers about pending transaction
    from app.models.notification import NotificationType
    from app.models.user import UserRole
    from app.services.notification_service import notify_role

    await notify_role(
        db=db,
        role=UserRole.MANAGER,
        type=NotificationType.APPROVAL_REQ,
        title="Transaction Pending Verification",
        body=f"{data.category.value} of Rs. {data.amount} ({data.source.value}) needs verification.",
        action_url=f"/dashboard/admin/finance",
        email_template="transaction_pending.html",
        email_data={
            "project_name": f"Project {str(data.project_id)[:8]}",
            "amount": str(data.amount),
            "category": data.category.value,
            "source": data.source.value,
            "description": data.description or "",
            "action_url": "/dashboard/admin/finance",
        },
    )

    return transaction


async def verify_transaction(txn_id: UUID, db: AsyncSession) -> Transaction:
    """Mark a PENDING transaction as CLEARED and update the wallet.

    For INFLOW: Increases total_received on the wallet.
    For OUTFLOW: Moves amount from pending_approvals to total_spent.
    """
    result = await db.execute(select(Transaction).where(Transaction.id == txn_id))
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise NotFoundException(detail=f"Transaction with id '{txn_id}' not found")

    if transaction.status != TransactionStatus.PENDING:
        raise BadRequestException(
            detail=f"Only PENDING transactions can be verified. "
            f"Current status: {transaction.status.value}"
        )

    wallet = await get_wallet(transaction.project_id, db)

    transaction.status = TransactionStatus.CLEARED

    if transaction.category == TransactionCategory.INFLOW:
        wallet.total_received += transaction.amount
    elif transaction.category == TransactionCategory.OUTFLOW:
        wallet.pending_approvals -= transaction.amount
        wallet.total_spent += transaction.amount

    db.add(transaction)
    db.add(wallet)
    await db.commit()
    await db.refresh(transaction)

    # If INFLOW cleared, notify client about payment confirmation
    if transaction.category == TransactionCategory.INFLOW:
        from sqlalchemy.orm import selectinload

        from app.models.crm import Client
        from app.models.project import Project

        proj_result = await db.execute(
            select(Project)
            .options(
                selectinload(Project.client).selectinload(Client.user)
            )
            .where(Project.id == transaction.project_id)
        )
        project = proj_result.scalar_one_or_none()
        if project and project.client and project.client.user:
            client_user = project.client.user
            if client_user.email:
                send_email_fire_and_forget(
                    subject="Payment Confirmed",
                    email_to=client_user.email,
                    template_name="payment_confirmed.html",
                    template_data={
                        "subject": "Payment Confirmed",
                        "client_name": client_user.full_name,
                        "project_name": project.name,
                        "amount": str(transaction.amount),
                        "reference_id": transaction.reference_id or "",
                        "action_url": None,
                        "frontend_url": "",
                    },
                )

    return transaction


async def get_financial_health(project_id: UUID, db: AsyncSession) -> dict:
    """Return a complete financial snapshot of a project.

    Includes:
    - All wallet figures (agreed value, received, spent, pending)
    - current_balance and effective_balance
    - can_spend_more flag (True if effective_balance > 0)
    - estimated_margin_percent: ((agreed - spent) / agreed) * 100
    """
    wallet = await get_wallet(project_id, db)

    current_balance = wallet.total_received - wallet.total_spent
    effective_balance = wallet.total_received - (
        wallet.total_spent + wallet.pending_approvals
    )
    can_spend_more = effective_balance > Decimal("0.00")

    # Margin calculation: how much profit margin remains
    if wallet.total_agreed_value > Decimal("0.00"):
        estimated_margin_percent = float(
            (
                (wallet.total_agreed_value - wallet.total_spent)
                / wallet.total_agreed_value
            )
            * Decimal("100")
        )
    else:
        estimated_margin_percent = 0.0

    return {
        "project_id": project_id,
        "total_agreed_value": wallet.total_agreed_value,
        "total_received": wallet.total_received,
        "total_spent": wallet.total_spent,
        "pending_approvals": wallet.pending_approvals,
        "current_balance": current_balance,
        "effective_balance": effective_balance,
        "can_spend_more": can_spend_more,
        "estimated_margin_percent": round(estimated_margin_percent, 2),
    }


async def list_all_transactions(
    db: AsyncSession,
    category: Optional[TransactionCategory] = None,
    source: Optional[TransactionSource] = None,
    txn_status: Optional[TransactionStatus] = None,
    project_id: Optional[UUID] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Transaction]:
    """List all transactions across all projects with optional filters."""
    query = select(Transaction)

    if category is not None:
        query = query.where(Transaction.category == category)
    if source is not None:
        query = query.where(Transaction.source == source)
    if txn_status is not None:
        query = query.where(Transaction.status == txn_status)
    if project_id is not None:
        query = query.where(Transaction.project_id == project_id)
    if date_from is not None:
        query = query.where(
            Transaction.created_at >= datetime.combine(date_from, time.min)
        )
    if date_to is not None:
        query = query.where(
            Transaction.created_at < datetime.combine(date_to + timedelta(days=1), time.min)
        )

    query = query.order_by(Transaction.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    return list(result.scalars().all())


async def list_project_transactions(
    project_id: UUID,
    db: AsyncSession,
    category: Optional[TransactionCategory] = None,
    source: Optional[TransactionSource] = None,
    txn_status: Optional[TransactionStatus] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Transaction]:
    """List transactions for a project with optional filters.

    Supports filtering by category (INFLOW/OUTFLOW), source
    (CLIENT/VENDOR/LABOR/PETTY_CASH), and status (PENDING/CLEARED/REJECTED).
    Results are ordered by creation date descending (newest first) and
    paginated via skip/limit.
    """
    query = select(Transaction).where(Transaction.project_id == project_id)

    if category is not None:
        query = query.where(Transaction.category == category)
    if source is not None:
        query = query.where(Transaction.source == source)
    if txn_status is not None:
        query = query.where(Transaction.status == txn_status)

    query = query.order_by(Transaction.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    return list(result.scalars().all())


# ── Analytics / Aggregation ──────────────────────────────────────────────────


def _apply_date_project_filters(query, date_from, date_to, project_id):
    """Apply shared date-range and project_id filters to a query."""
    if project_id is not None:
        query = query.where(Transaction.project_id == project_id)
    if date_from is not None:
        query = query.where(
            Transaction.created_at >= datetime.combine(date_from, time.min)
        )
    if date_to is not None:
        query = query.where(
            Transaction.created_at < datetime.combine(date_to + timedelta(days=1), time.min)
        )
    return query


async def get_transaction_summary(
    db: AsyncSession,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    project_id: Optional[UUID] = None,
) -> dict:
    """Return summary totals (inflow, outflow, pending) for the given filters."""
    query = select(
        func.coalesce(
            func.sum(
                case(
                    (
                        (Transaction.category == TransactionCategory.INFLOW)
                        & (Transaction.status == TransactionStatus.CLEARED),
                        Transaction.amount,
                    ),
                    else_=Decimal("0"),
                )
            ),
            Decimal("0"),
        ).label("total_inflow"),
        func.coalesce(
            func.sum(
                case(
                    (
                        (Transaction.category == TransactionCategory.OUTFLOW)
                        & (Transaction.status == TransactionStatus.CLEARED),
                        Transaction.amount,
                    ),
                    else_=Decimal("0"),
                )
            ),
            Decimal("0"),
        ).label("total_outflow"),
        func.coalesce(
            func.sum(
                case(
                    (
                        (Transaction.category == TransactionCategory.INFLOW)
                        & (Transaction.status == TransactionStatus.PENDING),
                        Transaction.amount,
                    ),
                    else_=Decimal("0"),
                )
            ),
            Decimal("0"),
        ).label("pending_inflow"),
        func.coalesce(
            func.sum(
                case(
                    (
                        (Transaction.category == TransactionCategory.OUTFLOW)
                        & (Transaction.status == TransactionStatus.PENDING),
                        Transaction.amount,
                    ),
                    else_=Decimal("0"),
                )
            ),
            Decimal("0"),
        ).label("pending_outflow"),
        func.count(
            case(
                (Transaction.status == TransactionStatus.PENDING, Transaction.id),
            )
        ).label("pending_count"),
        func.count().label("total_count"),
    )

    query = _apply_date_project_filters(query, date_from, date_to, project_id)
    row = (await db.execute(query)).one()

    total_inflow = row.total_inflow or Decimal("0")
    total_outflow = row.total_outflow or Decimal("0")

    return {
        "total_inflow": total_inflow,
        "total_outflow": total_outflow,
        "net_balance": total_inflow - total_outflow,
        "pending_inflow": row.pending_inflow or Decimal("0"),
        "pending_outflow": row.pending_outflow or Decimal("0"),
        "pending_count": row.pending_count,
        "total_count": row.total_count,
    }


async def get_transaction_aggregation(
    db: AsyncSession,
    group_by: str,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    project_id: Optional[UUID] = None,
) -> dict:
    """Return inflow/outflow totals bucketed by day, week, or month."""
    period = func.date_trunc(group_by, Transaction.created_at).label("period")

    query = (
        select(
            period,
            func.coalesce(
                func.sum(
                    case(
                        (
                            Transaction.category == TransactionCategory.INFLOW,
                            Transaction.amount,
                        ),
                        else_=Decimal("0"),
                    )
                ),
                Decimal("0"),
            ).label("inflow"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            Transaction.category == TransactionCategory.OUTFLOW,
                            Transaction.amount,
                        ),
                        else_=Decimal("0"),
                    )
                ),
                Decimal("0"),
            ).label("outflow"),
        )
        .where(Transaction.status == TransactionStatus.CLEARED)
        .group_by(period)
        .order_by(period)
    )

    query = _apply_date_project_filters(query, date_from, date_to, project_id)
    rows = (await db.execute(query)).all()

    buckets = []
    for row in rows:
        inflow = row.inflow or Decimal("0")
        outflow = row.outflow or Decimal("0")
        buckets.append({
            "period": row.period.date().isoformat() if row.period else "",
            "inflow": inflow,
            "outflow": outflow,
            "net": inflow - outflow,
        })

    return {"group_by": group_by, "buckets": buckets}


async def get_source_breakdown(
    db: AsyncSession,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    project_id: Optional[UUID] = None,
) -> list[dict]:
    """Return inflow/outflow totals grouped by transaction source."""
    query = (
        select(
            Transaction.source,
            func.coalesce(
                func.sum(
                    case(
                        (
                            Transaction.category == TransactionCategory.INFLOW,
                            Transaction.amount,
                        ),
                        else_=Decimal("0"),
                    )
                ),
                Decimal("0"),
            ).label("total_inflow"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            Transaction.category == TransactionCategory.OUTFLOW,
                            Transaction.amount,
                        ),
                        else_=Decimal("0"),
                    )
                ),
                Decimal("0"),
            ).label("total_outflow"),
        )
        .where(Transaction.status == TransactionStatus.CLEARED)
        .group_by(Transaction.source)
    )

    query = _apply_date_project_filters(query, date_from, date_to, project_id)
    rows = (await db.execute(query)).all()

    return [
        {
            "source": row.source.value,
            "total_inflow": row.total_inflow or Decimal("0"),
            "total_outflow": row.total_outflow or Decimal("0"),
        }
        for row in rows
    ]


async def get_project_breakdown(
    db: AsyncSession,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> list[dict]:
    """Return inflow/outflow totals grouped by project."""
    from app.models.project import Project

    query = (
        select(
            Transaction.project_id,
            Project.name.label("project_name"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            Transaction.category == TransactionCategory.INFLOW,
                            Transaction.amount,
                        ),
                        else_=Decimal("0"),
                    )
                ),
                Decimal("0"),
            ).label("total_inflow"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            Transaction.category == TransactionCategory.OUTFLOW,
                            Transaction.amount,
                        ),
                        else_=Decimal("0"),
                    )
                ),
                Decimal("0"),
            ).label("total_outflow"),
        )
        .join(Project, Transaction.project_id == Project.id)
        .where(Transaction.status == TransactionStatus.CLEARED)
        .group_by(Transaction.project_id, Project.name)
        .order_by(func.sum(
            case(
                (
                    Transaction.category == TransactionCategory.OUTFLOW,
                    Transaction.amount,
                ),
                else_=Decimal("0"),
            )
        ).desc())
    )

    if date_from is not None:
        query = query.where(
            Transaction.created_at >= datetime.combine(date_from, time.min)
        )
    if date_to is not None:
        query = query.where(
            Transaction.created_at < datetime.combine(date_to + timedelta(days=1), time.min)
        )

    rows = (await db.execute(query)).all()

    return [
        {
            "project_id": row.project_id,
            "project_name": row.project_name,
            "total_inflow": row.total_inflow or Decimal("0"),
            "total_outflow": row.total_outflow or Decimal("0"),
            "net": (row.total_inflow or Decimal("0")) - (row.total_outflow or Decimal("0")),
        }
        for row in rows
    ]
