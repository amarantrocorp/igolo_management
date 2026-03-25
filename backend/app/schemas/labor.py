from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.labor import (
    AttendanceStatus,
    PaymentModel,
    SkillLevel,
    Specialization,
)


class WorkerCreate(BaseModel):
    name: str
    skill_level: SkillLevel = SkillLevel.HELPER
    daily_rate: Optional[Decimal] = None
    phone: Optional[str] = None


class WorkerResponse(BaseModel):
    id: UUID
    team_id: UUID
    name: str
    skill_level: SkillLevel
    daily_rate: Optional[Decimal]
    phone: Optional[str]

    model_config = {"from_attributes": True}


class LaborTeamCreate(BaseModel):
    name: str
    leader_name: str
    contact_number: Optional[str] = None
    specialization: Specialization
    payment_model: PaymentModel
    default_daily_rate: Decimal
    supervisor_id: Optional[UUID] = None


class LaborTeamUpdate(BaseModel):
    name: Optional[str] = None
    leader_name: Optional[str] = None
    contact_number: Optional[str] = None
    specialization: Optional[Specialization] = None
    payment_model: Optional[PaymentModel] = None
    default_daily_rate: Optional[Decimal] = None
    supervisor_id: Optional[UUID] = None


class LaborTeamResponse(BaseModel):
    id: UUID
    name: str
    leader_name: str
    contact_number: Optional[str]
    specialization: Specialization
    payment_model: PaymentModel
    default_daily_rate: Decimal
    supervisor_id: Optional[UUID]
    workers: List[WorkerResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class AttendanceLogCreate(BaseModel):
    project_id: UUID
    sprint_id: UUID
    team_id: UUID
    date: date
    workers_present: int = Field(..., ge=1, le=200)
    total_hours: float = Field(default=8.0, ge=0.01, le=24)
    site_photo_url: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: date) -> date:
        from datetime import timedelta

        today = date.today()
        if v > today:
            raise ValueError("Attendance date cannot be in the future")
        if v < today - timedelta(days=365):
            raise ValueError("Attendance date cannot be more than 1 year in the past")
        return v


class AttendanceLogResponse(BaseModel):
    id: UUID
    project_id: UUID
    sprint_id: UUID
    team_id: UUID
    date: date
    workers_present: int
    total_hours: float
    calculated_cost: Decimal
    status: AttendanceStatus
    site_photo_url: Optional[str]
    notes: Optional[str]
    logged_by_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class PayrollEntry(BaseModel):
    team_id: UUID
    team_name: str
    specialization: str
    project_id: UUID
    project_name: str
    days_worked: int
    total_workers: int
    total_hours: float
    calculated_cost: Decimal
    status: str


class PayrollWeeklySummary(BaseModel):
    entries: List[PayrollEntry]
    total_cost: Decimal
    total_approved: Decimal
    total_pending: Decimal
