"""Approval Pydantic schemas."""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, model_validator


class ApprovalRuleCreate(BaseModel):
    entity_type: str
    min_amount: float = 0
    max_amount: Optional[float] = None
    required_roles: list[str]


class ApprovalRuleResponse(BaseModel):
    id: UUID
    entity_type: str
    min_amount: float
    max_amount: Optional[float] = None
    required_roles: list[str]
    created_at: str

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _serialise(cls, data):
        if hasattr(data, "__dict__"):
            d = {k: v for k, v in data.__dict__.items() if not k.startswith("_")}
            if d.get("created_at"):
                d["created_at"] = str(d["created_at"])
            if d.get("entity_type") and hasattr(d["entity_type"], "value"):
                d["entity_type"] = d["entity_type"].value
            return d
        return data


class ApprovalAction(BaseModel):
    status: str  # APPROVED or REJECTED
    comments: Optional[str] = None


class ApprovalLogResponse(BaseModel):
    id: UUID
    entity_type: str
    entity_id: UUID
    level: int
    required_role: str
    approver_id: Optional[UUID] = None
    approver_name: Optional[str] = None
    status: str
    comments: Optional[str] = None
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
            for f in ("entity_type", "status"):
                if d.get(f) and hasattr(d[f], "value"):
                    d[f] = d[f].value
            return d
        return data


class PendingApprovalItem(BaseModel):
    entity_type: str
    entity_id: UUID
    level: int
    required_role: str
    approval_log_id: UUID
    created_at: str
