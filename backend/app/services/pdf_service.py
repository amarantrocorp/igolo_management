"""PDF generation using WeasyPrint + Jinja2."""

import os
from uuid import UUID

from jinja2 import Environment, FileSystemLoader
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.core.exceptions import NotFoundException

TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR), autoescape=True)


def _render_html(template_name: str, context: dict) -> str:
    """Render a Jinja2 template to HTML string."""
    tmpl = _env.get_template(template_name)
    return tmpl.render(**context)


def _html_to_pdf(html: str) -> bytes:
    """Convert HTML string to PDF bytes via WeasyPrint."""
    from weasyprint import HTML

    return HTML(string=html).write_pdf()


def _format_inr(value) -> str:
    """Format a number as INR with commas (Indian numbering)."""
    try:
        num = float(value)
    except (TypeError, ValueError):
        return "0.00"
    if num < 0:
        return f"-{_format_inr(-num)}"
    # Indian format: 1,23,456.78
    integer_part = int(num)
    decimal_part = f"{num:.2f}".split(".")[1]
    s = str(integer_part)
    if len(s) <= 3:
        return f"{s}.{decimal_part}"
    result = s[-3:]
    s = s[:-3]
    while s:
        result = s[-2:] + "," + result
        s = s[:-2]
    return f"{result}.{decimal_part}"


async def generate_quote_pdf(quote_id: UUID, org_id: UUID, db: AsyncSession) -> bytes:
    """Generate a PDF for a quotation."""
    from app.models.quotation import Quotation, QuoteRoom

    result = await db.execute(
        select(Quotation)
        .options(
            selectinload(Quotation.rooms).selectinload(QuoteRoom.items),
            selectinload(Quotation.lead),
        )
        .where(Quotation.id == quote_id)
    )
    quotation = result.scalar_one_or_none()
    if not quotation or quotation.org_id != org_id:
        raise NotFoundException(detail=f"Quotation '{quote_id}' not found")

    # Build context for the template
    lead = quotation.lead
    client_name = lead.name if lead else "—"
    client_contact = ""
    if lead:
        parts = []
        if lead.contact_number:
            parts.append(lead.contact_number)
        if lead.email:
            parts.append(lead.email)
        client_contact = " | ".join(parts)

    client_address = lead.location if lead else ""

    context = {
        "quotation": quotation,
        "company_name": "IntDesign ERP",
        "client_name": client_name,
        "client_contact": client_contact,
        "client_address": client_address or "",
        "format_inr": _format_inr,
    }

    html = _render_html("quote_v1.html", context)
    return _html_to_pdf(html)


async def generate_po_pdf(po_id: UUID, org_id: UUID, db: AsyncSession) -> bytes:
    """Generate a PDF for a purchase order."""
    from app.models.inventory import PurchaseOrder

    result = await db.execute(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .where(PurchaseOrder.id == po_id)
    )
    po = result.scalar_one_or_none()
    if not po or po.org_id != org_id:
        raise NotFoundException(detail=f"Purchase order '{po_id}' not found")

    html = _render_html("po_pdf.html", {"po": po})
    return _html_to_pdf(html)


async def generate_invoice_pdf(invoice_id: UUID, org_id: UUID, db: AsyncSession) -> bytes:
    """Generate a PDF for an invoice."""
    from app.models.invoice import Invoice

    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.items))
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice or invoice.org_id != org_id:
        raise NotFoundException(detail=f"Invoice '{invoice_id}' not found")

    html = _render_html("invoice_pdf.html", {"invoice": invoice})
    return _html_to_pdf(html)


async def generate_work_order_pdf(wo_id: UUID, org_id: UUID, db: AsyncSession) -> bytes:
    """Generate a PDF for a work order."""
    from app.models.work_order import WorkOrder

    result = await db.execute(
        select(WorkOrder)
        .options(selectinload(WorkOrder.ra_bills))
        .where(WorkOrder.id == wo_id)
    )
    wo = result.scalar_one_or_none()
    if not wo or wo.org_id != org_id:
        raise NotFoundException(detail=f"Work order '{wo_id}' not found")

    html = _render_html("work_order_pdf.html", {"wo": wo})
    return _html_to_pdf(html)
