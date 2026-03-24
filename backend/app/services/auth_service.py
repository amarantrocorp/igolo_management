import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.email import send_email_fire_and_forget
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
)
from app.models.organization import OrgMembership
from app.models.user import PasswordResetToken, User
from app.schemas.auth import ForgotPasswordResponse, LoginResponse, OrgOption, Token
from app.services.user_service import (
    authenticate_user as _authenticate_user,
    get_user_by_email,
    get_user_by_id,
)


async def authenticate_user(email: str, password: str, db: AsyncSession) -> LoginResponse:
    """Authenticate a user and return login response with org context."""
    user = await _authenticate_user(email, password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch active memberships with org details
    mem_result = await db.execute(
        select(OrgMembership)
        .options(selectinload(OrgMembership.organization))
        .where(
            OrgMembership.user_id == user.id,
            OrgMembership.is_active == True,  # noqa: E712
        )
    )
    memberships = mem_result.scalars().all()

    # Platform admins with no memberships can still get a token (no org context needed initially)
    if not memberships and not user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of any organization",
        )

    # Build org options
    org_options = [
        OrgOption(
            id=m.org_id,
            name=m.organization.name,
            slug=m.organization.slug,
            role=m.role,
        )
        for m in memberships
        if m.organization.is_active
    ]

    selected_org: OrgMembership | None = None

    if len(org_options) == 0 and user.is_platform_admin:
        # Platform admin with no org — issue token without org_id
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            requires_org_selection=False,
            organizations=[],
        )

    if len(org_options) == 1:
        # Single org — auto-select
        selected_org = memberships[0]
    else:
        # Multiple orgs — check for default
        defaults = [m for m in memberships if m.is_default and m.organization.is_active]
        if defaults:
            selected_org = defaults[0]

    if selected_org:
        # Auto-select: issue full token with org_id
        access_token = create_access_token(
            data={"sub": str(user.id), "org_id": str(selected_org.org_id)}
        )
        refresh_token = create_refresh_token(
            data={"sub": str(user.id), "org_id": str(selected_org.org_id)}
        )
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            requires_org_selection=False,
            organizations=org_options,
        )

    # Multiple orgs, no default — require user to pick
    # Issue a temporary token without org_id for the /select-org call
    temp_token = create_access_token(data={"sub": str(user.id)})
    return LoginResponse(
        access_token=temp_token,
        refresh_token=None,
        requires_org_selection=True,
        organizations=org_options,
    )


async def select_org(user: User, org_id: UUID, db: AsyncSession) -> Token:
    """After login, user picks an org. Issue full token with org_id."""
    mem_result = await db.execute(
        select(OrgMembership).where(
            OrgMembership.user_id == user.id,
            OrgMembership.org_id == org_id,
            OrgMembership.is_active == True,  # noqa: E712
        )
    )
    membership = mem_result.scalar_one_or_none()

    if not membership and not user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization",
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "org_id": str(org_id)}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "org_id": str(org_id)}
    )
    return Token(access_token=access_token, refresh_token=refresh_token)


async def switch_org(user: User, org_id: UUID, db: AsyncSession) -> Token:
    """Switch the active org for a logged-in user. Validates membership."""
    return await select_org(user, org_id, db)


async def refresh_tokens(refresh_token_str: str, db: AsyncSession) -> Token:
    """Exchange a valid refresh token for a new access + refresh token pair."""
    payload = decode_token(refresh_token_str)
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    user_id = payload.get("sub")
    org_id = payload.get("org_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    user = await get_user_by_id(UUID(user_id), db)

    token_data = {"sub": str(user.id)}
    if org_id:
        token_data["org_id"] = org_id

    access_token = create_access_token(data=token_data)
    new_refresh_token = create_refresh_token(data=token_data)
    return Token(access_token=access_token, refresh_token=new_refresh_token)


async def request_password_reset(email: str, db: AsyncSession) -> ForgotPasswordResponse:
    """Generate a password reset token and send email.

    Always returns a success message regardless of whether the email exists,
    to prevent user enumeration.
    """
    user = await get_user_by_email(email, db)

    if user and user.is_active:
        # Generate a secure token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at,
        )
        db.add(reset_token)
        await db.commit()

        # Build the reset link
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"

        # Send email (fire-and-forget, won't block)
        send_email_fire_and_forget(
            subject="Reset Your Password - IntDesign ERP",
            email_to=user.email,
            template_name="password_reset.html",
            template_data={
                "subject": "Reset Your Password",
                "user_name": user.full_name,
                "reset_link": reset_link,
            },
        )

    return ForgotPasswordResponse(
        message="If an account exists with this email, you will receive a password reset link."
    )


async def reset_password(token: str, new_password: str, db: AsyncSession) -> ForgotPasswordResponse:
    """Validate the reset token and update the user's password."""
    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == token)
    )
    reset_token = result.scalar_one_or_none()

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link.",
        )

    if reset_token.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link has already been used.",
        )

    if reset_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link has expired. Please request a new one.",
        )

    # Fetch the user and update password
    user = await get_user_by_id(reset_token.user_id, db)
    user.hashed_password = get_password_hash(new_password)

    # Mark token as used
    reset_token.used = True

    db.add(user)
    db.add(reset_token)
    await db.commit()

    return ForgotPasswordResponse(message="Your password has been reset successfully.")
