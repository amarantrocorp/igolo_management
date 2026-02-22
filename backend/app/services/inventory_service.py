from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.finance import (
    ProjectWallet,
    Transaction,
    TransactionCategory,
    TransactionSource,
    TransactionStatus,
)
from app.models.inventory import (
    Item,
    POItem,
    POStatus,
    PurchaseOrder,
    StockTransaction,
    StockTransactionType,
    Vendor,
    VendorItem,
)
from app.schemas.inventory import (
    ItemCreate,
    ItemUpdate,
    PurchaseOrderCreate,
    VendorCreate,
    VendorItemCreate,
    VendorUpdate,
)

# ---------------------------------------------------------------------------
# Item Management
# ---------------------------------------------------------------------------


async def create_item(data: ItemCreate, db: AsyncSession) -> Item:
    """Create a new inventory item."""
    item = Item(
        name=data.name,
        sku=data.sku,
        category=data.category,
        unit=data.unit,
        base_price=data.base_price,
        selling_price=data.selling_price,
        current_stock=data.current_stock,
        reorder_level=data.reorder_level,
        image_url=data.image_url,
    )
    db.add(item)
    await db.commit()
    # Re-fetch with suppliers eagerly loaded to avoid MissingGreenlet
    return await get_item(item.id, db)


async def get_items(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    category: Optional[str] = None,
    low_stock_only: bool = False,
    search: Optional[str] = None,
) -> List[Item]:
    """Retrieve a paginated list of inventory items.

    Supports filtering by category, showing only low-stock items
    (where current_stock < reorder_level), and text search on name.
    """
    query = select(Item).options(
        selectinload(Item.suppliers).selectinload(VendorItem.vendor)
    )

    if category:
        query = query.where(Item.category == category)
    if low_stock_only:
        query = query.where(Item.current_stock < Item.reorder_level)
    if search:
        query = query.where(Item.name.ilike(f"%{search}%"))

    query = query.order_by(Item.name).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_item(item_id: UUID, db: AsyncSession) -> Item:
    """Retrieve a single inventory item by ID with suppliers and stock history."""
    result = await db.execute(
        select(Item)
        .options(
            selectinload(Item.suppliers).selectinload(VendorItem.vendor),
            selectinload(Item.stock_transactions),
        )
        .where(Item.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundException(detail=f"Item with id '{item_id}' not found")
    return item


async def update_item(item_id: UUID, data: ItemUpdate, db: AsyncSession) -> Item:
    """Update inventory item fields. Only non-None fields are applied."""
    result = await db.execute(select(Item).where(Item.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundException(detail=f"Item with id '{item_id}' not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.add(item)
    await db.commit()
    # Re-fetch with suppliers eagerly loaded to avoid MissingGreenlet
    return await get_item(item_id, db)


# ---------------------------------------------------------------------------
# Vendor Management
# ---------------------------------------------------------------------------


async def create_vendor(data: VendorCreate, db: AsyncSession) -> Vendor:
    """Create a new vendor record."""
    vendor = Vendor(
        name=data.name,
        contact_person=data.contact_person,
        phone=data.phone,
        email=data.email,
        address=data.address,
        gst_number=data.gst_number,
    )
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)
    return vendor


async def get_vendors(db: AsyncSession, skip: int = 0, limit: int = 50) -> List[Vendor]:
    """Retrieve a paginated list of vendors."""
    result = await db.execute(
        select(Vendor).order_by(Vendor.name).offset(skip).limit(limit)
    )
    return list(result.scalars().all())


async def get_vendor(vendor_id: UUID, db: AsyncSession) -> Vendor:
    """Retrieve a single vendor by ID."""
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise NotFoundException(detail=f"Vendor with id '{vendor_id}' not found")
    return vendor


async def update_vendor(
    vendor_id: UUID, data: VendorUpdate, db: AsyncSession
) -> Vendor:
    """Update vendor fields. Only non-None fields are applied."""
    vendor = await get_vendor(vendor_id, db)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vendor, field, value)
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)
    return vendor


# ---------------------------------------------------------------------------
# Purchase Order Management
# ---------------------------------------------------------------------------


async def create_purchase_order(
    data: PurchaseOrderCreate, user_id: UUID, db: AsyncSession
) -> PurchaseOrder:
    """Create a new purchase order.

    If is_project_specific is True, a project_id must be provided.
    Calculates total_price for each PO item and the overall PO total_amount.
    """
    # Validate: project_id is required if project-specific
    if data.is_project_specific and not data.project_id:
        raise BadRequestException(
            detail="project_id is required for project-specific purchase orders"
        )

    po = PurchaseOrder(
        vendor_id=data.vendor_id,
        status=POStatus.DRAFT,
        is_project_specific=data.is_project_specific,
        project_id=data.project_id,
        notes=data.notes,
        created_by_id=user_id,
        total_amount=Decimal("0.00"),
    )
    db.add(po)
    await db.flush()  # Get PO ID

    total_amount = Decimal("0.00")

    for item_data in data.items:
        total_price = item_data.unit_price * Decimal(str(item_data.quantity))
        total_price = total_price.quantize(Decimal("0.01"))

        po_item = POItem(
            purchase_order_id=po.id,
            item_id=item_data.item_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            total_price=total_price,
        )
        db.add(po_item)
        total_amount += total_price

    po.total_amount = total_amount
    db.add(po)
    await db.commit()

    # Reload with items
    return await _get_purchase_order(po.id, db)


async def _get_purchase_order(po_id: UUID, db: AsyncSession) -> PurchaseOrder:
    """Internal helper to fetch a PO with its items and vendor loaded."""
    result = await db.execute(
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.vendor),
            selectinload(PurchaseOrder.items).selectinload(POItem.item),
        )
        .where(PurchaseOrder.id == po_id)
    )
    po = result.scalar_one_or_none()
    if not po:
        raise NotFoundException(detail=f"Purchase Order with id '{po_id}' not found")
    return po


async def get_purchase_orders(
    db: AsyncSession,
    vendor_id: Optional[UUID] = None,
    project_id: Optional[UUID] = None,
    status_filter: Optional[POStatus] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[PurchaseOrder]:
    """Retrieve a paginated list of purchase orders with optional filters."""
    query = select(PurchaseOrder).options(
        selectinload(PurchaseOrder.vendor),
        selectinload(PurchaseOrder.items).selectinload(POItem.item),
    )
    if vendor_id:
        query = query.where(PurchaseOrder.vendor_id == vendor_id)
    if project_id:
        query = query.where(PurchaseOrder.project_id == project_id)
    if status_filter:
        query = query.where(PurchaseOrder.status == status_filter)
    query = query.order_by(PurchaseOrder.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def receive_purchase_order(
    po_id: UUID, user_id: UUID, db: AsyncSession
) -> PurchaseOrder:
    """Process a purchase order as received (GRN - Goods Received Note).

    - If General (not project-specific):
        Increment Item.current_stock for each PO item.
        Create a StockTransaction(PURCHASE_IN) for each item.
    - If Project-Specific:
        Do NOT touch Item.current_stock.
        Create an OUTFLOW Transaction on the project wallet.
    """
    po = await _get_purchase_order(po_id, db)

    if po.status == POStatus.RECEIVED:
        raise BadRequestException(detail="Purchase Order has already been received")
    if po.status == POStatus.CANCELLED:
        raise BadRequestException(detail="Cannot receive a cancelled Purchase Order")

    po.status = POStatus.RECEIVED

    if not po.is_project_specific:
        # General stock: increment warehouse counts
        for po_item in po.items:
            # Fetch the inventory item
            item_result = await db.execute(
                select(Item).where(Item.id == po_item.item_id)
            )
            item = item_result.scalar_one_or_none()
            if item:
                item.current_stock += po_item.quantity
                db.add(item)

                # Create stock transaction log
                stock_txn = StockTransaction(
                    item_id=item.id,
                    quantity=po_item.quantity,
                    transaction_type=StockTransactionType.PURCHASE_IN,
                    reference_id=po.id,
                    performed_by=user_id,
                    unit_cost_at_time=po_item.unit_price,
                )
                db.add(stock_txn)
    else:
        # Project-specific: create expense transaction on project wallet
        if po.project_id:
            # Authorize the expense from the project wallet
            from app.services.finance_service import authorize_expense

            await authorize_expense(po.project_id, po.total_amount, db)

            transaction = Transaction(
                project_id=po.project_id,
                category=TransactionCategory.OUTFLOW,
                source=TransactionSource.VENDOR,
                amount=po.total_amount,
                description=f"Purchase Order #{po.id} - Project-specific material delivery",
                related_po_id=po.id,
                recorded_by_id=user_id,
                status=TransactionStatus.CLEARED,
            )
            db.add(transaction)

            # Update wallet
            wallet_result = await db.execute(
                select(ProjectWallet).where(ProjectWallet.project_id == po.project_id)
            )
            wallet = wallet_result.scalar_one_or_none()
            if wallet:
                wallet.total_spent += po.total_amount
                db.add(wallet)

    db.add(po)
    await db.commit()
    # Re-fetch with relationships eagerly loaded to avoid MissingGreenlet
    return await _get_purchase_order(po.id, db)


async def issue_stock_to_project(
    item_id: UUID,
    quantity: float,
    project_id: UUID,
    user_id: UUID,
    db: AsyncSession,
) -> StockTransaction:
    """Issue general warehouse stock to a specific project.

    Deducts from Item.current_stock and creates a StockTransaction(PROJECT_ISSUE).
    """
    # Fetch the inventory item
    result = await db.execute(select(Item).where(Item.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundException(detail=f"Item with id '{item_id}' not found")

    if item.current_stock < quantity:
        raise BadRequestException(
            detail=f"Insufficient stock. Available: {item.current_stock}, Requested: {quantity}"
        )

    # Deduct stock
    item.current_stock -= quantity
    db.add(item)

    # Create stock transaction log (negative quantity for deduction)
    stock_txn = StockTransaction(
        item_id=item.id,
        quantity=-quantity,
        transaction_type=StockTransactionType.PROJECT_ISSUE,
        reference_id=project_id,
        performed_by=user_id,
        unit_cost_at_time=item.base_price,
    )
    db.add(stock_txn)
    await db.commit()
    await db.refresh(stock_txn)
    return stock_txn


# ---------------------------------------------------------------------------
# Vendor-Item (Supplier) Management
# ---------------------------------------------------------------------------


async def add_vendor_to_item(
    item_id: UUID, data: VendorItemCreate, db: AsyncSession
) -> VendorItem:
    """Link a vendor as a supplier for an inventory item."""
    # Validate item exists
    item_result = await db.execute(select(Item).where(Item.id == item_id))
    if not item_result.scalar_one_or_none():
        raise NotFoundException(detail=f"Item with id '{item_id}' not found")

    # Validate vendor exists
    vendor_result = await db.execute(select(Vendor).where(Vendor.id == data.vendor_id))
    if not vendor_result.scalar_one_or_none():
        raise NotFoundException(detail=f"Vendor with id '{data.vendor_id}' not found")

    # Check for duplicate
    dup_result = await db.execute(
        select(VendorItem).where(
            VendorItem.item_id == item_id,
            VendorItem.vendor_id == data.vendor_id,
        )
    )
    if dup_result.scalar_one_or_none():
        raise BadRequestException(detail="This vendor is already linked to this item")

    vendor_item = VendorItem(
        item_id=item_id,
        vendor_id=data.vendor_id,
        vendor_price=data.vendor_price,
        lead_time_days=data.lead_time_days,
    )
    db.add(vendor_item)
    await db.commit()

    # Re-fetch with vendor eagerly loaded
    result = await db.execute(
        select(VendorItem)
        .options(selectinload(VendorItem.vendor))
        .where(VendorItem.id == vendor_item.id)
    )
    return result.scalar_one()


async def remove_vendor_from_item(
    item_id: UUID, vendor_item_id: UUID, db: AsyncSession
) -> None:
    """Unlink a vendor from an inventory item."""
    result = await db.execute(
        select(VendorItem).where(
            VendorItem.id == vendor_item_id,
            VendorItem.item_id == item_id,
        )
    )
    vendor_item = result.scalar_one_or_none()
    if not vendor_item:
        raise NotFoundException(detail="Vendor-item link not found")

    await db.delete(vendor_item)
    await db.commit()


async def get_item_suppliers(
    item_id: UUID, db: AsyncSession
) -> List[VendorItem]:
    """List all vendors that supply a given item."""
    result = await db.execute(
        select(VendorItem)
        .options(selectinload(VendorItem.vendor))
        .where(VendorItem.item_id == item_id)
        .order_by(VendorItem.vendor_price)
    )
    return list(result.scalars().all())


async def get_item_stock_transactions(
    item_id: UUID, db: AsyncSession, limit: int = 20
) -> List[StockTransaction]:
    """Get recent stock transactions for a given item."""
    result = await db.execute(
        select(StockTransaction)
        .where(StockTransaction.item_id == item_id)
        .order_by(StockTransaction.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
