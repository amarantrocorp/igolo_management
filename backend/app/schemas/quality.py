from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, model_validator

from app.models.quality import (
    ChecklistItemStatus,
    InspectionStatus,
    SnagSeverity,
    SnagStatus,
)

# ---------------------------------------------------------------------------
# Inspection Items
# ---------------------------------------------------------------------------


class InspectionItemCreate(BaseModel):
    description: str
    status: ChecklistItemStatus = ChecklistItemStatus.PENDING
    photo_url: Optional[str] = None
    notes: Optional[str] = None


class InspectionItemUpdate(BaseModel):
    status: Optional[ChecklistItemStatus] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = None


class InspectionItemResponse(BaseModel):
    id: UUID
    inspection_id: UUID
    description: str
    status: ChecklistItemStatus
    photo_url: Optional[str]
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Inspections
# ---------------------------------------------------------------------------


class InspectionCreate(BaseModel):
    project_id: UUID
    sprint_id: UUID
    title: str
    inspection_date: date
    notes: Optional[str] = None
    checklist_items: List[InspectionItemCreate] = []


class InspectionResponse(BaseModel):
    id: UUID
    project_id: UUID
    sprint_id: UUID
    inspector_id: UUID
    inspector_name: str = ""
    title: str
    status: InspectionStatus
    inspection_date: date
    notes: Optional[str]
    overall_score: Optional[float]
    checklist_items: List[InspectionItemResponse] = []
    total_items: int = 0
    pass_count: int = 0
    fail_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def compute_counts(cls, data):  # type: ignore[override]
        if hasattr(data, "inspector") and data.inspector is not None:
            data.inspector_name = data.inspector.full_name
        if hasattr(data, "checklist_items") and data.checklist_items is not None:
            items = list(data.checklist_items)
            data.total_items = len(items)
            data.pass_count = sum(
                1 for i in items if i.status == ChecklistItemStatus.PASS
            )
            data.fail_count = sum(
                1 for i in items if i.status == ChecklistItemStatus.FAIL
            )
        return data


# ---------------------------------------------------------------------------
# Snag Items
# ---------------------------------------------------------------------------


class SnagItemCreate(BaseModel):
    project_id: UUID
    sprint_id: Optional[UUID] = None
    inspection_id: Optional[UUID] = None
    description: str
    severity: SnagSeverity
    photo_url: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
    due_date: Optional[date] = None


class SnagItemUpdate(BaseModel):
    status: Optional[SnagStatus] = None
    severity: Optional[SnagSeverity] = None
    assigned_to_id: Optional[UUID] = None
    due_date: Optional[date] = None
    resolution_notes: Optional[str] = None
    photo_url: Optional[str] = None


class SnagItemResponse(BaseModel):
    id: UUID
    project_id: UUID
    sprint_id: Optional[UUID]
    inspection_id: Optional[UUID]
    description: str
    severity: SnagSeverity
    status: SnagStatus
    photo_url: Optional[str]
    assigned_to_id: Optional[UUID]
    assigned_to_name: str = ""
    due_date: Optional[date]
    resolution_notes: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extract_assignee(cls, data):  # type: ignore[override]
        if hasattr(data, "assigned_to") and data.assigned_to is not None:
            data.assigned_to_name = data.assigned_to.full_name
        return data


# ---------------------------------------------------------------------------
# Quality Summary
# ---------------------------------------------------------------------------


class QualitySummaryResponse(BaseModel):
    total_inspections: int
    completed_inspections: int
    avg_score: Optional[float]
    total_snags: int
    open_snags: int
    critical_snags: int
    resolved_snags: int
