"""Razorpay payment gateway endpoints.

POST /payments/create-order  — Create a Razorpay order for the frontend checkout popup.
POST /payments/verify        — Verify a completed Razorpay payment and credit the project wallet.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.security import AuthContext, get_auth_context, role_required
from app.db.session import get_db
from app.models.project import Project
from app.schemas.payment import (
    CreateOrderRequest,
    CreateOrderResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)
from app.services import payment_service

router = APIRouter()


@router.post(
    "/create-order",
    response_model=CreateOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_payment_order(
    payload: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(
        role_required(["CLIENT", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Create a Razorpay order. Returns the order_id and publishable key_id
    so the frontend can open the Razorpay checkout popup."""

    # Validate project exists within org
    result = await db.execute(
        select(Project).where(Project.id == payload.project_id)
    )
    project = result.scalar_one_or_none()
    if not project or project.org_id != ctx.org_id:
        raise NotFoundException(detail=f"Project '{payload.project_id}' not found")

    receipt = f"pay_{str(payload.project_id)[:8]}"
    order = await payment_service.create_razorpay_order(
        amount_inr=payload.amount,
        project_id=payload.project_id,
        receipt=receipt,
    )

    return CreateOrderResponse(
        razorpay_order_id=order["id"],
        amount=order["amount"],
        currency=order["currency"],
        key_id=settings.RAZORPAY_KEY_ID,
    )


@router.post(
    "/verify",
    response_model=VerifyPaymentResponse,
    status_code=status.HTTP_200_OK,
)
async def verify_payment(
    payload: VerifyPaymentRequest,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(
        role_required(["CLIENT", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Verify Razorpay payment signature and, on success, record the
    transaction as CLEARED INFLOW and credit the project wallet."""

    is_valid = await payment_service.verify_razorpay_payment(
        order_id=payload.razorpay_order_id,
        payment_id=payload.razorpay_payment_id,
        signature=payload.razorpay_signature,
    )

    if not is_valid:
        raise BadRequestException(
            detail="Payment verification failed. Signature mismatch."
        )

    transaction = await payment_service.process_successful_payment(
        project_id=payload.project_id,
        amount=payload.amount,
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_order_id=payload.razorpay_order_id,
        user_id=ctx.user.id,
        org_id=ctx.org_id,
        description=payload.description,
        db=db,
    )

    return VerifyPaymentResponse(
        success=True,
        transaction_id=transaction.id,
        message="Payment verified and recorded successfully.",
    )
