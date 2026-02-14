from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, role_required
from app.db.session import get_db
from app.models.finance import TransactionCategory, TransactionSource, TransactionStatus
from app.models.user import User
from app.schemas.finance import (
    FinancialHealthResponse,
    TransactionCreate,
    TransactionResponse,
    WalletResponse,
)
from app.services import finance_service

router = APIRouter()


@router.get(
    "/projects/{project_id}/financial-health",
    response_model=FinancialHealthResponse,
    status_code=status.HTTP_200_OK,
)
async def get_financial_health(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Get the financial health summary for a project including balance,
    spending power, and estimated margin."""
    health = await finance_service.get_financial_health(project_id=project_id, db=db)
    return health


@router.get(
    "/projects/{project_id}/wallet",
    response_model=WalletResponse,
    status_code=status.HTTP_200_OK,
)
async def get_project_wallet(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current state of a project's wallet."""
    wallet = await finance_service.get_wallet(project_id=project_id, db=db)
    return wallet


@router.get(
    "/transactions",
    response_model=list[TransactionResponse],
    status_code=status.HTTP_200_OK,
)
async def list_transactions(
    category: Optional[TransactionCategory] = Query(None),
    source: Optional[TransactionSource] = Query(None),
    txn_status: Optional[TransactionStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all transactions across all projects with optional filters."""
    transactions = await finance_service.list_all_transactions(
        category=category,
        source=source,
        txn_status=txn_status,
        skip=skip,
        limit=limit,
        db=db,
    )
    return transactions


@router.post(
    "/transactions",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def record_transaction(
    payload: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a new financial transaction. For OUTFLOW transactions, the spending
    lock is enforced: the project wallet must have sufficient effective balance."""
    transaction = await finance_service.create_transaction(
        data=payload, user_id=current_user.id, db=db
    )
    return transaction


@router.patch(
    "/transactions/{txn_id}/verify",
    response_model=TransactionResponse,
    status_code=status.HTTP_200_OK,
)
async def verify_transaction(
    txn_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Verify a pending transaction by marking it as CLEARED. When a PENDING
    INFLOW transaction is verified, the project wallet is credited. For OUTFLOW
    transactions, the amount moves from pending_approvals to total_spent."""
    transaction = await finance_service.verify_transaction(txn_id=txn_id, db=db)
    return transaction


@router.get(
    "/projects/{project_id}/transactions",
    response_model=list[TransactionResponse],
    status_code=status.HTTP_200_OK,
)
async def list_project_transactions(
    project_id: UUID,
    category: Optional[TransactionCategory] = Query(None),
    source: Optional[TransactionSource] = Query(None),
    txn_status: Optional[TransactionStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all transactions for a project with optional filters."""
    transactions = await finance_service.list_project_transactions(
        project_id=project_id,
        category=category,
        source=source,
        txn_status=txn_status,
        skip=skip,
        limit=limit,
        db=db,
    )
    return transactions
