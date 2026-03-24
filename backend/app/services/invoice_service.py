"""Invoice service — create, send, mark paid."""

from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.finance import TransactionCategory, TransactionSource, TransactionStatus
from app.models.invoice import Invoice, InvoiceItem, InvoiceStatus
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate


async def _next_invoice_number(org_id: UUID, db: AsyncSession) -> str:
    """Generate a sequential invoice number like INV-00001, scoped to org."""
    result = await db.execute(
        select(func.count(Invoice.id)).where(Invoice.org_id == org_id)
    )
    count = result.scalar() or 0
    return f"INV-{count + 1:05d}"


async def _get_invoice(invoice_id: UUID, org_id: UUID, db: AsyncSession) -> Invoice:
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.items))
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice or invoice.org_id != org_id:
        raise NotFoundException(detail=f"Invoice '{invoice_id}' not found")
    return invoice


async def create_invoice(
    data: InvoiceCreate, org_id: UUID, db: AsyncSession
) -> Invoice:
    """Create a new invoice with line items. Auto-calculates totals."""
    invoice_number = await _next_invoice_number(org_id, db)

    subtotal = Decimal("0")
    items = []
    for item_data in data.items:
        amount = Decimal(str(item_data.quantity)) * Decimal(str(item_data.rate))
        items.append(
            InvoiceItem(
                description=item_data.description,
                quantity=item_data.quantity,
                rate=item_data.rate,
                amount=float(amount),
                linked_sprint_id=item_data.linked_sprint_id,
                hsn_code=item_data.hsn_code,
            )
        )
        subtotal += amount

    tax_amount = subtotal * Decimal(str(data.tax_percent)) / Decimal("100")
    total_amount = subtotal + tax_amount

    invoice = Invoice(
        project_id=data.project_id,
        invoice_number=invoice_number,
        status=InvoiceStatus.DRAFT,
        issue_date=data.issue_date,
        due_date=data.due_date,
        subtotal=float(subtotal),
        tax_percent=data.tax_percent,
        tax_amount=float(tax_amount),
        total_amount=float(total_amount),
        notes=data.notes,
        items=items,
        org_id=org_id,
    )
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)
    return await _get_invoice(invoice.id, org_id, db)


async def list_invoices(
    db: AsyncSession,
    org_id: UUID,
    project_id: UUID | None = None,
    status: InvoiceStatus | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Invoice]:
    """List invoices with optional filters."""
    query = (
        select(Invoice)
        .options(selectinload(Invoice.items))
        .where(Invoice.org_id == org_id)
    )
    if project_id:
        query = query.where(Invoice.project_id == project_id)
    if status:
        query = query.where(Invoice.status == status)
    query = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_invoice(invoice_id: UUID, org_id: UUID, db: AsyncSession) -> Invoice:
    return await _get_invoice(invoice_id, org_id, db)


async def update_invoice(
    invoice_id: UUID, data: InvoiceUpdate, org_id: UUID, db: AsyncSession
) -> Invoice:
    """Update invoice fields (status, dates, tax, notes)."""
    invoice = await _get_invoice(invoice_id, org_id, db)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(invoice, key, value)

    # Recalculate if tax changed
    if "tax_percent" in update_data:
        subtotal = Decimal(str(invoice.subtotal))
        tax_amount = subtotal * Decimal(str(invoice.tax_percent)) / Decimal("100")
        invoice.tax_amount = float(tax_amount)
        invoice.total_amount = float(subtotal + tax_amount)

    db.add(invoice)
    await db.commit()
    return await _get_invoice(invoice_id, org_id, db)


async def send_invoice(invoice_id: UUID, org_id: UUID, db: AsyncSession) -> Invoice:
    """Mark invoice as SENT and notify client."""
    invoice = await _get_invoice(invoice_id, org_id, db)
    if invoice.status != InvoiceStatus.DRAFT:
        raise BadRequestException(detail="Only DRAFT invoices can be sent.")
    invoice.status = InvoiceStatus.SENT
    db.add(invoice)
    await db.commit()
    return await _get_invoice(invoice_id, org_id, db)


async def mark_invoice_paid(
    invoice_id: UUID, org_id: UUID, db: AsyncSession
) -> Invoice:
    """Mark invoice as PAID and create an INFLOW transaction on the project wallet."""
    invoice = await _get_invoice(invoice_id, org_id, db)
    if invoice.status not in (InvoiceStatus.SENT, InvoiceStatus.OVERDUE):
        raise BadRequestException(
            detail="Only SENT or OVERDUE invoices can be marked as paid."
        )
    invoice.status = InvoiceStatus.PAID
    db.add(invoice)

    # Create INFLOW transaction
    from app.models.finance import ProjectWallet, Transaction

    wallet_result = await db.execute(
        select(ProjectWallet).where(ProjectWallet.project_id == invoice.project_id)
    )
    wallet = wallet_result.scalar_one_or_none()

    if wallet:
        txn = Transaction(
            project_id=invoice.project_id,
            category=TransactionCategory.INFLOW,
            source=TransactionSource.CLIENT,
            amount=Decimal(str(invoice.total_amount)),
            description=f"Invoice {invoice.invoice_number} payment",
            status=TransactionStatus.CLEARED,
            org_id=org_id,
        )
        db.add(txn)
        wallet.total_received += Decimal(str(invoice.total_amount))
        db.add(wallet)

    await db.commit()
    return await _get_invoice(invoice_id, org_id, db)
