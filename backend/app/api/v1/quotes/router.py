from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthContext, role_required
from app.db.session import get_db
from app.models.quotation import QuoteStatus
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
    ctx: AuthContext = Depends(role_required(["SALES", "MANAGER", "SUPER_ADMIN"])),
):
    """Create a new quotation in DRAFT status with nested rooms and items."""
    quotation = await quotation_service.create_quotation(
        data=payload, user_id=ctx.user.id, org_id=ctx.org_id, db=db
    )
    return quotation


@router.get("", response_model=list[QuotationResponse], status_code=status.HTTP_200_OK)
async def list_quotations(
    lead_id: Optional[UUID] = Query(None),
    status_filter: Optional[QuoteStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(
        role_required(["BDE", "SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """List quotations with optional filters for lead and status."""
    quotations = await quotation_service.get_quotations(
        db=db,
        org_id=ctx.org_id,
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
    ctx: AuthContext = Depends(
        role_required(["BDE", "SALES", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Retrieve a single quotation with its rooms and items."""
    quotation = await quotation_service.get_quotation(quote_id=quote_id, org_id=ctx.org_id, db=db)
    return quotation


@router.post(
    "/{quote_id}/finalize",
    response_model=QuotationResponse,
    status_code=status.HTTP_200_OK,
)
async def finalize_quotation(
    quote_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["SALES", "MANAGER", "SUPER_ADMIN"])),
):
    """Finalize a DRAFT quotation, freezing it as a versioned snapshot.
    Creates a new version if previous versions exist for the same lead."""
    quotation = await quotation_service.finalize_quotation(quote_id=quote_id, org_id=ctx.org_id, db=db)
    return quotation


@router.patch(
    "/{quote_id}/status",
    response_model=QuotationResponse,
    status_code=status.HTTP_200_OK,
)
async def update_quotation_status(
    quote_id: UUID,
    payload: QuotationUpdate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["SALES", "MANAGER", "SUPER_ADMIN"])),
):
    """Update the status of a quotation (e.g., SENT, APPROVED, REJECTED).

    SALES can only set status to SENT or DRAFT.
    APPROVED/REJECTED require MANAGER or SUPER_ADMIN role.
    """
    restricted_statuses = {"APPROVED", "REJECTED", "ARCHIVED"}
    if payload.status in restricted_statuses and ctx.role == "SALES":
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403,
            detail=f"SALES role cannot set quotation status to {payload.status}. Only MANAGER or SUPER_ADMIN can approve/reject quotations.",
        )
    quotation = await quotation_service.update_quotation_status(
        quote_id=quote_id, status=payload.status, org_id=ctx.org_id, db=db
    )
    return quotation


@router.get("/{quote_id}/pdf", status_code=status.HTTP_200_OK)
async def download_quote_pdf(
    quote_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["SALES", "MANAGER", "SUPER_ADMIN"])),
):
    """Download quotation as PDF."""
    from io import BytesIO

    from fastapi.responses import StreamingResponse

    from app.services import pdf_service

    pdf_bytes = await pdf_service.generate_quote_pdf(quote_id, ctx.org_id, db)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=quote-{quote_id}.pdf"},
    )


@router.post("/{quote_id}/send", status_code=status.HTTP_200_OK)
async def send_quote_to_client(
    quote_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["SALES", "MANAGER", "SUPER_ADMIN"])),
):
    """Send quotation PDF to the client via email. Finalizes if still DRAFT."""
    quotation = await quotation_service.send_quotation_to_client(
        quote_id=quote_id, org_id=ctx.org_id, db=db
    )
    return {"message": "Quotation sent successfully", "quote_id": str(quotation.id)}
