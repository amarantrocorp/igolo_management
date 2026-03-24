from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.budget import BudgetCategory

# ---------------------------------------------------------------------------
# Budget Line Items
# ---------------------------------------------------------------------------


class BudgetLineItemCreate(BaseModel):
    category: BudgetCategory
    description: Optional[str] = None
    budgeted_amount: Decimal


class BudgetLineItemUpdate(BaseModel):
    description: Optional[str] = None
    budgeted_amount: Optional[Decimal] = None


class BudgetLineItemResponse(BaseModel):
    id: UUID
    project_id: UUID
    category: BudgetCategory
    description: Optional[str]
    budgeted_amount: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Budget vs Actual
# ---------------------------------------------------------------------------


class BudgetVsActualItem(BaseModel):
    category: str
    budgeted: Decimal
    actual: Decimal
    variance: Decimal
    variance_pct: float
    alert: bool


class BudgetVsActualResponse(BaseModel):
    project_id: UUID
    line_items: List[BudgetVsActualItem]
    total_budgeted: Decimal
    total_actual: Decimal
    total_variance: Decimal
