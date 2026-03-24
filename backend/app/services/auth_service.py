from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import create_access_token, create_refresh_token, decode_token
from app.models.organization import OrgMembership
from app.models.user import User
from app.schemas.auth import LoginResponse, OrgOption, Token
from app.services.user_service import (
    authenticate_user as _authenticate_user,
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
