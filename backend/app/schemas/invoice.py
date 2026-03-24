"""Invoice Pydantic schemas."""

from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, model_validator


class InvoiceItemCreate(BaseModel):
    description: str
    quantity: float = 1
    rate: float
    amount: Optional[float] = None
    linked_sprint_id: Optional[UUID] = None
    hsn_code: Optional[str] = None


class InvoiceItemResponse(BaseModel):
    id: UUID
    invoice_id: UUID
    description: str
    quantity: float
    rate: float
    amount: float
    linked_sprint_id: Optional[UUID] = None
    hsn_code: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _serialise(cls, data):
        if hasattr(data, "__dict__"):
            d = {k: v for k, v in data.__dict__.items() if not k.startswith("_")}
            if d.get("created_at"):
                d["created_at"] = str(d["created_at"])
            return d
        return data


class InvoiceCreate(BaseModel):
    project_id: UUID
    issue_date: date
    due_date: date
    tax_percent: float = 18.0
    notes: Optional[str] = None
    items: list[InvoiceItemCreate]


class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    tax_percent: Optional[float] = None
    notes: Optional[str] = None


class InvoiceResponse(BaseModel):
    id: UUID
    project_id: UUID
    invoice_number: str
    status: str
    issue_date: str
    due_date: str
    subtotal: float
    tax_percent: float
    tax_amount: float
    total_amount: float
    notes: Optional[str] = None
    items: list[InvoiceItemResponse] = []
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _serialise(cls, data):
        if hasattr(data, "__dict__"):
            d = {k: v for k, v in data.__dict__.items() if not k.startswith("_")}
            for f in ("issue_date", "due_date", "created_at", "updated_at"):
                if d.get(f):
                    d[f] = str(d[f])
            if hasattr(data, "items"):
                d["items"] = list(data.items)
            return d
        return data
