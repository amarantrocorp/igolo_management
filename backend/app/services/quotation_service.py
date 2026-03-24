from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.email import send_email_fire_and_forget
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.crm import Lead, LeadStatus
from app.models.notification import NotificationType
from app.models.user import UserRole
from app.models.project import Project
from app.models.quotation import QuoteItem, QuoteRoom, QuoteStatus, Quotation
from app.schemas.quotation import QuotationCreate
from app.services.whatsapp_service import notify_quote_sent


async def create_quotation(
    data: QuotationCreate, user_id: UUID, org_id: UUID, db: AsyncSession
) -> Quotation:
    """Create a new quotation with nested rooms and items.

    For each QuoteItem, the final_price is calculated as:
        final_price = unit_price * quantity * (1 + markup_percentage / 100)

    The quotation total_amount is the sum of all item final_prices across all rooms.
    """
    # Block quote creation for converted leads
    lead_result = await db.execute(select(Lead).where(Lead.id == data.lead_id))
    lead = lead_result.scalar_one_or_none()
    if not lead or lead.org_id != org_id:
        raise NotFoundException(detail="Lead not found")
    if lead.status == LeadStatus.CONVERTED:
        raise BadRequestException(
            detail="Cannot create a quotation for a converted lead. This lead already has an active project."
        )

    # Determine the next version number for this lead
    result = await db.execute(
        select(func.coalesce(func.max(Quotation.version), 0)).where(
            Quotation.lead_id == data.lead_id,
            Quotation.org_id == org_id,
        )
    )
    current_max_version = result.scalar()

    quotation = Quotation(
        lead_id=data.lead_id,
        version=current_max_version + 1,
        status=QuoteStatus.DRAFT,
        notes=data.notes,
        valid_until=data.valid_until,
        created_by_id=user_id,
        total_amount=Decimal("0.00"),
        org_id=org_id,
    )
    db.add(quotation)
    await db.flush()  # Get quotation ID

    total_amount = Decimal("0.00")

    for room_data in data.rooms:
        room = QuoteRoom(
            quotation_id=quotation.id,
            name=room_data.name,
            area_sqft=room_data.area_sqft,
            org_id=org_id,
        )
        db.add(room)
        await db.flush()  # Get room ID

        for item_data in room_data.items:
            # Calculate final price: unit_price * quantity * (1 + markup / 100)
            final_price = (
                item_data.unit_price
                * Decimal(str(item_data.quantity))
                * (
                    Decimal("1")
                    + Decimal(str(item_data.markup_percentage)) / Decimal("100")
                )
            )
            final_price = final_price.quantize(Decimal("0.01"))

            item = QuoteItem(
                room_id=room.id,
                inventory_item_id=item_data.inventory_item_id,
                description=item_data.description,
                quantity=item_data.quantity,
                unit=item_data.unit,
                unit_price=item_data.unit_price,
                markup_percentage=item_data.markup_percentage,
                final_price=final_price,
                org_id=org_id,
            )
            db.add(item)
            total_amount += final_price

    quotation.total_amount = total_amount
    db.add(quotation)
    await db.commit()

    # Reload with relationships
    return await get_quotation(quotation.id, org_id, db)


async def _attach_project_ids(quotations: List[Quotation], db: AsyncSession) -> None:
    """Look up linked project IDs and set them as transient attributes."""
    if not quotations:
        return
    quote_ids = [q.id for q in quotations]
    result = await db.execute(
        select(Project.accepted_quotation_id, Project.id).where(
            Project.accepted_quotation_id.in_(quote_ids)
        )
    )
    mapping = {row[0]: row[1] for row in result.all()}
    for q in quotations:
        q.project_id = mapping.get(q.id)


async def get_quotation(quote_id: UUID, org_id: UUID, db: AsyncSession) -> Quotation:
    """Retrieve a quotation by ID with rooms and items eagerly loaded."""
    result = await db.execute(
        select(Quotation)
        .options(
            selectinload(Quotation.rooms).selectinload(QuoteRoom.items),
            selectinload(Quotation.lead).selectinload(Lead.assigned_to),
        )
        .where(Quotation.id == quote_id)
    )
    quotation = result.scalar_one_or_none()
    if not quotation or quotation.org_id != org_id:
        raise NotFoundException(detail=f"Quotation with id '{quote_id}' not found")
    await _attach_project_ids([quotation], db)
    return quotation


async def get_quotations(
    db: AsyncSession,
    org_id: UUID,
    lead_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[Quotation]:
    """Retrieve a paginated list of quotations, optionally filtered by lead."""
    query = (
        select(Quotation)
        .options(
            selectinload(Quotation.rooms).selectinload(QuoteRoom.items),
            selectinload(Quotation.lead).selectinload(Lead.assigned_to),
        )
        .where(Quotation.org_id == org_id)
    )

    if lead_id:
        query = query.where(Quotation.lead_id == lead_id)

    query = query.order_by(Quotation.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    quotations = list(result.scalars().all())
    await _attach_project_ids(quotations, db)
    return quotations


async def finalize_quotation(
    quote_id: UUID, org_id: UUID, db: AsyncSession
) -> Quotation:
    """Freeze a DRAFT quotation into a finalized, versioned quote.

    Only DRAFT quotations can be finalized. Once finalized, the status becomes SENT
    and the version number is locked.
    """
    quotation = await get_quotation(quote_id, org_id, db)

    if quotation.status != QuoteStatus.DRAFT:
        raise BadRequestException(
            detail=f"Only DRAFT quotations can be finalized. Current status: {quotation.status.value}"
        )

    # Determine the next finalized version for this lead (among non-DRAFT quotes)
    result = await db.execute(
        select(func.coalesce(func.max(Quotation.version), 0)).where(
            Quotation.lead_id == quotation.lead_id,
            Quotation.org_id == org_id,
            Quotation.status != QuoteStatus.DRAFT,
        )
    )
    max_finalized_version = result.scalar()
    quotation.version = max_finalized_version + 1
    quotation.status = QuoteStatus.SENT

    db.add(quotation)
    await db.commit()

    # Re-fetch with all relationships for email data
    quotation = await get_quotation(quote_id, org_id, db)

    # Notify client that quotation is ready -- full quote in email
    if quotation.lead and quotation.lead.email:
        send_email_fire_and_forget(
            subject=f"Your Quotation v{quotation.version} is Ready",
            email_to=quotation.lead.email,
            template_name="quotation_sent.html",
            template_data=_build_quote_email_data(quotation),
        )

    # WhatsApp notification to client (fire-and-forget, errors are logged)
    if quotation.lead and quotation.lead.contact_number:
        quote_link = f"{settings.FRONTEND_URL}/dashboard/sales/quotes/{quotation.id}"
        await notify_quote_sent(
            phone=quotation.lead.contact_number,
            client_name=quotation.lead.name,
            quote_amount=_format_inr(quotation.total_amount),
            quote_link=quote_link,
        )

    return quotation


def _format_inr(value) -> str:
    """Format a number as Indian Rupee string: Rs.1,23,456.00"""
    num = float(value or 0)
    if num < 0:
        return f"-₹{_format_inr_abs(-num)}"
    return f"₹{_format_inr_abs(num)}"


def _format_inr_abs(num: float) -> str:
    """Format positive number in Indian numbering (lakh/crore grouping)."""
    integer_part = int(num)
    decimal_part = f"{num - integer_part:.2f}"[1:]  # ".XX"
    s = str(integer_part)
    if len(s) <= 3:
        return s + decimal_part
    # First group of 3 from right, then groups of 2
    result = s[-3:]
    s = s[:-3]
    while s:
        result = s[-2:] + "," + result
        s = s[:-2]
    return result + decimal_part


def _build_quote_email_data(quotation: Quotation) -> dict:
    """Build template data dict with full room/item breakdown for the email."""
    from datetime import datetime

    lead = quotation.lead
    quote_number = f"QT-{str(quotation.id)[:8].upper()}"

    # Format dates
    created = quotation.created_at
    if isinstance(created, datetime):
        quote_date = created.strftime("%d %B %Y")
    else:
        quote_date = str(created)

    valid_until = None
    if quotation.valid_until:
        if isinstance(quotation.valid_until, datetime):
            valid_until = quotation.valid_until.strftime("%d %B %Y")
        else:
            valid_until = str(quotation.valid_until)

    # Build rooms with formatted items
    rooms_data = []
    global_index = 0
    grand_total = Decimal("0.00")

    for room in quotation.rooms:
        room_total = Decimal("0.00")
        items_data = []
        for item in room.items:
            global_index += 1
            final_price = Decimal(str(item.final_price or 0))
            unit_price = Decimal(str(item.unit_price or 0))
            room_total += final_price
            items_data.append(
                {
                    "index": global_index,
                    "description": item.description or "—",
                    "quantity": float(item.quantity),
                    "unit": item.unit or "nos",
                    "unit_price_fmt": _format_inr(unit_price),
                    "final_price_fmt": _format_inr(final_price),
                }
            )
        grand_total += room_total
        rooms_data.append(
            {
                "name": room.name,
                "area_sqft": float(room.area_sqft) if room.area_sqft else None,
                "line_items": items_data,
                "subtotal_fmt": _format_inr(room_total),
            }
        )

    return {
        "client_name": lead.name if lead else "Client",
        "client_phone": lead.contact_number if lead else None,
        "client_email": lead.email if lead else None,
        "quote_date": quote_date,
        "valid_until": valid_until,
        "quote_number": quote_number,
        "quote_version": quotation.version,
        "rooms": rooms_data,
        "grand_total_fmt": _format_inr(grand_total),
        "notes": quotation.notes,
    }


async def send_quotation_to_client(
    quote_id: UUID, org_id: UUID, db: AsyncSession
) -> Quotation:
    """Send quotation to the client via email with PDF attachment.

    If the quotation is still DRAFT, finalize it first.
    """
    quotation = await get_quotation(quote_id, org_id, db)

    # Auto-finalize if still draft
    if quotation.status == QuoteStatus.DRAFT:
        quotation = await finalize_quotation(quote_id, org_id, db)
    elif quotation.lead and quotation.lead.email:
        # Already finalized — send again
        send_email_fire_and_forget(
            subject=f"Your Quotation v{quotation.version} is Ready",
            email_to=quotation.lead.email,
            template_name="quotation_sent.html",
            template_data=_build_quote_email_data(quotation),
        )

    return quotation


async def update_quotation_status(
    quote_id: UUID, status: QuoteStatus, org_id: UUID, db: AsyncSession
) -> Quotation:
    """Update the status of a quotation (e.g., APPROVED, REJECTED, ARCHIVED)."""
    quotation = await get_quotation(quote_id, org_id, db)
    quotation.status = status
    db.add(quotation)
    await db.commit()
    await db.refresh(quotation)

    # Notify managers when a quotation is approved
    if status == QuoteStatus.APPROVED:
        from app.services.notification_service import notify_role

        lead_name = quotation.lead.name if quotation.lead else "Unknown"
        await notify_role(
            db=db,
            org_id=org_id,
            role=UserRole.MANAGER,
            type=NotificationType.APPROVAL_REQ,
            title=f"Quote Approved: {lead_name}",
            body=f"Quotation v{quotation.version} for {lead_name} has been approved. Ready for project conversion.",
            action_url=f"/dashboard/sales/quotes/{quotation.id}",
            email_template="generic_notification.html",
            email_data={
                "title": f"Quote Approved: {lead_name}",
                "body": f"Quotation v{quotation.version} for {lead_name} has been approved and is ready for project conversion.",
                "action_url": f"/dashboard/sales/quotes/{quotation.id}",
            },
        )

    return quotation
