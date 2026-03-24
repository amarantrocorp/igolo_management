from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthContext, role_required
from app.db.session import get_db
from app.schemas.org import (
    MemberRoleUpdateRequest,
    OrgBillingResponse,
    OrgInviteRequest,
    OrgInviteResponse,
    OrgMemberResponse,
    OrgSettingsResponse,
    OrgSettingsUpdate,
    OrgUsageResponse,
)
from app.services import org_service

router = APIRouter()

# Dependency: SUPER_ADMIN or MANAGER in org
_admin_or_manager = role_required(["SUPER_ADMIN", "MANAGER"])
# Dependency: SUPER_ADMIN only
_super_admin_only = role_required(["SUPER_ADMIN"])


@router.get("/settings", response_model=OrgSettingsResponse)
async def get_org_settings(
    ctx: AuthContext = Depends(_admin_or_manager),
    db: AsyncSession = Depends(get_db),
):
    """Return the current organization's settings."""
    return await org_service.get_org_settings(org_id=ctx.org_id, db=db)


@router.patch("/settings", response_model=OrgSettingsResponse)
async def update_org_settings(
    payload: OrgSettingsUpdate,
    ctx: AuthContext = Depends(_super_admin_only),
    db: AsyncSession = Depends(get_db),
):
    """Update organization settings. Only SUPER_ADMIN."""
    return await org_service.update_org_settings(
        org_id=ctx.org_id,
        data=payload.model_dump(exclude_unset=True),
        db=db,
    )


@router.get("/members", response_model=list[OrgMemberResponse])
async def list_members(
    ctx: AuthContext = Depends(_admin_or_manager),
    db: AsyncSession = Depends(get_db),
):
    """List all memberships in the current org with user details."""
    return await org_service.list_members(org_id=ctx.org_id, db=db)


@router.post(
    "/invite", response_model=OrgInviteResponse, status_code=status.HTTP_201_CREATED
)
async def invite_member(
    payload: OrgInviteRequest,
    ctx: AuthContext = Depends(_super_admin_only),
    db: AsyncSession = Depends(get_db),
):
    """Create an invitation and send email. Checks user limit. Only SUPER_ADMIN."""
    return await org_service.invite_member(
        org_id=ctx.org_id,
        email=payload.email,
        role=payload.role.value,
        invited_by=ctx.user.id,
        db=db,
    )


@router.delete("/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    user_id: UUID,
    ctx: AuthContext = Depends(_super_admin_only),
    db: AsyncSession = Depends(get_db),
):
    """Remove (deactivate) a member. Cannot remove self. Only SUPER_ADMIN."""
    await org_service.remove_member(
        org_id=ctx.org_id,
        user_id=user_id,
        current_user_id=ctx.user.id,
        db=db,
    )


@router.patch("/members/{user_id}/role", response_model=OrgMemberResponse)
async def change_member_role(
    user_id: UUID,
    payload: MemberRoleUpdateRequest,
    ctx: AuthContext = Depends(_super_admin_only),
    db: AsyncSession = Depends(get_db),
):
    """Change a member's role. Cannot change own role. Only SUPER_ADMIN."""
    return await org_service.change_member_role(
        org_id=ctx.org_id,
        target_user_id=user_id,
        new_role=payload.role.value,
        current_user_id=ctx.user.id,
        db=db,
    )


@router.get("/usage", response_model=OrgUsageResponse)
async def get_org_usage(
    ctx: AuthContext = Depends(_admin_or_manager),
    db: AsyncSession = Depends(get_db),
):
    """Return usage metrics (leads, projects, users, storage) vs plan limits."""
    return await org_service.get_org_usage(org_id=ctx.org_id, db=db)


@router.get("/billing", response_model=OrgBillingResponse)
async def get_org_billing(
    ctx: AuthContext = Depends(_admin_or_manager),
    db: AsyncSession = Depends(get_db),
):
    """Return billing/subscription info."""
    return await org_service.get_org_billing(org_id=ctx.org_id, db=db)
