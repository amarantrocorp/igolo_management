from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.models.organization import PlanTier, SubscriptionStatus
from app.models.user import UserRole

# ── Settings ──


class OrgSettingsResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    logo_url: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    plan_tier: PlanTier
    subscription_status: SubscriptionStatus
    trial_expires_at: Optional[datetime] = None
    max_users: int
    max_projects: int
    inventory_enabled: bool = True

    model_config = {"from_attributes": True}


class OrgSettingsUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    inventory_enabled: Optional[bool] = None


# ── Members ──


class OrgMemberResponse(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    joined_at: datetime

    model_config = {"from_attributes": True}


# ── Invitations ──


class OrgInviteRequest(BaseModel):
    email: EmailStr
    role: UserRole


class OrgInviteResponse(BaseModel):
    id: UUID
    email: str
    role: str
    token: str
    expires_at: datetime

    model_config = {"from_attributes": True}


class PendingInviteResponse(BaseModel):
    id: UUID
    email: str
    role: str
    expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Usage ──


class OrgUsageResponse(BaseModel):
    total_leads: int
    total_projects: int
    total_users: int
    storage_used_bytes: int
    limits: dict


# ── Billing ──


class OrgBillingResponse(BaseModel):
    plan_tier: PlanTier
    subscription_status: SubscriptionStatus
    trial_expires_at: Optional[datetime] = None
    days_remaining: Optional[int] = None


# ── Invite Acceptance ──


class AcceptInviteRequest(BaseModel):
    token: str
    full_name: Optional[str] = None
    password: Optional[str] = None


class AcceptInviteResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    message: str


class InviteInfoResponse(BaseModel):
    org_name: str
    email: str
    role: str
    expires_at: datetime
    already_has_account: bool


# ── Role change ──


class MemberRoleUpdateRequest(BaseModel):
    role: UserRole
