"""Plan-based resource limits and enforcement for multi-tenant SaaS."""

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization, OrgMembership
from app.models.crm import Lead
from app.models.project import Project

PLAN_LIMITS = {
    "FREE": {
        "max_users": 3,
        "max_projects": 2,
        "max_leads": 50,
        "storage_gb": 1,
        "whatsapp": False,
        "ai_analysis": False,
    },
    "STARTER": {
        "max_users": 10,
        "max_projects": 10,
        "max_leads": 500,
        "storage_gb": 5,
        "whatsapp": True,
        "ai_analysis": False,
    },
    "PRO": {
        "max_users": 25,
        "max_projects": 50,
        "max_leads": 5000,
        "storage_gb": 25,
        "whatsapp": True,
        "ai_analysis": True,
    },
    "ENTERPRISE": {
        "max_users": -1,
        "max_projects": -1,
        "max_leads": -1,
        "storage_gb": 100,
        "whatsapp": True,
        "ai_analysis": True,
    },
}


async def get_org_plan(org_id: UUID, db: AsyncSession) -> dict:
    """Fetch the organization's plan tier and return the corresponding limits."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    tier = (org.plan_tier.value if org.plan_tier else "FREE")
    return PLAN_LIMITS.get(tier, PLAN_LIMITS["FREE"])


async def enforce_lead_limit(org_id: UUID, db: AsyncSession) -> None:
    """Raise 402 if the organization has reached its lead limit."""
    limits = await get_org_plan(org_id, db)
    if limits["max_leads"] == -1:
        return
    count = await db.scalar(
        select(func.count()).select_from(Lead).where(Lead.org_id == org_id)
    )
    if count >= limits["max_leads"]:
        raise HTTPException(
            status_code=402,
            detail=f"Lead limit reached ({limits['max_leads']}). Upgrade your plan.",
        )


async def enforce_project_limit(org_id: UUID, db: AsyncSession) -> None:
    """Raise 402 if the organization has reached its project limit."""
    limits = await get_org_plan(org_id, db)
    if limits["max_projects"] == -1:
        return
    count = await db.scalar(
        select(func.count()).select_from(Project).where(Project.org_id == org_id)
    )
    if count >= limits["max_projects"]:
        raise HTTPException(
            status_code=402,
            detail=f"Project limit reached ({limits['max_projects']}). Upgrade your plan.",
        )


async def enforce_user_limit(org_id: UUID, db: AsyncSession) -> None:
    """Raise 402 if the organization has reached its user (member) limit."""
    limits = await get_org_plan(org_id, db)
    if limits["max_users"] == -1:
        return
    count = await db.scalar(
        select(func.count())
        .select_from(OrgMembership)
        .where(
            OrgMembership.org_id == org_id,
            OrgMembership.is_active == True,  # noqa: E712
        )
    )
    if count >= limits["max_users"]:
        raise HTTPException(
            status_code=402,
            detail=f"User limit reached ({limits['max_users']}). Upgrade your plan.",
        )


async def check_feature_enabled(org_id: UUID, feature: str, db: AsyncSession) -> bool:
    """Check whether a specific feature flag is enabled for the org's plan."""
    limits = await get_org_plan(org_id, db)
    return limits.get(feature, False)
