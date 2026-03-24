"""Pydantic schemas for subscription billing endpoints."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class PlanFeatures(BaseModel):
    max_users: int
    max_projects: int
    max_leads: int
    storage_gb: int
    whatsapp: bool
    ai_analysis: bool


class PlanInfo(BaseModel):
    name: str
    price_monthly: int  # in paise
    price_yearly: int  # in paise
    features: PlanFeatures


class SubscribeRequest(BaseModel):
    plan: str  # STARTER, PRO, ENTERPRISE
    billing_cycle: str  # monthly, yearly


class SubscribeResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: str


class VerifySubscriptionRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str


class VerifySubscriptionResponse(BaseModel):
    success: bool
    plan: str
    message: str


class BillingStatusResponse(BaseModel):
    plan: str
    status: str
    trial_expires_at: Optional[datetime] = None
    days_remaining: Optional[int] = None
    max_users: int
    max_projects: int
    current_users: int = 0
    current_projects: int = 0


class CancelSubscriptionResponse(BaseModel):
    success: bool
    message: str
