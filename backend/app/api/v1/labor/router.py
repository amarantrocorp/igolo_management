from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, role_required
from app.db.session import get_db
from app.models.user import User
from app.schemas.labor import (
    AttendanceLogCreate,
    AttendanceLogResponse,
    LaborTeamCreate,
    LaborTeamResponse,
    LaborTeamUpdate,
    PayrollSummary,
    WorkerCreate,
    WorkerResponse,
)
from app.services import labor_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Labor Teams CRUD
# ---------------------------------------------------------------------------


@router.post(
    "/teams", response_model=LaborTeamResponse, status_code=status.HTTP_201_CREATED
)
async def create_labor_team(
    payload: LaborTeamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Create a new labor team."""
    team = await labor_service.create_labor_team(data=payload, db=db)
    return team


@router.get(
    "/teams", response_model=list[LaborTeamResponse], status_code=status.HTTP_200_OK
)
async def list_labor_teams(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List labor teams with pagination."""
    teams = await labor_service.get_labor_teams(db=db, skip=skip, limit=limit)
    return teams


@router.get(
    "/teams/{team_id}", response_model=LaborTeamResponse, status_code=status.HTTP_200_OK
)
async def get_labor_team(
    team_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single labor team with its workers."""
    team = await labor_service.get_team(team_id=team_id, db=db)
    return team


@router.put(
    "/teams/{team_id}", response_model=LaborTeamResponse, status_code=status.HTTP_200_OK
)
async def update_labor_team(
    team_id: UUID,
    payload: LaborTeamUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Update an existing labor team."""
    team = await labor_service.update_team(team_id=team_id, data=payload, db=db)
    return team


# ---------------------------------------------------------------------------
# Workers
# ---------------------------------------------------------------------------


@router.post(
    "/teams/{team_id}/workers",
    response_model=WorkerResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_worker(
    team_id: UUID,
    payload: WorkerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Add a worker to a labor team."""
    worker = await labor_service.add_worker(team_id=team_id, data=payload, db=db)
    return worker


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------


@router.post(
    "/attendance",
    response_model=AttendanceLogResponse,
    status_code=status.HTTP_201_CREATED,
)
async def log_attendance(
    payload: AttendanceLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        role_required(["SUPERVISOR", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """Log daily attendance for a labor team on a project sprint.
    Automatically calculates cost as workers_present * daily_rate * (total_hours / 8).
    """
    log = await labor_service.log_attendance(
        data=payload, user_id=current_user.id, db=db
    )
    return log


# ---------------------------------------------------------------------------
# Payroll
# ---------------------------------------------------------------------------


@router.get(
    "/payroll",
    response_model=list[PayrollSummary],
    status_code=status.HTTP_200_OK,
)
async def get_payroll_summary(
    project_id: Optional[UUID] = Query(None),
    week_start: date = Query(...),
    week_end: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Get weekly payroll summary grouped by team. Optionally filter by project
    and date range (week_start to week_end)."""
    summary = await labor_service.get_weekly_payroll(
        project_id=project_id,
        week_start=week_start,
        week_end=week_end,
        db=db,
    )
    return summary


@router.post(
    "/payroll/approve",
    response_model=list[AttendanceLogResponse],
    status_code=status.HTTP_200_OK,
)
async def approve_payroll(
    project_id: UUID = Query(...),
    team_id: UUID = Query(...),
    week_start: date = Query(...),
    week_end: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Approve and pay a weekly payroll batch for a specific team on a project.
    Finds all pending attendance logs matching the filters, then approves them
    as a batch. Enforces the spending lock: checks project wallet balance before
    marking attendance logs as APPROVED and creating an OUTFLOW transaction."""
    logs = await labor_service.approve_payroll_by_filters(
        project_id=project_id,
        team_id=team_id,
        week_start=week_start,
        week_end=week_end,
        user_id=current_user.id,
        db=db,
    )
    return logs
