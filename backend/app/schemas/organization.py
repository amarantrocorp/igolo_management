from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.organization import PlanTier
from app.models.user import UserRole


class OrganizationCreate(BaseModel):
    name: str
    slug: str
    logo_url: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    plan_tier: PlanTier = PlanTier.FREE


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    is_active: Optional[bool] = None
    plan_tier: Optional[PlanTier] = None


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    logo_url: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    is_active: bool
    plan_tier: PlanTier
    created_at: datetime

    model_config = {"from_attributes": True}


class OrgMembershipCreate(BaseModel):
    user_id: UUID
    role: UserRole
    is_default: bool = False


class OrgMembershipResponse(BaseModel):
    id: UUID
    org_id: UUID
    organization: OrganizationResponse
    role: UserRole
    is_default: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class OrgSwitchRequest(BaseModel):
    org_id: UUID


class OrgBrief(BaseModel):
    id: UUID
    name: str
    slug: str
    role: UserRole

    model_config = {"from_attributes": True}
