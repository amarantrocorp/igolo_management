from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.organization import (
    OrgMembershipCreate,
    OrganizationCreate,
    OrganizationResponse,
    OrganizationUpdate,
)
from app.services import platform_service

router = APIRouter()


def _require_platform_admin(user: User = Depends(get_current_user)) -> User:
    """Dependency that ensures the user is a platform admin."""
    if not user.is_platform_admin:
        raise ForbiddenException(detail="Platform admin access required")
    return user


@router.post(
    "/organizations",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_organization(
    payload: OrganizationCreate,
    admin: User = Depends(_require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new organization."""
    return await platform_service.create_organization(
        data=payload.model_dump(), db=db
    )


@router.get("/organizations", response_model=list[OrganizationResponse])
async def list_organizations(
    skip: int = 0,
    limit: int = 50,
    admin: User = Depends(_require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all organizations."""
    return await platform_service.list_organizations(db=db, skip=skip, limit=limit)


@router.get("/organizations/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: str,
    admin: User = Depends(_require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get a single organization."""
    from uuid import UUID
    return await platform_service.get_organization(org_id=UUID(org_id), db=db)


@router.patch("/organizations/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: str,
    payload: OrganizationUpdate,
    admin: User = Depends(_require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update an organization."""
    from uuid import UUID
    return await platform_service.update_organization(
        org_id=UUID(org_id),
        data=payload.model_dump(exclude_unset=True),
        db=db,
    )


@router.post("/organizations/{org_id}/members", status_code=status.HTTP_201_CREATED)
async def add_member(
    org_id: str,
    payload: OrgMembershipCreate,
    admin: User = Depends(_require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Add a user to an organization."""
    from uuid import UUID
    return await platform_service.add_member(
        org_id=UUID(org_id),
        user_id=payload.user_id,
        role=payload.role,
        is_default=payload.is_default,
        db=db,
    )


@router.delete(
    "/organizations/{org_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_member(
    org_id: str,
    user_id: str,
    admin: User = Depends(_require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Remove a user from an organization."""
    from uuid import UUID
    await platform_service.remove_member(
        org_id=UUID(org_id), user_id=UUID(user_id), db=db
    )


@router.get("/organizations/{org_id}/members")
async def list_members(
    org_id: str,
    admin: User = Depends(_require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """List members of an organization."""
    from uuid import UUID
    return await platform_service.list_members(org_id=UUID(org_id), db=db)


@router.get("/stats")
async def get_platform_stats(
    admin: User = Depends(_require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get platform-wide statistics."""
    return await platform_service.get_platform_stats(db=db)
