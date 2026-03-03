from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.finance import TransactionCategory, TransactionSource, TransactionStatus


class TransactionCreate(BaseModel):
    project_id: UUID
    category: TransactionCategory
    source: TransactionSource
    amount: Decimal
    description: Optional[str] = None
    reference_id: Optional[str] = None
    related_po_id: Optional[UUID] = None
    related_labor_log_id: Optional[UUID] = None
    related_vo_id: Optional[UUID] = None
    proof_doc_url: Optional[str] = None


class TransactionUpdate(BaseModel):
    status: Optional[TransactionStatus] = None
    description: Optional[str] = None


class TransactionResponse(BaseModel):
    id: UUID
    project_id: UUID
    category: TransactionCategory
    source: TransactionSource
    amount: Decimal
    description: Optional[str]
    reference_id: Optional[str]
    related_po_id: Optional[UUID]
    related_labor_log_id: Optional[UUID]
    related_vo_id: Optional[UUID]
    recorded_by_id: UUID
    proof_doc_url: Optional[str]
    status: TransactionStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class WalletResponse(BaseModel):
    project_id: UUID
    total_agreed_value: Decimal
    total_received: Decimal
    total_spent: Decimal
    pending_approvals: Decimal
    current_balance: Decimal
    effective_balance: Decimal

    model_config = {"from_attributes": True}


class FinancialHealthResponse(BaseModel):
    project_id: UUID
    total_agreed_value: Decimal
    total_received: Decimal
    total_spent: Decimal
    pending_approvals: Decimal
    current_balance: Decimal
    effective_balance: Decimal
    can_spend_more: bool
    estimated_margin_percent: float


# ── Analytics / Aggregation Schemas ──────────────────────────────────────────


class TransactionSummaryResponse(BaseModel):
    total_inflow: Decimal
    total_outflow: Decimal
    net_balance: Decimal
    pending_inflow: Decimal
    pending_outflow: Decimal
    pending_count: int
    total_count: int


class AggregationBucket(BaseModel):
    period: str
    inflow: Decimal
    outflow: Decimal
    net: Decimal


class TransactionAggregationResponse(BaseModel):
    group_by: str
    buckets: list[AggregationBucket]


class SourceBreakdownItem(BaseModel):
    source: str
    total_inflow: Decimal
    total_outflow: Decimal


class ProjectBreakdownItem(BaseModel):
    project_id: UUID
    project_name: str
    total_inflow: Decimal
    total_outflow: Decimal
    net: Decimal
