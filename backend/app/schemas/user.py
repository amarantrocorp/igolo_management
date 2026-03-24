from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone: Optional[str]
    role: Optional[UserRole] = None
    is_active: bool
    avatar_url: Optional[str] = None
    is_platform_admin: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    id: UUID
    full_name: str
    role: Optional[UserRole] = None

    model_config = {"from_attributes": True}


class OrgMembershipBrief(BaseModel):
    id: UUID
    org_id: UUID
    org_name: str
    org_slug: str
    role: UserRole
    is_default: bool

    model_config = {"from_attributes": True}


class UserWithOrgResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone: Optional[str] = None
    is_active: bool
    avatar_url: Optional[str] = None
    is_platform_admin: bool = False
    created_at: datetime
    active_org_id: UUID
    role_in_org: UserRole
    organizations: List[OrgMembershipBrief]

    model_config = {"from_attributes": True}
