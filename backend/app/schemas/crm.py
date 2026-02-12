from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.crm import (
    LeadStatus,
    PropertyStatus,
    PropertyType,
    SiteVisitAvailability,
)
from app.schemas.user import UserBrief


class LeadCreate(BaseModel):
    # Contact
    name: str
    contact_number: str
    email: Optional[str] = None
    source: str
    location: Optional[str] = None
    notes: Optional[str] = None
    assigned_to_id: Optional[UUID] = None

    # Project Details
    property_type: Optional[PropertyType] = None
    property_status: Optional[PropertyStatus] = None
    carpet_area: Optional[float] = None
    scope_of_work: Optional[List[str]] = None
    floor_plan_url: Optional[str] = None

    # Preferences
    budget_range: Optional[str] = None
    design_style: Optional[str] = None
    possession_date: Optional[date] = None
    site_visit_availability: Optional[SiteVisitAvailability] = None


class LeadUpdate(BaseModel):
    # Contact
    name: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    source: Optional[str] = None
    status: Optional[LeadStatus] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    assigned_to_id: Optional[UUID] = None

    # Project Details
    property_type: Optional[PropertyType] = None
    property_status: Optional[PropertyStatus] = None
    carpet_area: Optional[float] = None
    scope_of_work: Optional[List[str]] = None
    floor_plan_url: Optional[str] = None

    # Preferences
    budget_range: Optional[str] = None
    design_style: Optional[str] = None
    possession_date: Optional[date] = None
    site_visit_availability: Optional[SiteVisitAvailability] = None


class LeadResponse(BaseModel):
    id: UUID
    name: str
    contact_number: str
    email: Optional[str]
    source: str
    status: LeadStatus
    location: Optional[str]
    notes: Optional[str]

    # Project Details
    property_type: Optional[PropertyType] = None
    property_status: Optional[PropertyStatus] = None
    carpet_area: Optional[float] = None
    scope_of_work: Optional[List[str]] = None
    floor_plan_url: Optional[str] = None

    # Preferences
    budget_range: Optional[str] = None
    design_style: Optional[str] = None
    possession_date: Optional[date] = None
    site_visit_availability: Optional[SiteVisitAvailability] = None

    assigned_to_id: UUID
    assigned_to: Optional[UserBrief] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LeadBrief(BaseModel):
    id: UUID
    name: str
    contact_number: str
    status: LeadStatus

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
    user: Optional[UserBrief] = None
    lead: Optional[LeadBrief] = None
    created_at: datetime

    model_config = {"from_attributes": True}
