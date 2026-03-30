"""Organization-level management service — scoped to a single org."""

import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.email import send_email_fire_and_forget
from app.core.exceptions import (
    BadRequestException,
    NotFoundException,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
)
from app.models.organization import OrgInvitation, OrgMembership, Organization
from app.models.user import User

# ── Settings ──


async def get_org_settings(org_id: UUID, db: AsyncSession) -> Organization:
    """Return the organization record for settings display."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise NotFoundException(detail="Organization not found")
    return org


async def update_org_settings(
    org_id: UUID, data: dict, db: AsyncSession
) -> Organization:
    """Update editable org fields (name, logo, address, gst)."""
    org = await get_org_settings(org_id, db)
    for key, value in data.items():
        if value is not None:
            setattr(org, key, value)
    await db.commit()
    await db.refresh(org)
    return org


# ── Members ──


async def list_members(org_id: UUID, db: AsyncSession) -> list[dict]:
    """List all active memberships with user details."""
    result = await db.execute(
        select(OrgMembership)
        .options(selectinload(OrgMembership.user))
        .where(OrgMembership.org_id == org_id)
        .order_by(OrgMembership.created_at.asc())
    )
    memberships = result.scalars().all()

    return [
        {
            "user_id": m.user.id,
            "full_name": m.user.full_name,
            "email": m.user.email,
            "role": m.role,
            "is_active": m.is_active,
            "joined_at": m.created_at,
        }
        for m in memberships
        if m.user
    ]


async def remove_member(
    org_id: UUID, user_id: UUID, current_user_id: UUID, db: AsyncSession
) -> None:
    """Deactivate a membership. Cannot remove self."""
    if user_id == current_user_id:
        raise BadRequestException(
            detail="You cannot remove yourself from the organization"
        )

    result = await db.execute(
        select(OrgMembership).where(
            OrgMembership.org_id == org_id,
            OrgMembership.user_id == user_id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise NotFoundException(detail="Membership not found")

    membership.is_active = False
    await db.commit()


async def change_member_role(
    org_id: UUID,
    target_user_id: UUID,
    new_role: str,
    current_user_id: UUID,
    db: AsyncSession,
) -> dict:
    """Change a member's role. Cannot change own role."""
    if target_user_id == current_user_id:
        raise BadRequestException(detail="You cannot change your own role")

    result = await db.execute(
        select(OrgMembership)
        .options(selectinload(OrgMembership.user))
        .where(
            OrgMembership.org_id == org_id,
            OrgMembership.user_id == target_user_id,
            OrgMembership.is_active == True,  # noqa: E712
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise NotFoundException(detail="Active membership not found")

    membership.role = new_role
    await db.commit()
    await db.refresh(membership)

    return {
        "user_id": membership.user.id,
        "full_name": membership.user.full_name,
        "email": membership.user.email,
        "role": membership.role,
        "is_active": membership.is_active,
        "joined_at": membership.created_at,
    }


# ── Invitations ──


async def invite_member(
    org_id: UUID,
    email: str,
    role: str,
    invited_by: UUID,
    db: AsyncSession,
) -> OrgInvitation:
    """Create an invitation and send email."""
    org = await get_org_settings(org_id, db)

    # Check user limit
    active_count_result = await db.execute(
        select(func.count(OrgMembership.id)).where(
            OrgMembership.org_id == org_id,
            OrgMembership.is_active == True,  # noqa: E712
        )
    )
    active_count = active_count_result.scalar() or 0
    if active_count >= org.max_users:
        raise BadRequestException(
            detail=f"User limit reached ({org.max_users}). Upgrade your plan to invite more members."
        )

    # Check if already a member
    existing_mem = await db.execute(
        select(OrgMembership).where(
            OrgMembership.org_id == org_id,
            OrgMembership.user_id
            == select(User.id).where(User.email == email).scalar_subquery(),
            OrgMembership.is_active == True,  # noqa: E712
        )
    )
    if existing_mem.scalar_one_or_none():
        raise BadRequestException(
            detail="This user is already a member of the organization"
        )

    # Check for pending invitation
    existing_inv = await db.execute(
        select(OrgInvitation).where(
            OrgInvitation.org_id == org_id,
            OrgInvitation.email == email,
            OrgInvitation.accepted == False,  # noqa: E712
            OrgInvitation.expires_at > datetime.now(timezone.utc),
        )
    )
    if existing_inv.scalar_one_or_none():
        raise BadRequestException(
            detail="A pending invitation already exists for this email"
        )

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    invitation = OrgInvitation(
        org_id=org_id,
        email=email,
        role=role,
        token=token,
        expires_at=expires_at,
        invited_by=invited_by,
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)

    # Build invite link — ALWAYS use the main domain (not subdomain)
    # The user has no account yet, so subdomain auth context doesn't exist
    # After accepting, they'll be redirected to their tenant subdomain on login
    protocol = "https" if "localhost" not in settings.BASE_DOMAIN else "http"
    main_domain = settings.BASE_DOMAIN
    invite_link = f"{protocol}://{main_domain}/accept-invite?token={token}"
    send_email_fire_and_forget(
        subject=f"You're invited to join {org.name} on IntDesign ERP",
        email_to=email,
        template_name="generic_notification.html",
        template_data={
            "subject": f"You're invited to join {org.name}",
            "user_name": email.split("@")[0],
            "body": (
                f"You have been invited to join <strong>{org.name}</strong> "
                f"as a <strong>{role}</strong>. Click the button below to accept "
                f"the invitation. This link expires in 7 days."
            ),
            "action_url": invite_link,
            "action_label": "Accept Invitation",
        },
    )

    return invitation


async def list_pending_invitations(org_id: UUID, db: AsyncSession) -> list:
    """Return all pending (not accepted, not expired) invitations for the org."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(OrgInvitation).where(
            OrgInvitation.org_id == org_id,
            OrgInvitation.accepted == False,
            OrgInvitation.expires_at > now,
        ).order_by(OrgInvitation.created_at.desc())
    )
    return list(result.scalars().all())


async def cancel_invitation(org_id: UUID, invitation_id: UUID, db: AsyncSession) -> None:
    """Delete a pending invitation."""
    result = await db.execute(
        select(OrgInvitation).where(
            OrgInvitation.id == invitation_id,
            OrgInvitation.org_id == org_id,
            OrgInvitation.accepted == False,
        )
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise NotFoundException(detail="Invitation not found or already accepted")
    await db.delete(invitation)
    await db.commit()


# ── Invite Info & Acceptance ──


async def get_invite_info(token: str, db: AsyncSession) -> dict:
    """Return info about an invitation for the accept-invite page."""
    result = await db.execute(
        select(OrgInvitation)
        .options(selectinload(OrgInvitation.organization))
        .where(OrgInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise NotFoundException(detail="Invitation not found or invalid token")

    if invitation.accepted:
        raise BadRequestException(detail="This invitation has already been accepted")

    if invitation.expires_at < datetime.now(timezone.utc):
        raise BadRequestException(detail="This invitation has expired")

    # Check if user already has an account
    user_result = await db.execute(select(User).where(User.email == invitation.email))
    has_account = user_result.scalar_one_or_none() is not None

    return {
        "org_name": invitation.organization.name,
        "email": invitation.email,
        "role": invitation.role,
        "expires_at": invitation.expires_at,
        "already_has_account": has_account,
    }


async def accept_invite(
    token: str,
    full_name: str | None,
    password: str | None,
    db: AsyncSession,
) -> dict:
    """Accept an invitation. Creates user if needed, adds membership, returns tokens."""
    result = await db.execute(
        select(OrgInvitation)
        .options(selectinload(OrgInvitation.organization))
        .where(OrgInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise NotFoundException(detail="Invitation not found or invalid token")

    if invitation.accepted:
        raise BadRequestException(detail="This invitation has already been accepted")

    if invitation.expires_at < datetime.now(timezone.utc):
        raise BadRequestException(detail="This invitation has expired")

    # Find or create user
    user_result = await db.execute(select(User).where(User.email == invitation.email))
    user = user_result.scalar_one_or_none()

    if not user:
        # New user — name and password required
        if not full_name or not password:
            raise BadRequestException(
                detail="Full name and password are required for new users"
            )
        user = User(
            email=invitation.email,
            full_name=full_name,
            hashed_password=get_password_hash(password),
            is_active=True,
        )
        db.add(user)
        await db.flush()

    # Check if already a member (reactivate if inactive)
    mem_result = await db.execute(
        select(OrgMembership).where(
            OrgMembership.user_id == user.id,
            OrgMembership.org_id == invitation.org_id,
        )
    )
    existing_membership = mem_result.scalar_one_or_none()

    if existing_membership:
        existing_membership.is_active = True
        existing_membership.role = invitation.role
    else:
        membership = OrgMembership(
            user_id=user.id,
            org_id=invitation.org_id,
            role=invitation.role,
            is_default=False,
            is_active=True,
        )
        db.add(membership)

    invitation.accepted = True
    await db.commit()

    # Issue tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "org_id": str(invitation.org_id)}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "org_id": str(invitation.org_id)}
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "message": f"Successfully joined {invitation.organization.name}",
    }


# ── Usage ──


async def get_org_usage(org_id: UUID, db: AsyncSession) -> dict:
    """Return usage metrics for the org."""
    from app.models.crm import Lead
    from app.models.project import Project

    org = await get_org_settings(org_id, db)

    lead_count = await db.execute(
        select(func.count(Lead.id)).where(Lead.org_id == org_id)
    )
    project_count = await db.execute(
        select(func.count(Project.id)).where(Project.org_id == org_id)
    )
    user_count = await db.execute(
        select(func.count(OrgMembership.id)).where(
            OrgMembership.org_id == org_id,
            OrgMembership.is_active == True,  # noqa: E712
        )
    )

    # Estimate storage (simplified — count uploads directory or use 0 for now)
    storage_used = 0

    return {
        "total_leads": lead_count.scalar() or 0,
        "total_projects": project_count.scalar() or 0,
        "total_users": user_count.scalar() or 0,
        "storage_used_bytes": storage_used,
        "limits": {
            "max_users": org.max_users,
            "max_projects": org.max_projects,
            "max_leads": _plan_lead_limit(org.plan_tier),
            "max_storage_bytes": _plan_storage_limit(org.plan_tier),
        },
    }


# ── Billing ──


async def get_org_billing(org_id: UUID, db: AsyncSession) -> dict:
    """Return billing/subscription info for the org."""
    org = await get_org_settings(org_id, db)

    days_remaining = None
    if org.trial_expires_at:
        delta = org.trial_expires_at - datetime.now(timezone.utc)
        days_remaining = max(0, delta.days)

    return {
        "plan_tier": org.plan_tier,
        "subscription_status": org.subscription_status,
        "trial_expires_at": org.trial_expires_at,
        "days_remaining": days_remaining,
    }


# ── Helpers ──


def _plan_lead_limit(tier: str) -> int:
    limits = {"FREE": 50, "STARTER": 500, "PRO": 5000, "ENTERPRISE": 999999}
    return limits.get(tier, 50)


def _plan_storage_limit(tier: str) -> int:
    """Return storage limit in bytes."""
    gb = 1024 * 1024 * 1024
    limits = {
        "FREE": 1 * gb,
        "STARTER": 10 * gb,
        "PRO": 100 * gb,
        "ENTERPRISE": 1000 * gb,
    }
    return limits.get(tier, 1 * gb)
