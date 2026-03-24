from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_auth_context, role_required, AuthContext
from app.db.session import get_db
from app.models.invoice import InvoiceStatus
from app.schemas.invoice import InvoiceCreate, InvoiceResponse, InvoiceUpdate
from app.services import invoice_service

router = APIRouter()


@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Create a new invoice with line items."""
    return await invoice_service.create_invoice(data, ctx.org_id, db)


@router.get("/", response_model=list[InvoiceResponse])
async def list_invoices(
    project_id: Optional[UUID] = Query(None),
    inv_status: Optional[InvoiceStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List invoices with optional filters."""
    return await invoice_service.list_invoices(
        db,
        org_id=ctx.org_id,
        project_id=project_id,
        status=inv_status,
        skip=skip,
        limit=limit,
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Get a single invoice."""
    return await invoice_service.get_invoice(invoice_id, ctx.org_id, db)


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Update invoice fields."""
    return await invoice_service.update_invoice(invoice_id, data, ctx.org_id, db)


@router.post("/{invoice_id}/send", response_model=InvoiceResponse)
async def send_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Mark invoice as SENT."""
    return await invoice_service.send_invoice(invoice_id, ctx.org_id, db)


@router.post("/{invoice_id}/mark-paid", response_model=InvoiceResponse)
async def mark_invoice_paid(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Mark invoice as PAID and create INFLOW transaction."""
    return await invoice_service.mark_invoice_paid(invoice_id, ctx.org_id, db)


@router.get("/{invoice_id}/pdf", status_code=status.HTTP_200_OK)
async def download_invoice_pdf(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Download invoice as PDF."""
    from io import BytesIO

    from fastapi.responses import StreamingResponse

    from app.services import pdf_service

    pdf_bytes = await pdf_service.generate_invoice_pdf(invoice_id, ctx.org_id, db)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=invoice-{invoice_id}.pdf"
        },
    )
