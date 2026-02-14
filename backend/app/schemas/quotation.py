from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.quotation import QuoteStatus
from app.schemas.crm import LeadResponse


class QuoteItemCreate(BaseModel):
    inventory_item_id: Optional[UUID] = None
    description: str
    quantity: float
    unit: str = "nos"
    unit_price: Decimal
    markup_percentage: float = 0.0


class QuoteItemResponse(BaseModel):
    id: UUID
    inventory_item_id: Optional[UUID]
    description: str
    quantity: float
    unit: str
    unit_price: Decimal
    markup_percentage: float
    final_price: Decimal

    model_config = {"from_attributes": True}


class QuoteRoomCreate(BaseModel):
    name: str
    area_sqft: Optional[float] = None
    items: List[QuoteItemCreate] = []


class QuoteRoomResponse(BaseModel):
    id: UUID
    name: str
    area_sqft: Optional[float]
    items: List[QuoteItemResponse] = []

    model_config = {"from_attributes": True}


class QuotationCreate(BaseModel):
    lead_id: UUID
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None
    rooms: List[QuoteRoomCreate] = []


class QuotationUpdate(BaseModel):
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None
    status: Optional[QuoteStatus] = None


class QuotationResponse(BaseModel):
    id: UUID
    lead_id: UUID
    lead: Optional["LeadResponse"] = None
    version: int
    total_amount: Decimal
    status: QuoteStatus
    valid_until: Optional[datetime]
    notes: Optional[str]
    created_by_id: UUID
    project_id: Optional[UUID] = None
    rooms: List[QuoteRoomResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
