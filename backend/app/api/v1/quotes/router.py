from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import role_required
from app.db.session import get_db
from app.models.quotation import QuoteStatus
from app.models.user import User
from app.schemas.quotation import (
    QuotationCreate,
    QuotationResponse,
    QuotationUpdate,
)
from app.services import quotation_service

router = APIRouter()


@router.post("", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
async def create_quotation(
    payload: QuotationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        role_required(["SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Create a new quotation in DRAFT status with nested rooms and items."""
    quotation = await quotation_service.create_quotation(
        data=payload, user_id=current_user.id, db=db
    )
    return quotation


@router.get("", response_model=list[QuotationResponse], status_code=status.HTTP_200_OK)
async def list_quotations(
    lead_id: Optional[UUID] = Query(None),
    status_filter: Optional[QuoteStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        role_required(["SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """List quotations with optional filters for lead and status."""
    quotations = await quotation_service.get_quotations(
        db=db,
        lead_id=lead_id,
        skip=skip,
        limit=limit,
    )
    return quotations


@router.get(
    "/{quote_id}", response_model=QuotationResponse, status_code=status.HTTP_200_OK
)
async def get_quotation(
    quote_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        role_required(["SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Retrieve a single quotation with its rooms and items."""
    quotation = await quotation_service.get_quotation(quote_id=quote_id, db=db)
    return quotation


@router.post(
    "/quotes/{quote_id}/finalize",
    response_model=QuotationResponse,
    status_code=status.HTTP_200_OK,
)
async def finalize_quotation(
    quote_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        role_required(["SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Finalize a DRAFT quotation, freezing it as a versioned snapshot.
    Creates a new version if previous versions exist for the same lead."""
    quotation = await quotation_service.finalize_quotation(
        quote_id=quote_id, db=db
    )
    return quotation


@router.patch(
    "/quotes/{quote_id}/status",
    response_model=QuotationResponse,
    status_code=status.HTTP_200_OK,
)
async def update_quotation_status(
    quote_id: UUID,
    payload: QuotationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        role_required(["SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Update the status of a quotation (e.g., SENT, APPROVED, REJECTED)."""
    quotation = await quotation_service.update_quotation_status(
        quote_id=quote_id, status=payload.status, db=db
    )
    return quotation
