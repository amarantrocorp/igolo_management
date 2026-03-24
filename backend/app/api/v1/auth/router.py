from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_limiter.depends import RateLimiter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_auth_context, get_current_user, AuthContext
from app.db.session import get_db
from app.models.organization import OrgMembership
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginResponse,
    ResetPasswordRequest,
    Token,
    TokenRefresh,
)
from app.schemas.organization import OrgSwitchRequest
from app.schemas.user import UserWithOrgResponse, OrgMembershipBrief
from app.schemas.org import (
    AcceptInviteRequest,
    AcceptInviteResponse,
    InviteInfoResponse,
)
from app.services import auth_service, org_service
from app.api.v1.auth.register import router as register_router

router = APIRouter()
router.include_router(register_router)


@router.post(
    "/token",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(RateLimiter(times=5, seconds=60))],
)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """OAuth2 password flow login. Returns access + refresh token pair with org context."""
    return await auth_service.authenticate_user(
        email=form_data.username,
        password=form_data.password,
        db=db,
    )


@router.post("/select-org", response_model=Token, status_code=status.HTTP_200_OK)
async def select_org(
    payload: OrgSwitchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """After login with multiple orgs, user picks one. Returns full token with org_id."""
    return await auth_service.select_org(
        user=current_user,
        org_id=payload.org_id,
        db=db,
    )


@router.post("/switch-org", response_model=Token, status_code=status.HTTP_200_OK)
async def switch_org(
    payload: OrgSwitchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Switch active organization. Validates membership and issues new token."""
    return await auth_service.switch_org(
        user=current_user,
        org_id=payload.org_id,
        db=db,
    )


@router.post("/refresh", response_model=Token, status_code=status.HTTP_200_OK)
async def refresh_token(
    payload: TokenRefresh,
    db: AsyncSession = Depends(get_db),
):
    """Exchange a valid refresh token for a new access + refresh token pair."""
    return await auth_service.refresh_tokens(
        refresh_token_str=payload.refresh_token,
        db=db,
    )


@router.get("/me", response_model=UserWithOrgResponse, status_code=status.HTTP_200_OK)
async def get_current_user_profile(
    ctx: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
):
    """Return the profile of the currently authenticated user with org context."""
    # Fetch all memberships for the user
    mem_result = await db.execute(
        select(OrgMembership)
        .options(selectinload(OrgMembership.organization))
        .where(
            OrgMembership.user_id == ctx.user.id,
            OrgMembership.is_active == True,  # noqa: E712
        )
    )
    memberships = mem_result.scalars().all()

    org_briefs = [
        OrgMembershipBrief(
            id=m.id,
            org_id=m.org_id,
            org_name=m.organization.name,
            org_slug=m.organization.slug,
            role=m.role,
            is_default=m.is_default,
        )
        for m in memberships
        if m.organization.is_active
    ]

    return UserWithOrgResponse(
        id=ctx.user.id,
        email=ctx.user.email,
        full_name=ctx.user.full_name,
        phone=ctx.user.phone,
        is_active=ctx.user.is_active,
        avatar_url=ctx.user.avatar_url,
        is_platform_admin=ctx.user.is_platform_admin,
        created_at=ctx.user.created_at,
        active_org_id=ctx.org_id,
        role_in_org=ctx.role,
        organizations=org_briefs,
    )


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    status_code=status.HTTP_200_OK,
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Request a password reset link. Always returns success to prevent user enumeration."""
    return await auth_service.request_password_reset(
        email=payload.email,
        db=db,
    )


@router.post(
    "/reset-password",
    response_model=ForgotPasswordResponse,
    status_code=status.HTTP_200_OK,
)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using a valid reset token."""
    return await auth_service.reset_password(
        token=payload.token,
        new_password=payload.new_password,
        db=db,
    )


@router.get(
    "/invite-info", response_model=InviteInfoResponse, status_code=status.HTTP_200_OK
)
async def get_invite_info(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Return info about an invitation (org name, role, etc.) for the accept-invite page."""
    return await org_service.get_invite_info(token=token, db=db)


@router.post(
    "/accept-invite",
    response_model=AcceptInviteResponse,
    status_code=status.HTTP_200_OK,
)
async def accept_invite(
    payload: AcceptInviteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Accept an invitation. Creates user if needed, adds org membership, returns tokens."""
    return await org_service.accept_invite(
        token=payload.token,
        full_name=payload.full_name,
        password=payload.password,
        db=db,
    )
