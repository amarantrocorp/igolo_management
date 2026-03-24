"""Subscription billing endpoints.

GET  /billing/plans     — Public plan details and pricing.
GET  /billing/current   — Current org billing status.
POST /billing/subscribe — Create Razorpay order for plan upgrade.
POST /billing/verify-payment — Verify payment and activate subscription.
POST /billing/cancel    — Cancel subscription (SUPER_ADMIN only).
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException
from app.core.plan_limits import PLAN_LIMITS
from app.core.security import AuthContext, get_auth_context, role_required
from app.db.session import get_db
from app.models.organization import OrgMembership, Organization
from app.models.project import Project
from app.schemas.billing import (
    BillingStatusResponse,
    CancelSubscriptionResponse,
    PlanFeatures,
    PlanInfo,
    SubscribeRequest,
    SubscribeResponse,
    VerifySubscriptionRequest,
    VerifySubscriptionResponse,
)
from app.services.subscription_service import (
    PLAN_PRICES,
    activate_subscription,
    cancel_subscription,
    create_subscription,
    verify_razorpay_signature,
)

router = APIRouter()


@router.get("/plans", response_model=list[PlanInfo])
async def list_plans():
    """Public endpoint - returns plan details and pricing."""
    plans = []
    for tier_name, limits in PLAN_LIMITS.items():
        if tier_name == "FREE":
            continue
        prices = PLAN_PRICES.get(tier_name, {"monthly": 0, "yearly": 0})
        plans.append(
            PlanInfo(
                name=tier_name,
                price_monthly=prices["monthly"],
                price_yearly=prices["yearly"],
                features=PlanFeatures(**limits),
            )
        )
    return plans


@router.get("/current", response_model=BillingStatusResponse)
async def get_current_billing(
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Returns current org's plan, status, trial info, and usage counts."""
    result = await db.execute(select(Organization).where(Organization.id == ctx.org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise BadRequestException(detail="Organization not found")

    # Calculate days remaining for trial
    days_remaining = None
    if org.subscription_status.value == "TRIAL" and org.trial_expires_at:
        delta = org.trial_expires_at - datetime.now(timezone.utc)
        days_remaining = max(0, delta.days)

    # Count current usage
    user_count = await db.scalar(
        select(func.count())
        .select_from(OrgMembership)
        .where(
            OrgMembership.org_id == ctx.org_id,
            OrgMembership.is_active == True,  # noqa: E712
        )  # noqa: E712
    )
    project_count = await db.scalar(
        select(func.count()).select_from(Project).where(Project.org_id == ctx.org_id)
    )

    return BillingStatusResponse(
        plan=org.plan_tier.value,
        status=org.subscription_status.value,
        trial_expires_at=org.trial_expires_at,
        days_remaining=days_remaining,
        max_users=org.max_users,
        max_projects=org.max_projects,
        current_users=user_count or 0,
        current_projects=project_count or 0,
    )


@router.post(
    "/subscribe",
    response_model=SubscribeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def subscribe_to_plan(
    payload: SubscribeRequest,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["SUPER_ADMIN", "MANAGER"])),
):
    """Creates Razorpay order for plan upgrade."""
    if payload.plan not in ("STARTER", "PRO", "ENTERPRISE"):
        raise BadRequestException(
            detail="Invalid plan. Choose STARTER, PRO, or ENTERPRISE."
        )
    if payload.billing_cycle not in ("monthly", "yearly"):
        raise BadRequestException(
            detail="Invalid billing cycle. Choose monthly or yearly."
        )
    if payload.plan == "ENTERPRISE":
        raise BadRequestException(
            detail="Enterprise plans require custom pricing. Please contact sales."
        )

    result = await create_subscription(
        org_id=ctx.org_id,
        plan=payload.plan,
        billing_cycle=payload.billing_cycle,
        db=db,
    )

    return SubscribeResponse(
        order_id=result["order_id"],
        amount=result["amount"],
        currency=result["currency"],
        key_id=result["key_id"],
    )


@router.post("/verify-payment", response_model=VerifySubscriptionResponse)
async def verify_subscription_payment(
    payload: VerifySubscriptionRequest,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["SUPER_ADMIN", "MANAGER"])),
):
    """Verifies Razorpay payment signature. On success, activates subscription."""
    is_valid = await verify_razorpay_signature(
        order_id=payload.razorpay_order_id,
        payment_id=payload.razorpay_payment_id,
        signature=payload.razorpay_signature,
    )

    if not is_valid:
        raise BadRequestException(
            detail="Payment verification failed. Signature mismatch."
        )

    await activate_subscription(
        org_id=ctx.org_id,
        plan=payload.plan,
        db=db,
    )

    return VerifySubscriptionResponse(
        success=True,
        plan=payload.plan,
        message=f"Subscription activated. Your organization is now on the {payload.plan} plan.",
    )


@router.post("/cancel", response_model=CancelSubscriptionResponse)
async def cancel_org_subscription(
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["SUPER_ADMIN"])),
):
    """Cancels subscription, reverts to FREE plan. Only SUPER_ADMIN."""
    await cancel_subscription(org_id=ctx.org_id, db=db)

    return CancelSubscriptionResponse(
        success=True,
        message="Subscription cancelled. Your organization has been reverted to the Free plan.",
    )
