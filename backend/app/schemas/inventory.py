from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, model_validator

from app.models.inventory import POStatus, StockTransactionType


# ---------------------------------------------------------------------------
# Vendor-Item (junction)
# ---------------------------------------------------------------------------


class VendorItemCreate(BaseModel):
    vendor_id: UUID
    vendor_price: Decimal
    lead_time_days: Optional[int] = None


class VendorItemResponse(BaseModel):
    id: UUID
    vendor_id: UUID
    vendor_name: str = ""
    item_id: UUID
    vendor_price: Decimal
    lead_time_days: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extract_vendor_name(cls, data):  # type: ignore[override]
        if hasattr(data, "vendor") and data.vendor is not None:
            data.vendor_name = data.vendor.name  # type: ignore[attr-defined]
        return data


# ---------------------------------------------------------------------------
# Stock Transaction
# ---------------------------------------------------------------------------


class StockTransactionResponse(BaseModel):
    id: UUID
    item_id: UUID
    quantity: float
    transaction_type: StockTransactionType
    reference_id: Optional[UUID]
    performed_by: UUID
    unit_cost_at_time: Decimal
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Items
# ---------------------------------------------------------------------------


class ItemCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    category: str
    unit: str
    base_price: Decimal
    selling_price: Decimal
    current_stock: float = 0.0
    reorder_level: float = 0.0
    image_url: Optional[str] = None


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    base_price: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    reorder_level: Optional[float] = None
    image_url: Optional[str] = None


class ItemResponse(BaseModel):
    id: UUID
    name: str
    sku: Optional[str]
    category: str
    unit: str
    base_price: Decimal
    selling_price: Decimal
    current_stock: float
    reorder_level: float
    image_url: Optional[str]
    is_low_stock: bool = False
    supplier_count: int = 0
    suppliers: List[VendorItemResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def compute_derived(cls, data):  # type: ignore[override]
        if hasattr(data, "suppliers"):
            suppliers = data.suppliers  # type: ignore[attr-defined]
            if suppliers is not None:
                data.supplier_count = len(suppliers)  # type: ignore[attr-defined]
        return data


class VendorCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None


class VendorResponse(BaseModel):
    id: UUID
    name: str
    contact_person: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    gst_number: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class POItemCreate(BaseModel):
    item_id: UUID
    quantity: float
    unit_price: Decimal


class POItemResponse(BaseModel):
    id: UUID
    item_id: UUID
    item_name: str = ""
    quantity: float
    unit_price: Decimal
    total_price: Decimal

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extract_item_name(cls, data):  # type: ignore[override]
        if hasattr(data, "item") and data.item is not None:
            data.item_name = data.item.name  # type: ignore[attr-defined]
        return data


class PurchaseOrderCreate(BaseModel):
    vendor_id: UUID
    is_project_specific: bool = False
    project_id: Optional[UUID] = None
    notes: Optional[str] = None
    items: List[POItemCreate] = []


class PurchaseOrderUpdate(BaseModel):
    status: Optional[POStatus] = None
    notes: Optional[str] = None
    bill_document_url: Optional[str] = None


class PurchaseOrderResponse(BaseModel):
    id: UUID
    vendor_id: UUID
    vendor_name: str = ""
    status: POStatus
    is_project_specific: bool
    project_id: Optional[UUID]
    total_amount: Decimal
    notes: Optional[str]
    bill_document_url: Optional[str] = None
    items: List[POItemResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extract_vendor_name(cls, data):  # type: ignore[override]
        if hasattr(data, "vendor") and data.vendor is not None:
            data.vendor_name = data.vendor.name  # type: ignore[attr-defined]
        return data


# ---------------------------------------------------------------------------
# Project Materials (aggregated view)
# ---------------------------------------------------------------------------


class StockIssueResponse(BaseModel):
    id: UUID
    item_id: UUID
    item_name: str = ""
    item_category: str = ""
    item_unit: str = ""
    quantity: float
    unit_cost_at_time: Decimal
    total_cost: Decimal = Decimal("0.00")
    performed_by: UUID
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extract_item_details(cls, data):  # type: ignore[override]
        if hasattr(data, "item") and data.item is not None:
            data.item_name = data.item.name
            data.item_category = data.item.category
            data.item_unit = data.item.unit
        qty = abs(data.quantity) if hasattr(data, "quantity") else 0
        cost = data.unit_cost_at_time if hasattr(data, "unit_cost_at_time") else Decimal("0")
        data.total_cost = Decimal(str(qty)) * cost
        return data


class MaterialsSummary(BaseModel):
    total_po_cost: Decimal
    total_stock_issued_cost: Decimal
    total_materials_cost: Decimal


class ProjectMaterialsResponse(BaseModel):
    purchase_orders: List[PurchaseOrderResponse] = []
    stock_issues: List[StockIssueResponse] = []
    summary: MaterialsSummary
