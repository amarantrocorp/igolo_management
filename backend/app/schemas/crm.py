from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.crm import LeadStatus
from app.schemas.user import UserBrief


class LeadCreate(BaseModel):
    name: str
    contact_number: str
    email: Optional[str] = None
    source: str
    location: Optional[str] = None
    budget_range: Optional[str] = None
    notes: Optional[str] = None
    assigned_to_id: Optional[UUID] = None


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    source: Optional[str] = None
    status: Optional[LeadStatus] = None
    location: Optional[str] = None
    budget_range: Optional[str] = None
    notes: Optional[str] = None
    assigned_to_id: Optional[UUID] = None


class LeadResponse(BaseModel):
    id: UUID
    name: str
    contact_number: str
    email: Optional[str]
    source: str
    status: LeadStatus
    location: Optional[str]
    budget_range: Optional[str]
    notes: Optional[str]
    assigned_to_id: UUID
    assigned_to: Optional[UserBrief] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClientCreate(BaseModel):
    lead_id: UUID
    address: Optional[str] = None
    gst_number: Optional[str] = None


class ClientResponse(BaseModel):
    id: UUID
    user_id: UUID
    lead_id: UUID
    address: Optional[str]
    gst_number: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
