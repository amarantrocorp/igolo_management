"""Self-service organization registration."""
import secrets
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.email import send_email_fire_and_forget
from app.core.security import create_access_token, create_refresh_token, get_password_hash
from app.db.session import get_db
from app.models.organization import Organization, OrgMembership
from app.models.user import User, UserRole

router = APIRouter(tags=["Registration"])


class RegisterRequest(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255)
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)
    phone: str = Field(default="", max_length=20)


class RegisterResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    org_id: str
    message: str


@router.post("/register", response_model=RegisterResponse)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new organization with owner account. Starts a 14-day free trial."""
    # 1. Check email not taken
    existing = await db.scalar(select(User).where(User.email == data.email.lower()))
    if existing:
        raise HTTPException(400, "An account with this email already exists. Please login.")

    # 2. Create organization
    slug = (
        data.company_name.lower()
        .replace(" ", "-")
        .replace(".", "")[:50]
        + "-"
        + secrets.token_hex(4)
    )
    org = Organization(
        id=uuid4(),
        name=data.company_name,
        slug=slug,
        is_active=True,
    )
    db.add(org)

    # 3. Create user
    user = User(
        id=uuid4(),
        email=data.email.lower(),
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        phone=data.phone or None,
        role=UserRole.SUPER_ADMIN,
        is_active=True,
    )
    db.add(user)

    # 4. Create membership
    membership = OrgMembership(
        id=uuid4(),
        user_id=user.id,
        org_id=org.id,
        role=UserRole.SUPER_ADMIN,
        is_default=True,
        is_active=True,
    )
    db.add(membership)

    await db.commit()

    # 5. Generate tokens
    token_data = {"sub": str(user.id), "org_id": str(org.id)}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    # 6. Send welcome email (fire and forget)
    send_email_fire_and_forget(
        subject=f"Welcome to IntDesignERP, {data.full_name}!",
        email_to=data.email,
        template_name="welcome.html",
        template_data={
            "subject": f"Welcome to IntDesignERP!",
            "name": data.full_name,
            "company": data.company_name,
            "trial_days": 14,
            "dashboard_url": "http://localhost:3000/dashboard",
        },
    )

    return RegisterResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=str(user.id),
        org_id=str(org.id),
        message="Welcome! Your 14-day free trial has started.",
    )
