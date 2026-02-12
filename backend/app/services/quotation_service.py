from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.crm import Lead, LeadStatus
from app.models.project import Project
from app.models.quotation import QuoteItem, QuoteRoom, QuoteStatus, Quotation
from app.schemas.quotation import QuotationCreate


async def create_quotation(
    data: QuotationCreate, user_id: UUID, db: AsyncSession
) -> Quotation:
    """Create a new quotation with nested rooms and items.

    For each QuoteItem, the final_price is calculated as:
        final_price = unit_price * quantity * (1 + markup_percentage / 100)

    The quotation total_amount is the sum of all item final_prices across all rooms.
    """
    # Block quote creation for converted leads
    lead_result = await db.execute(
        select(Lead).where(Lead.id == data.lead_id)
    )
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise NotFoundException(detail="Lead not found")
    if lead.status == LeadStatus.CONVERTED:
        raise BadRequestException(
            detail="Cannot create a quotation for a converted lead. This lead already has an active project."
        )

    # Determine the next version number for this lead
    result = await db.execute(
        select(func.coalesce(func.max(Quotation.version), 0)).where(
            Quotation.lead_id == data.lead_id
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
    )
    db.add(quotation)
    await db.flush()  # Get quotation ID

    total_amount = Decimal("0.00")

    for room_data in data.rooms:
        room = QuoteRoom(
            quotation_id=quotation.id,
            name=room_data.name,
            area_sqft=room_data.area_sqft,
        )
        db.add(room)
        await db.flush()  # Get room ID

        for item_data in room_data.items:
            # Calculate final price: unit_price * quantity * (1 + markup / 100)
            final_price = (
                item_data.unit_price
                * Decimal(str(item_data.quantity))
                * (Decimal("1") + Decimal(str(item_data.markup_percentage)) / Decimal("100"))
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
            )
            db.add(item)
            total_amount += final_price

    quotation.total_amount = total_amount
    db.add(quotation)
    await db.commit()

    # Reload with relationships
    return await get_quotation(quotation.id, db)


async def _attach_project_ids(
    quotations: List[Quotation], db: AsyncSession
) -> None:
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


async def get_quotation(quote_id: UUID, db: AsyncSession) -> Quotation:
    """Retrieve a quotation by ID with rooms and items eagerly loaded."""
    result = await db.execute(
        select(Quotation)
        .options(
            selectinload(Quotation.rooms).selectinload(QuoteRoom.items),
            selectinload(Quotation.lead),
        )
        .where(Quotation.id == quote_id)
    )
    quotation = result.scalar_one_or_none()
    if not quotation:
        raise NotFoundException(detail=f"Quotation with id '{quote_id}' not found")
    await _attach_project_ids([quotation], db)
    return quotation


async def get_quotations(
    db: AsyncSession,
    lead_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[Quotation]:
    """Retrieve a paginated list of quotations, optionally filtered by lead."""
    query = select(Quotation).options(
        selectinload(Quotation.rooms).selectinload(QuoteRoom.items),
        selectinload(Quotation.lead),
    )

    if lead_id:
        query = query.where(Quotation.lead_id == lead_id)

    query = query.order_by(Quotation.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    quotations = list(result.scalars().all())
    await _attach_project_ids(quotations, db)
    return quotations


async def finalize_quotation(quote_id: UUID, db: AsyncSession) -> Quotation:
    """Freeze a DRAFT quotation into a finalized, versioned quote.

    Only DRAFT quotations can be finalized. Once finalized, the status becomes SENT
    and the version number is locked.
    """
    quotation = await get_quotation(quote_id, db)

    if quotation.status != QuoteStatus.DRAFT:
        raise BadRequestException(
            detail=f"Only DRAFT quotations can be finalized. Current status: {quotation.status.value}"
        )

    # Determine the next finalized version for this lead (among non-DRAFT quotes)
    result = await db.execute(
        select(func.coalesce(func.max(Quotation.version), 0)).where(
            Quotation.lead_id == quotation.lead_id,
            Quotation.status != QuoteStatus.DRAFT,
        )
    )
    max_finalized_version = result.scalar()
    quotation.version = max_finalized_version + 1
    quotation.status = QuoteStatus.SENT

    db.add(quotation)
    await db.commit()
    await db.refresh(quotation)
    return quotation


async def update_quotation_status(
    quote_id: UUID, status: QuoteStatus, db: AsyncSession
) -> Quotation:
    """Update the status of a quotation (e.g., APPROVED, REJECTED, ARCHIVED)."""
    quotation = await get_quotation(quote_id, db)
    quotation.status = status
    db.add(quotation)
    await db.commit()
    await db.refresh(quotation)
    return quotation
