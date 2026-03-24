from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.user import UserRole


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class OrgOption(BaseModel):
    id: UUID
    name: str
    slug: str
    role: UserRole


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    requires_org_selection: bool = False
    organizations: Optional[List[OrgOption]] = None


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class ForgotPasswordResponse(BaseModel):
    message: str
