from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CheckInRequest(BaseModel):
    project_id: UUID
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    notes: Optional[str] = Field(None, max_length=500)


class CheckOutRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class CheckInResponse(BaseModel):
    id: UUID
    user_id: UUID
    project_id: UUID
    project_name: Optional[str] = None
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    check_in_latitude: float
    check_in_longitude: float
    check_out_latitude: Optional[float] = None
    check_out_longitude: Optional[float] = None
    distance_from_site_meters: float
    status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
