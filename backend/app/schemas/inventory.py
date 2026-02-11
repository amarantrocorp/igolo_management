from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.inventory import POStatus


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
    created_at: datetime

    model_config = {"from_attributes": True}


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
    quantity: float
    unit_price: Decimal
    total_price: Decimal

    model_config = {"from_attributes": True}


class PurchaseOrderCreate(BaseModel):
    vendor_id: UUID
    is_project_specific: bool = False
    project_id: Optional[UUID] = None
    notes: Optional[str] = None
    items: List[POItemCreate] = []


class PurchaseOrderUpdate(BaseModel):
    status: Optional[POStatus] = None
    notes: Optional[str] = None


class PurchaseOrderResponse(BaseModel):
    id: UUID
    vendor_id: UUID
    status: POStatus
    is_project_specific: bool
    project_id: Optional[UUID]
    total_amount: Decimal
    notes: Optional[str]
    items: List[POItemResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}
