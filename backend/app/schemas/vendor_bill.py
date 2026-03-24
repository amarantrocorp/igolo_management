"""Vendor Bill Pydantic schemas."""

from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, model_validator


class VendorBillCreate(BaseModel):
    vendor_id: UUID
    po_id: Optional[UUID] = None
    bill_number: str
    bill_date: date
    amount: float
    tax_amount: float = 0
    total_amount: float
    notes: Optional[str] = None


class VendorBillUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class VendorBillResponse(BaseModel):
    id: UUID
    vendor_id: UUID
    po_id: Optional[UUID] = None
    bill_number: str
    bill_date: str
    amount: float
    tax_amount: float
    total_amount: float
    status: str
    notes: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _serialise(cls, data):
        if hasattr(data, "__dict__"):
            d = {k: v for k, v in data.__dict__.items() if not k.startswith("_")}
            for f in ("bill_date", "created_at", "updated_at"):
                if d.get(f):
                    d[f] = str(d[f])
            if d.get("status") and hasattr(d["status"], "value"):
                d["status"] = d["status"].value
            return d
        return data
