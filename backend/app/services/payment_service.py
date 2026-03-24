"""Razorpay payment gateway integration service.

Handles creating Razorpay orders and verifying payment signatures.
On successful verification, an INFLOW transaction is created and the
project wallet is credited immediately (CLEARED status).
"""

from decimal import Decimal
from uuid import UUID

import razorpay
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.finance import (
    ProjectWallet,
    Transaction,
    TransactionCategory,
    TransactionSource,
    TransactionStatus,
)
from app.models.project import Project
from sqlalchemy import select


def get_razorpay_client() -> razorpay.Client:
    """Return an authenticated Razorpay client instance."""
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise BadRequestException(
            detail="Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
        )
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


async def create_razorpay_order(
    amount_inr: Decimal,
    project_id: UUID,
    receipt: str,
) -> dict:
    """Create a Razorpay order for client payment.

    Args:
        amount_inr: Amount in INR (rupees).
        project_id: The project this payment is for.
        receipt: A short receipt identifier (e.g. "pay_<project_id_short>").

    Returns:
        Razorpay order dict containing ``id``, ``amount``, ``currency``, etc.
    """
    client = get_razorpay_client()
    order = client.order.create({
        "amount": int(amount_inr * 100),  # Razorpay uses paise
        "currency": "INR",
        "receipt": receipt,
        "notes": {"project_id": str(project_id)},
    })
    return order


async def verify_razorpay_payment(
    order_id: str,
    payment_id: str,
    signature: str,
) -> bool:
    """Verify a Razorpay payment signature.

    Returns True if verification succeeds, False otherwise.
    """
    client = get_razorpay_client()
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        })
        return True
    except razorpay.errors.SignatureVerificationError:
        return False


async def process_successful_payment(
    project_id: UUID,
    amount: Decimal,
    razorpay_payment_id: str,
    razorpay_order_id: str,
    user_id: UUID,
    org_id: UUID,
    description: str | None,
    db: AsyncSession,
) -> Transaction:
    """Record a verified Razorpay payment as a CLEARED INFLOW transaction
    and credit the project wallet.

    Args:
        project_id: Project receiving the payment.
        amount: Payment amount in INR.
        razorpay_payment_id: Razorpay payment ID (for reference).
        razorpay_order_id: Razorpay order ID (for reference).
        user_id: The user who initiated the payment.
        org_id: The organization scope.
        description: Optional payment description.
        db: Database session.

    Returns:
        The created Transaction record.
    """
    # Validate project exists and belongs to org
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project or project.org_id != org_id:
        raise NotFoundException(detail=f"Project '{project_id}' not found")

    # Get or validate wallet
    wallet_result = await db.execute(
        select(ProjectWallet).where(ProjectWallet.project_id == project_id)
    )
    wallet = wallet_result.scalar_one_or_none()
    if not wallet:
        raise NotFoundException(detail=f"Wallet for project '{project_id}' not found")

    # Create INFLOW transaction as CLEARED (Razorpay already confirmed payment)
    transaction = Transaction(
        project_id=project_id,
        category=TransactionCategory.INFLOW,
        source=TransactionSource.CLIENT,
        amount=amount,
        description=description or f"Razorpay payment {razorpay_payment_id}",
        reference_id=f"rzp:{razorpay_payment_id}|order:{razorpay_order_id}",
        recorded_by_id=user_id,
        status=TransactionStatus.CLEARED,
        org_id=org_id,
    )
    db.add(transaction)

    # Credit wallet immediately since payment is verified by Razorpay
    wallet.total_received += amount
    db.add(wallet)

    await db.commit()
    await db.refresh(transaction)

    # Send notification about payment received
    try:
        from app.models.notification import NotificationType
        from app.models.user import UserRole
        from app.services.notification_service import notify_role

        await notify_role(
            db=db,
            role=UserRole.MANAGER,
            org_id=org_id,
            type=NotificationType.PAYMENT_RECEIVED,
            title="Payment Received via Razorpay",
            body=f"Rs. {amount} received for project via Razorpay (Ref: {razorpay_payment_id}).",
            action_url=f"/dashboard/admin/finance",
        )
    except Exception:
        pass  # Non-critical: don't fail payment on notification error

    return transaction
