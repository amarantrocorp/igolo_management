from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, role_required
from app.db.session import get_db
from app.models.user import User
from app.models.inventory import POStatus
from app.schemas.inventory import (
    ItemCreate,
    ItemResponse,
    ItemUpdate,
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    StockTransactionResponse,
    VendorCreate,
    VendorItemCreate,
    VendorItemResponse,
    VendorResponse,
    VendorUpdate,
)
from app.services import inventory_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Items CRUD
# ---------------------------------------------------------------------------


@router.post("/items", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    payload: ItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Create a new inventory item."""
    item = await inventory_service.create_item(data=payload, db=db)
    return item


@router.get("/items", response_model=list[ItemResponse], status_code=status.HTTP_200_OK)
async def list_items(
    category: Optional[str] = Query(None),
    low_stock: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List inventory items with optional filters for category, low stock, and search."""
    items = await inventory_service.get_items(
        db=db,
        skip=skip,
        limit=limit,
        category=category,
        low_stock_only=low_stock or False,
        search=search,
    )
    return items


@router.get(
    "/items/{item_id}", response_model=ItemResponse, status_code=status.HTTP_200_OK
)
async def get_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single inventory item by ID."""
    item = await inventory_service.get_item(item_id=item_id, db=db)
    return item


@router.put(
    "/items/{item_id}", response_model=ItemResponse, status_code=status.HTTP_200_OK
)
async def update_item(
    item_id: UUID,
    payload: ItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Update an existing inventory item."""
    item = await inventory_service.update_item(item_id=item_id, data=payload, db=db)
    return item


# ---------------------------------------------------------------------------
# Vendors CRUD
# ---------------------------------------------------------------------------


@router.post(
    "/vendors", response_model=VendorResponse, status_code=status.HTTP_201_CREATED
)
async def create_vendor(
    payload: VendorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Create a new vendor."""
    vendor = await inventory_service.create_vendor(data=payload, db=db)
    return vendor


@router.get(
    "/vendors", response_model=list[VendorResponse], status_code=status.HTTP_200_OK
)
async def list_vendors(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List vendors."""
    vendors = await inventory_service.get_vendors(db=db, skip=skip, limit=limit)
    return vendors


@router.get(
    "/vendors/{vendor_id}",
    response_model=VendorResponse,
    status_code=status.HTTP_200_OK,
)
async def get_vendor(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single vendor by ID."""
    vendor = await inventory_service.get_vendor(vendor_id=vendor_id, db=db)
    return vendor


@router.put(
    "/vendors/{vendor_id}",
    response_model=VendorResponse,
    status_code=status.HTTP_200_OK,
)
async def update_vendor(
    vendor_id: UUID,
    payload: VendorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Update an existing vendor."""
    vendor = await inventory_service.update_vendor(
        vendor_id=vendor_id, data=payload, db=db
    )
    return vendor


# ---------------------------------------------------------------------------
# Purchase Orders
# ---------------------------------------------------------------------------


@router.post(
    "/purchase-orders",
    response_model=PurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Create a new Purchase Order (PO). If is_project_specific is True,
    a project_id must be provided."""
    po = await inventory_service.create_purchase_order(
        data=payload, user_id=current_user.id, db=db
    )
    return po


@router.get(
    "/purchase-orders",
    response_model=list[PurchaseOrderResponse],
    status_code=status.HTTP_200_OK,
)
async def list_purchase_orders(
    vendor_id: Optional[UUID] = Query(None),
    project_id: Optional[UUID] = Query(None),
    po_status: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List Purchase Orders with optional vendor, project, and status filters."""
    status_filter = None
    if po_status:
        try:
            status_filter = POStatus(po_status)
        except ValueError:
            pass

    orders = await inventory_service.get_purchase_orders(
        db=db,
        vendor_id=vendor_id,
        project_id=project_id,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )
    return orders


@router.post(
    "/purchase-orders/{po_id}/receive",
    response_model=PurchaseOrderResponse,
    status_code=status.HTTP_200_OK,
)
async def receive_purchase_order(
    po_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Mark a PO as received (GRN). For general stock, increases Item.current_stock
    and creates StockTransaction entries. For project-specific POs, creates an expense
    record against the project wallet without touching general stock."""
    po = await inventory_service.receive_purchase_order(
        po_id=po_id, user_id=current_user.id, db=db
    )
    return po


# ---------------------------------------------------------------------------
# Stock Issue
# ---------------------------------------------------------------------------


class StockIssuePayload(BaseModel):
    project_id: UUID
    quantity: float


@router.post(
    "/items/{item_id}/issue",
    response_model=ItemResponse,
    status_code=status.HTTP_200_OK,
)
async def issue_stock_to_project(
    item_id: UUID,
    payload: StockIssuePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        role_required(["MANAGER", "SUPERVISOR", "SUPER_ADMIN"])
    ),
):
    """Issue general stock to a specific project. Deducts from Item.current_stock
    and creates a StockTransaction record."""
    await inventory_service.issue_stock_to_project(
        item_id=item_id,
        quantity=payload.quantity,
        project_id=payload.project_id,
        user_id=current_user.id,
        db=db,
    )
    # Return the updated item
    item = await inventory_service.get_item(item_id=item_id, db=db)
    return item


# ---------------------------------------------------------------------------
# Item Suppliers (VendorItem)
# ---------------------------------------------------------------------------


@router.post(
    "/items/{item_id}/suppliers",
    response_model=VendorItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_supplier_to_item(
    item_id: UUID,
    payload: VendorItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Link a vendor as a supplier for an inventory item."""
    vendor_item = await inventory_service.add_vendor_to_item(
        item_id=item_id, data=payload, db=db
    )
    return vendor_item


@router.get(
    "/items/{item_id}/suppliers",
    response_model=list[VendorItemResponse],
    status_code=status.HTTP_200_OK,
)
async def list_item_suppliers(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all vendors that supply a given item."""
    return await inventory_service.get_item_suppliers(item_id=item_id, db=db)


@router.delete(
    "/items/{item_id}/suppliers/{vendor_item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_supplier_from_item(
    item_id: UUID,
    vendor_item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Remove a vendor-item link."""
    await inventory_service.remove_vendor_from_item(
        item_id=item_id, vendor_item_id=vendor_item_id, db=db
    )


# ---------------------------------------------------------------------------
# Stock History
# ---------------------------------------------------------------------------


@router.get(
    "/items/{item_id}/stock-history",
    response_model=list[StockTransactionResponse],
    status_code=status.HTTP_200_OK,
)
async def get_item_stock_history(
    item_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recent stock transactions for an inventory item."""
    return await inventory_service.get_item_stock_transactions(
        item_id=item_id, db=db, limit=limit
    )
