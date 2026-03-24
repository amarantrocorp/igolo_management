"""Asset Pydantic schemas."""

from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, model_validator


class AssetCreate(BaseModel):
    name: str
    category: str
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_cost: Optional[float] = None
    condition: str = "GOOD"
    notes: Optional[str] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    condition: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AssetResponse(BaseModel):
    id: UUID
    name: str
    category: str
    serial_number: Optional[str] = None
    purchase_date: Optional[str] = None
    purchase_cost: Optional[float] = None
    condition: str
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
            for f in ("purchase_date", "created_at", "updated_at"):
                if d.get(f):
                    d[f] = str(d[f])
            for f in ("condition", "status"):
                if d.get(f) and hasattr(d[f], "value"):
                    d[f] = d[f].value
            return d
        return data


class AssetAssign(BaseModel):
    project_id: UUID
    assigned_date: date


class AssetReturn(BaseModel):
    condition_on_return: str


class AssetUsageLogResponse(BaseModel):
    id: UUID
    asset_id: UUID
    project_id: UUID
    assigned_date: str
    returned_date: Optional[str] = None
    condition_on_return: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _serialise(cls, data):
        if hasattr(data, "__dict__"):
            d = {k: v for k, v in data.__dict__.items() if not k.startswith("_")}
            for f in ("assigned_date", "returned_date", "created_at"):
                if d.get(f):
                    d[f] = str(d[f])
            if d.get("condition_on_return") and hasattr(d["condition_on_return"], "value"):
                d["condition_on_return"] = d["condition_on_return"].value
            return d
        return data
