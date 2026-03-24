"""Platform admin service — cross-tenant operations."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.organization import OrgMembership, Organization
from app.models.project import Project
from app.models.user import User


async def create_organization(data: dict, db: AsyncSession) -> Organization:
    """Create a new organization and provision its tenant schema."""
    from app.services.tenant_provisioner import (
        slugify_schema_name,
        create_tenant_schema,
        provision_tenant_tables,
    )

    # Check slug uniqueness
    existing = await db.execute(
        select(Organization).where(Organization.slug == data["slug"])
    )
    if existing.scalar_one_or_none():
        raise BadRequestException(detail=f"Slug '{data['slug']}' is already in use")

    # Generate schema name from slug
    schema_name = slugify_schema_name(data["slug"])
    data["schema_name"] = schema_name

    org = Organization(**data)
    db.add(org)
    await db.commit()
    await db.refresh(org)

    # Provision the tenant schema and tables
    try:
        await create_tenant_schema(schema_name, db)
        await provision_tenant_tables(schema_name)
    except Exception as e:
        # Log but don't fail org creation — schema can be provisioned later
        import logging

        logging.getLogger(__name__).error(
            f"Failed to provision schema '{schema_name}': {e}"
        )

    return org


async def list_organizations(
    db: AsyncSession, skip: int = 0, limit: int = 50
) -> list[Organization]:
    """List all organizations (platform admin only)."""
    result = await db.execute(
        select(Organization)
        .offset(skip)
        .limit(limit)
        .order_by(Organization.created_at.desc())
    )
    return list(result.scalars().all())


async def get_organization(org_id: UUID, db: AsyncSession) -> Organization:
    """Get a single organization by ID."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
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
        raise BadRequestException(
            detail="User is already a member of this organization"
        )

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


async def remove_member(org_id: UUID, user_id: UUID, db: AsyncSession) -> None:
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


async def list_members(org_id: UUID, db: AsyncSession) -> list[OrgMembership]:
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
    from app.models.organization import PlanTier, SubscriptionStatus

    org_count = await db.execute(select(func.count(Organization.id)))
    user_count = await db.execute(select(func.count(User.id)))
    active_project_count = await db.execute(
        select(func.count(Project.id)).where(Project.status == "IN_PROGRESS")
    )

    # Subscription-based stats
    active_trials = await db.execute(
        select(func.count(Organization.id)).where(
            Organization.subscription_status == SubscriptionStatus.TRIAL
        )
    )
    paying_orgs = await db.execute(
        select(func.count(Organization.id)).where(
            Organization.subscription_status == SubscriptionStatus.ACTIVE
        )
    )
    suspended_count = await db.execute(
        select(func.count(Organization.id)).where(
            Organization.subscription_status == SubscriptionStatus.SUSPENDED
        )
    )
    cancelled_count = await db.execute(
        select(func.count(Organization.id)).where(
            Organization.subscription_status == SubscriptionStatus.CANCELLED
        )
    )

    # MRR calculation based on plan tiers
    plan_prices = {
        PlanTier.FREE: 0,
        PlanTier.STARTER: 2999,
        PlanTier.PRO: 7999,
        PlanTier.ENTERPRISE: 19999,
    }
    active_orgs_result = await db.execute(
        select(Organization.plan_tier).where(
            Organization.subscription_status == SubscriptionStatus.ACTIVE
        )
    )
    mrr = sum(plan_prices.get(row[0], 0) for row in active_orgs_result.all())

    total_orgs = org_count.scalar() or 0
    active_paying = paying_orgs.scalar() or 0
    total_trials = active_trials.scalar() or 0
    total_cancelled = cancelled_count.scalar() or 0

    # Trial conversion rate: active / (active + cancelled)
    conversion_denominator = active_paying + total_cancelled
    trial_conversion_rate = (
        round(active_paying / conversion_denominator * 100, 1)
        if conversion_denominator > 0
        else 0.0
    )

    return {
        "total_organizations": total_orgs,
        "total_users": user_count.scalar() or 0,
        "active_projects": active_project_count.scalar() or 0,
        "active_trials": total_trials,
        "paying_customers": active_paying,
        "suspended_count": suspended_count.scalar() or 0,
        "mrr": mrr,
        "trial_conversion_rate": trial_conversion_rate,
    }


async def suspend_organization(org_id: UUID, db: AsyncSession) -> Organization:
    """Suspend an organization."""
    from app.models.organization import SubscriptionStatus

    org = await get_organization(org_id, db)
    org.subscription_status = SubscriptionStatus.SUSPENDED
    org.is_active = False
    await db.commit()
    await db.refresh(org)
    return org


async def activate_organization(org_id: UUID, db: AsyncSession) -> Organization:
    """Activate a suspended organization."""
    from app.models.organization import SubscriptionStatus

    org = await get_organization(org_id, db)
    org.subscription_status = SubscriptionStatus.ACTIVE
    org.is_active = True
    await db.commit()
    await db.refresh(org)
    return org


async def change_plan(org_id: UUID, plan_tier: str, db: AsyncSession) -> Organization:
    """Override an organization's plan tier."""
    from app.models.organization import PlanTier

    org = await get_organization(org_id, db)
    org.plan_tier = PlanTier(plan_tier)
    await db.commit()
    await db.refresh(org)
    return org
