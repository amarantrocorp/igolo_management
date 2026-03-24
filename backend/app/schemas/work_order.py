"""Work Order and RA Bill Pydantic schemas."""

from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, model_validator


class RABillCreate(BaseModel):
    period_from: date
    period_to: date
    quantity_executed: float
    amount: float


class RABillResponse(BaseModel):
    id: UUID
    work_order_id: UUID
    bill_number: int
    period_from: str
    period_to: str
    quantity_executed: float
    amount: float
    cumulative_quantity: float
    cumulative_amount: float
    status: str
    created_at: str

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _serialise(cls, data):
        if hasattr(data, "__dict__"):
            d = {k: v for k, v in data.__dict__.items() if not k.startswith("_")}
            for f in ("period_from", "period_to", "created_at"):
                if d.get(f):
                    d[f] = str(d[f])
            if d.get("status") and hasattr(d["status"], "value"):
                d["status"] = d["status"].value
            return d
        return data


class WorkOrderCreate(BaseModel):
    project_id: UUID
    vendor_id: Optional[UUID] = None
    team_id: Optional[UUID] = None
    description: str
    scope_of_work: Optional[str] = None
    contract_amount: float = 0
    unit_rate: Optional[float] = None
    estimated_quantity: Optional[float] = None
    unit: Optional[str] = None
    linked_sprint_id: Optional[UUID] = None


class WorkOrderUpdate(BaseModel):
    status: Optional[str] = None
    description: Optional[str] = None
    scope_of_work: Optional[str] = None
    contract_amount: Optional[float] = None


class WorkOrderResponse(BaseModel):
    id: UUID
    project_id: UUID
    vendor_id: Optional[UUID] = None
    team_id: Optional[UUID] = None
    wo_number: str
    description: str
    scope_of_work: Optional[str] = None
    contract_amount: float
    unit_rate: Optional[float] = None
    estimated_quantity: Optional[float] = None
    unit: Optional[str] = None
    status: str
    linked_sprint_id: Optional[UUID] = None
    ra_bills: list[RABillResponse] = []
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _serialise(cls, data):
        if hasattr(data, "__dict__"):
            d = {k: v for k, v in data.__dict__.items() if not k.startswith("_")}
            for f in ("created_at", "updated_at"):
                if d.get(f):
                    d[f] = str(d[f])
            if d.get("status") and hasattr(d["status"], "value"):
                d["status"] = d["status"].value
            if hasattr(data, "ra_bills"):
                d["ra_bills"] = list(data.ra_bills)
            return d
        return data
