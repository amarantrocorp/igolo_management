"""Razorpay subscription management for SaaS billing."""

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.organization import Organization

logger = logging.getLogger(__name__)

PLAN_PRICES = {
    "STARTER": {"monthly": 99900, "yearly": 999900},  # paise
    "PRO": {"monthly": 299900, "yearly": 2999900},
    "ENTERPRISE": {"monthly": 0, "yearly": 0},  # custom pricing
}


async def create_subscription(
    org_id: UUID, plan: str, billing_cycle: str, db: AsyncSession
) -> dict:
    """Create a Razorpay order for a subscription upgrade.

    Falls back to a dummy order when Razorpay keys are not configured,
    allowing local development without a payment gateway.
    """
    import uuid as _uuid

    price = PLAN_PRICES.get(plan, {}).get(billing_cycle)
    if not price:
        raise ValueError(f"Invalid plan '{plan}' or billing cycle '{billing_cycle}'")

    # Bypass Razorpay when keys are missing or set to placeholders (local dev)
    _placeholder = {"", "your_razorpay_key_id", "your_razorpay_key_secret"}
    if (
        not settings.RAZORPAY_KEY_ID
        or not settings.RAZORPAY_KEY_SECRET
        or settings.RAZORPAY_KEY_ID in _placeholder
        or settings.RAZORPAY_KEY_SECRET in _placeholder
        or not settings.RAZORPAY_KEY_ID.startswith("rzp_")
    ):
        logger.warning("Razorpay not configured — returning dummy order for local dev")
        return {
            "order_id": f"dummy_order_{_uuid.uuid4().hex[:16]}",
            "amount": price,
            "currency": "INR",
            "key_id": "rzp_dummy_local",
            "plan": plan,
            "billing_cycle": billing_cycle,
        }

    import razorpay

    client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )

    order = client.order.create(
        {
            "amount": price,
            "currency": "INR",
            "receipt": f"sub-{org_id}-{plan}",
            "notes": {
                "org_id": str(org_id),
                "plan": plan,
                "billing_cycle": billing_cycle,
            },
        }
    )

    return {
        "order_id": order["id"],
        "amount": price,
        "currency": "INR",
        "key_id": settings.RAZORPAY_KEY_ID,
        "plan": plan,
        "billing_cycle": billing_cycle,
    }


async def verify_razorpay_signature(
    order_id: str, payment_id: str, signature: str
) -> bool:
    """Verify the Razorpay payment signature.

    Auto-approves dummy orders created during local dev (no Razorpay keys).
    """
    _placeholder = {"", "your_razorpay_key_id", "your_razorpay_key_secret"}
    _keys_missing = (
        not settings.RAZORPAY_KEY_ID
        or not settings.RAZORPAY_KEY_SECRET
        or settings.RAZORPAY_KEY_ID in _placeholder
        or settings.RAZORPAY_KEY_SECRET in _placeholder
        or not settings.RAZORPAY_KEY_ID.startswith("rzp_")
    )
    if _keys_missing:
        # Accept dummy orders in local dev
        if order_id.startswith("dummy_order_"):
            logger.warning("Auto-verifying dummy order %s for local dev", order_id)
            return True
        raise RuntimeError("Razorpay not configured")

    import razorpay

    client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )

    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
            }
        )
        return True
    except razorpay.errors.SignatureVerificationError:
        return False


async def activate_subscription(org_id: UUID, plan: str, db: AsyncSession):
    """Activate a subscription after successful payment."""
    from app.core.plan_limits import PLAN_LIMITS

    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["FREE"])

    await db.execute(
        update(Organization)
        .where(Organization.id == org_id)
        .values(
            plan_tier=plan,
            subscription_status="ACTIVE",
            trial_expires_at=None,
            max_users=limits["max_users"],
            max_projects=limits["max_projects"],
        )
    )
    await db.commit()
    logger.info("Subscription activated: org=%s plan=%s", org_id, plan)


async def cancel_subscription(org_id: UUID, db: AsyncSession):
    """Cancel subscription, revert to FREE at end of billing period."""
    from app.core.plan_limits import PLAN_LIMITS

    free_limits = PLAN_LIMITS["FREE"]

    await db.execute(
        update(Organization)
        .where(Organization.id == org_id)
        .values(
            plan_tier="FREE",
            subscription_status="CANCELLED",
            max_users=free_limits["max_users"],
            max_projects=free_limits["max_projects"],
        )
    )
    await db.commit()
    logger.info("Subscription cancelled: org=%s", org_id)


async def suspend_org(org_id: UUID, db: AsyncSession):
    """Suspend an org (trial expired or payment failed)."""
    await db.execute(
        update(Organization)
        .where(Organization.id == org_id)
        .values(subscription_status="SUSPENDED")
    )
    await db.commit()
    logger.info("Organization suspended: org=%s", org_id)


async def check_trial_expiry(db: AsyncSession) -> list[dict]:
    """Find orgs with expired trials and suspend them."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Organization).where(
            Organization.subscription_status == "TRIAL",
            Organization.trial_expires_at != None,  # noqa: E711
            Organization.trial_expires_at < now,
        )
    )
    expired = result.scalars().all()

    suspended = []
    for org in expired:
        org.subscription_status = "SUSPENDED"
        suspended.append({"org_id": str(org.id), "name": org.name})

    if suspended:
        await db.commit()
        logger.info("Suspended %d orgs with expired trials", len(suspended))

    return suspended
