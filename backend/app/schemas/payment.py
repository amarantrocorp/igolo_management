"""Pydantic schemas for Razorpay payment gateway integration."""

from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CreateOrderRequest(BaseModel):
    project_id: UUID
    amount: Decimal = Field(..., gt=0, description="Amount in INR (rupees)")
    description: Optional[str] = None


class CreateOrderResponse(BaseModel):
    razorpay_order_id: str
    amount: int = Field(..., description="Amount in paise (INR * 100)")
    currency: str = "INR"
    key_id: str = Field(
        ..., description="Razorpay publishable key for frontend checkout"
    )


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    project_id: UUID
    amount: Decimal = Field(..., gt=0, description="Amount in INR (rupees)")
    description: Optional[str] = None


class VerifyPaymentResponse(BaseModel):
    success: bool
    transaction_id: Optional[UUID] = None
    message: str
