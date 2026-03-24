"""Platform admin service — cross-tenant operations."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.organization import OrgMembership, Organization
from app.models.project import Project
from app.models.user import User


async def create_organization(
    data: dict, db: AsyncSession
) -> Organization:
    """Create a new organization (platform admin only)."""
    # Check slug uniqueness
    existing = await db.execute(
        select(Organization).where(Organization.slug == data["slug"])
    )
    if existing.scalar_one_or_none():
        raise BadRequestException(detail=f"Slug '{data['slug']}' is already in use")

    org = Organization(**data)
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


async def list_organizations(
    db: AsyncSession, skip: int = 0, limit: int = 50
) -> list[Organization]:
    """List all organizations (platform admin only)."""
    result = await db.execute(
        select(Organization).offset(skip).limit(limit).order_by(Organization.created_at.desc())
    )
    return list(result.scalars().all())


async def get_organization(org_id: UUID, db: AsyncSession) -> Organization:
    """Get a single organization by ID."""
    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise NotFoundException(detail=f"Organization '{org_id}' not found")
    return org


async def update_organization(
    org_id: UUID, data: dict, db: AsyncSession
) -> Organization:
    """Update an organization (platform admin only)."""
    org = await get_organization(org_id, db)
    for key, value in data.items():
        if value is not None:
            setattr(org, key, value)
    await db.commit()
    await db.refresh(org)
    return org


async def add_member(
    org_id: UUID, user_id: UUID, role: str, is_default: bool, db: AsyncSession
) -> OrgMembership:
    """Add a user to an organization."""
    # Verify org exists
    await get_organization(org_id, db)

    # Verify user exists
    user_result = await db.execute(select(User).where(User.id == user_id))
    if not user_result.scalar_one_or_none():
        raise NotFoundException(detail=f"User '{user_id}' not found")

    # Check if membership already exists
    existing = await db.execute(
        select(OrgMembership).where(
            OrgMembership.user_id == user_id,
            OrgMembership.org_id == org_id,
        )
    )
    if existing.scalar_one_or_none():
        raise BadRequestException(detail="User is already a member of this organization")

    membership = OrgMembership(
        user_id=user_id,
        org_id=org_id,
        role=role,
        is_default=is_default,
        is_active=True,
    )
    db.add(membership)
    await db.commit()
    await db.refresh(membership)
    return membership


async def remove_member(
    org_id: UUID, user_id: UUID, db: AsyncSession
) -> None:
    """Remove a user from an organization (deactivate membership)."""
    result = await db.execute(
        select(OrgMembership).where(
            OrgMembership.user_id == user_id,
            OrgMembership.org_id == org_id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise NotFoundException(detail="Membership not found")

    membership.is_active = False
    await db.commit()


async def list_members(
    org_id: UUID, db: AsyncSession
) -> list[OrgMembership]:
    """List all members of an organization."""
    result = await db.execute(
        select(OrgMembership)
        .options(selectinload(OrgMembership.user))
        .where(
            OrgMembership.org_id == org_id,
            OrgMembership.is_active == True,  # noqa: E712
        )
    )
    return list(result.scalars().all())


async def get_platform_stats(db: AsyncSession) -> dict:
    """Get cross-tenant platform statistics."""
    org_count = await db.execute(select(func.count(Organization.id)))
    user_count = await db.execute(select(func.count(User.id)))
    active_project_count = await db.execute(
        select(func.count(Project.id)).where(Project.status == "IN_PROGRESS")
    )

    return {
        "total_organizations": org_count.scalar() or 0,
        "total_users": user_count.scalar() or 0,
        "active_projects": active_project_count.scalar() or 0,
    }
