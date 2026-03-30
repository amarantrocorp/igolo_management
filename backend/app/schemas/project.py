from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.finance import TransactionCategory, TransactionSource, TransactionStatus
from app.models.project import ProjectStatus, SprintStatus, VOStatus
from app.schemas.crm import ClientResponse


class ProjectConvert(BaseModel):
    quotation_id: Optional[UUID] = None  # Auto-set from URL path param
    start_date: date
    name: Optional[str] = None  # Auto-generated from lead/client name if not provided
    site_address: Optional[str] = None
    site_latitude: Optional[float] = Field(None, ge=-90, le=90)
    site_longitude: Optional[float] = Field(None, ge=-180, le=180)
    manager_id: Optional[UUID] = None
    supervisor_id: Optional[UUID] = None


class ProjectUpdate(BaseModel):
    status: Optional[ProjectStatus] = None
    manager_id: Optional[UUID] = None
    supervisor_id: Optional[UUID] = None
    site_address: Optional[str] = None
    site_latitude: Optional[float] = Field(None, ge=-90, le=90)
    site_longitude: Optional[float] = Field(None, ge=-180, le=180)
    geofence_radius_meters: Optional[int] = Field(None, ge=50, le=5000)
    cover_image_url: Optional[str] = None


class SprintResponse(BaseModel):
    id: UUID
    project_id: UUID
    sequence_order: int
    name: str
    status: SprintStatus
    start_date: date
    end_date: date
    dependency_sprint_id: Optional[UUID]
    notes: Optional[str]
    planned_quantity: Optional[float] = None
    executed_quantity: Optional[float] = None
    quantity_unit: Optional[str] = None
    completion_percentage: float = 0.0

    model_config = {"from_attributes": True}


class SprintUpdate(BaseModel):
    status: Optional[SprintStatus] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None
    planned_quantity: Optional[float] = None
    executed_quantity: Optional[float] = None
    quantity_unit: Optional[str] = None
    completion_percentage: Optional[float] = None


class WalletSummary(BaseModel):
    total_agreed_value: Decimal
    total_received: Decimal
    total_spent: Decimal
    pending_approvals: Decimal

    model_config = {"from_attributes": True}


class WalletResponse(BaseModel):
    project_id: UUID
    total_agreed_value: Decimal
    total_received: Decimal
    total_spent: Decimal
    current_balance: Decimal
    pending_approvals: Decimal

    model_config = {"from_attributes": True}


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    client_id: UUID
    client: Optional[ClientResponse] = None
    accepted_quotation_id: UUID
    status: ProjectStatus
    start_date: date
    expected_end_date: Optional[date]
    total_project_value: Decimal
    manager_id: Optional[UUID]
    supervisor_id: Optional[UUID]
    site_address: Optional[str]
    site_latitude: Optional[float] = None
    site_longitude: Optional[float] = None
    geofence_radius_meters: int = 500
    cover_image_url: Optional[str] = None
    sprints: List[SprintResponse] = []
    wallet: Optional[WalletSummary] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class VariationOrderCreate(BaseModel):
    description: str
    additional_cost: Decimal = Field(..., ge=0, le=9999999999)
    linked_sprint_id: Optional[UUID] = None
    supporting_doc_url: Optional[str] = None


class VariationOrderUpdate(BaseModel):
    status: Optional[VOStatus] = None
    description: Optional[str] = None
    linked_sprint_id: Optional[UUID] = None
    supporting_doc_url: Optional[str] = None


class VariationOrderResponse(BaseModel):
    id: UUID
    project_id: UUID
    description: str
    additional_cost: Decimal
    status: VOStatus
    linked_sprint_id: Optional[UUID]
    requested_by_id: UUID
    supporting_doc_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionCreate(BaseModel):
    amount: Decimal = Field(..., ge=0, le=9999999999)
    description: str
    source: TransactionSource
    category: TransactionCategory
    reference_id: Optional[str] = None
    proof_doc_url: Optional[str] = None


class TransactionResponse(BaseModel):
    id: UUID
    project_id: UUID
    category: TransactionCategory
    source: TransactionSource
    amount: Decimal
    description: Optional[str]
    reference_id: Optional[str]
    proof_doc_url: Optional[str]
    status: TransactionStatus
    recorded_by_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectAssignmentCreate(BaseModel):
    user_id: UUID
    role: str  # "SUPERVISOR", "MANAGER", "BDE", "SALES"


class ProjectAssignmentResponse(BaseModel):
    id: UUID
    project_id: UUID
    user_id: UUID
    user_name: str = ""
    user_email: str = ""
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DailyLogCreate(BaseModel):
    sprint_id: UUID
    date: date
    notes: str
    blockers: Optional[str] = None
    image_urls: Optional[List[str]] = None
    visible_to_client: bool = False


class DailyLogResponse(BaseModel):
    id: UUID
    project_id: UUID
    sprint_id: UUID
    logged_by_id: UUID
    date: date
    notes: str
    blockers: Optional[str]
    image_urls: Optional[List[str]]
    visible_to_client: bool
    created_at: datetime

    model_config = {"from_attributes": True}
