"""Self-service organization registration."""

import logging
import re
import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.email import send_email_fire_and_forget
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
)
from app.db.session import get_db
from app.models.organization import Organization, OrgMembership, SubscriptionStatus
from app.models.user import User, UserRole
from app.services.tenant_provisioner import (
    slugify_schema_name,
    create_tenant_schema,
    provision_tenant_tables,
)

logger = logging.getLogger(__name__)

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
    org_slug: str
    message: str


@router.post("/register", response_model=RegisterResponse)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new organization with owner account. Starts a 14-day free trial."""
    # 0. Validate password complexity
    if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$', data.password):
        raise HTTPException(
            status_code=422,
            detail="Password must contain at least one uppercase letter, one lowercase letter, and one digit",
        )

    # 1. Check email not taken
    existing = await db.scalar(select(User).where(User.email == data.email.lower()))
    if existing:
        raise HTTPException(
            400, "Unable to create account. Please try a different email or login to your existing account."
        )

    # 2. Create organization with trial + schema
    slug = (
        data.company_name.lower().replace(" ", "-").replace(".", "")[:50]
        + "-"
        + secrets.token_hex(4)
    )
    schema_name = slugify_schema_name(slug)
    trial_end = datetime.now(timezone.utc) + timedelta(days=14)

    org = Organization(
        id=uuid4(),
        name=data.company_name,
        slug=slug,
        is_active=True,
        schema_name=schema_name,
        subscription_status=SubscriptionStatus.TRIAL,
        trial_expires_at=trial_end,
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

    # 5. Provision the tenant schema (async, non-blocking on failure)
    try:
        await create_tenant_schema(schema_name, db)
        await provision_tenant_tables(schema_name)
        logger.info(f"Tenant schema '{schema_name}' provisioned for new org '{slug}'")
    except Exception as e:
        logger.error(f"Failed to provision schema '{schema_name}': {e}")

    # 6. Generate tokens
    token_data = {"sub": str(user.id), "org_id": str(org.id)}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    # 7. Send welcome email (fire and forget)
    from app.core.config import settings

    dashboard_url = (
        f"http://{slug}.{settings.BASE_DOMAIN}/dashboard"
        if settings.USE_SUBDOMAINS
        else f"{settings.FRONTEND_URL}/dashboard"
    )

    send_email_fire_and_forget(
        subject=f"Welcome to IntDesignERP, {data.full_name}!",
        email_to=data.email,
        template_name="welcome.html",
        template_data={
            "subject": "Welcome to IntDesignERP!",
            "name": data.full_name,
            "company": data.company_name,
            "trial_days": 14,
            "dashboard_url": dashboard_url,
        },
    )

    return RegisterResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=str(user.id),
        org_id=str(org.id),
        org_slug=slug,
        message="Welcome! Your 14-day free trial has started.",
    )
