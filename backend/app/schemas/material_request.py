from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, model_validator

from app.models.material_request import MaterialRequestStatus


# ---------------------------------------------------------------------------
# Material Request Item
# ---------------------------------------------------------------------------


class MaterialRequestItemCreate(BaseModel):
    item_id: UUID
    quantity_requested: float
    notes: Optional[str] = None


class MaterialRequestItemApproval(BaseModel):
    item_id: UUID
    quantity_approved: float


class MaterialRequestItemResponse(BaseModel):
    id: UUID
    material_request_id: UUID
    item_id: UUID
    item_name: str = ""
    item_unit: str = ""
    current_stock: float = 0.0
    quantity_requested: float
    quantity_approved: Optional[float]
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extract_item_details(cls, data):  # type: ignore[override]
        if hasattr(data, "item") and data.item is not None:
            data.item_name = data.item.name
            data.item_unit = data.item.unit
            data.current_stock = data.item.current_stock
        return data


# ---------------------------------------------------------------------------
# Material Request
# ---------------------------------------------------------------------------


class MaterialRequestCreate(BaseModel):
    project_id: UUID
    sprint_id: Optional[UUID] = None
    notes: Optional[str] = None
    urgency: str = "NORMAL"
    items: List[MaterialRequestItemCreate]


class MaterialRequestApproval(BaseModel):
    items: List[MaterialRequestItemApproval]
    notes: Optional[str] = None


class MaterialRequestResponse(BaseModel):
    id: UUID
    project_id: UUID
    project_name: str = ""
    sprint_id: Optional[UUID]
    requested_by_id: UUID
    requested_by_name: str = ""
    status: MaterialRequestStatus
    urgency: str
    notes: Optional[str]
    approved_by_id: Optional[UUID]
    approved_at: Optional[datetime]
    items: List[MaterialRequestItemResponse] = []
    items_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extract_names(cls, data):  # type: ignore[override]
        if hasattr(data, "requested_by") and data.requested_by is not None:
            data.requested_by_name = data.requested_by.full_name
        if hasattr(data, "project") and data.project is not None:
            data.project_name = data.project.name
        if hasattr(data, "items") and data.items is not None:
            data.items_count = len(data.items)
        return data
