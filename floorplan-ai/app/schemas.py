from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    image_url: str = Field(..., description="URL or path to the uploaded floor plan image")


class DetectedRoom(BaseModel):
    name: str = Field(..., description="Human-readable room name, e.g. 'Master Bedroom'")
    matched_key: str | None = Field(
        None,
        description="Matched key from predefined rooms: LIVING_ROOM, DINING_AREA, KITCHEN, "
        "UTILITY, MASTER_BEDROOM, GUEST_BEDROOM, KIDS_BEDROOM, POOJA_ROOM, "
        "FOYER, BALCONY, STUDY_ROOM, TV_UNIT_AREA, BAR_UNIT, SHOE_RACK_AREA",
    )
    length_ft: float | None = Field(None, description="Room length in feet")
    breadth_ft: float | None = Field(None, description="Room breadth/width in feet")
    height_ft: float = Field(10.0, description="Room height in feet (default 10)")
    area_sqft: float | None = Field(None, description="Calculated or estimated area in sqft")
    suggested_items: list[str] = Field(
        default_factory=list,
        description="Suggested interior item keys for this room",
    )


class FloorPlanAnalysis(BaseModel):
    property_type: str | None = Field(
        None,
        description="Detected property type: APARTMENT, VILLA, INDEPENDENT_HOUSE, "
        "PENTHOUSE, STUDIO, OFFICE, RETAIL",
    )
    bhk_config: str | None = Field(None, description="e.g. '2 BHK', '3 BHK'")
    total_carpet_area_sqft: float | None = Field(None, description="Total carpet area in sqft")
    rooms: list[DetectedRoom] = Field(default_factory=list)
    suggested_scope: list[str] = Field(
        default_factory=list,
        description="Suggested scope of work items",
    )
    suggested_package: str | None = Field(
        None,
        description="Suggested package: BASIC, STANDARD, PREMIUM, LUXURY",
    )
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="Overall confidence 0-1")
    notes: str | None = Field(None, description="Any caveats or observations from AI")


class AnalyzeResponse(BaseModel):
    success: bool = True
    data: FloorPlanAnalysis


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: str | None = None
