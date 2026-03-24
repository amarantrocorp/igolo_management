"""Document Pydantic schemas."""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, model_validator


class DocumentCreate(BaseModel):
    name: str
    category: str = "OTHER"
    file_url: str
    version: int = 1
    notes: Optional[str] = None


class DocumentResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    category: str
    file_url: str
    uploaded_by_id: UUID
    version: int
    notes: Optional[str] = None
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
            if d.get("category") and hasattr(d["category"], "value"):
                d["category"] = d["category"].value
            return d
        return data
