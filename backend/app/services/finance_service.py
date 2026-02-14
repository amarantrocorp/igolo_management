from decimal import Decimal
from uuid import UUID

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
