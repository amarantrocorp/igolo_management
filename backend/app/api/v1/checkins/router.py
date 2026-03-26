from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthContext, get_auth_context, get_tenant_session, role_required
from app.schemas.checkin import CheckInRequest, CheckInResponse, CheckOutRequest
from app.services import checkin_service

router = APIRouter()


def _to_response(checkin, project_name: Optional[str] = None) -> CheckInResponse:
    """Map a CheckIn ORM object to a CheckInResponse, injecting project_name."""
    return CheckInResponse(
        id=checkin.id,
        user_id=checkin.user_id,
        project_id=checkin.project_id,
        project_name=project_name,
        check_in_time=checkin.check_in_time,
        check_out_time=checkin.check_out_time,
        check_in_latitude=checkin.check_in_latitude,
        check_in_longitude=checkin.check_in_longitude,
        check_out_latitude=checkin.check_out_latitude,
        check_out_longitude=checkin.check_out_longitude,
        distance_from_site_meters=checkin.distance_from_site_meters,
        status=checkin.status.value if hasattr(checkin.status, "value") else checkin.status,
        notes=checkin.notes,
        created_at=checkin.created_at,
    )


@router.post(
    "/check-in",
    response_model=CheckInResponse,
    status_code=status.HTTP_201_CREATED,
)
async def check_in(
    payload: CheckInRequest,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(
        role_required(["SUPERVISOR", "MANAGER", "SUPER_ADMIN", "LABOR_LEAD"])
    ),
):
    """Check in to a project site. Validates the user is within the
    project's geofence radius before recording the check-in."""
    checkin = await checkin_service.check_in(
        data=payload,
        user_id=ctx.user.id,
        org_id=ctx.org_id,
        db=db,
    )
    return _to_response(checkin)


@router.post(
    "/check-out/{checkin_id}",
    response_model=CheckInResponse,
    status_code=status.HTTP_200_OK,
)
async def check_out(
    checkin_id: UUID,
    payload: CheckOutRequest,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(
        role_required(["SUPERVISOR", "MANAGER", "SUPER_ADMIN", "LABOR_LEAD"])
    ),
):
    """Check out from an active check-in."""
    checkin = await checkin_service.check_out(
        checkin_id=checkin_id,
        data=payload,
        user_id=ctx.user.id,
        org_id=ctx.org_id,
        db=db,
    )
    return _to_response(checkin)


@router.get(
    "/active",
    response_model=Optional[CheckInResponse],
    status_code=status.HTTP_200_OK,
)
async def get_active_checkin(
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Get the current user's active check-in, if any."""
    checkin = await checkin_service.get_active_checkin(
        user_id=ctx.user.id,
        org_id=ctx.org_id,
        db=db,
    )
    if not checkin:
        return None
    project_name = checkin.project.name if checkin.project else None
    return _to_response(checkin, project_name=project_name)


@router.get(
    "",
    response_model=list[CheckInResponse],
    status_code=status.HTTP_200_OK,
)
async def list_checkins(
    project_id: Optional[UUID] = Query(None),
    user_id: Optional[UUID] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(
        role_required(["SUPERVISOR", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """List check-ins with optional filters for project, user, and date range."""
    checkins = await checkin_service.get_checkins(
        org_id=ctx.org_id,
        db=db,
        project_id=project_id,
        date_from=date_from,
        date_to=date_to,
        user_id=user_id,
        skip=skip,
        limit=limit,
    )
    return [_to_response(c) for c in checkins]


@router.get(
    "/today",
    response_model=list[CheckInResponse],
    status_code=status.HTTP_200_OK,
)
async def get_today_checkins(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(
        role_required(["SUPERVISOR", "MANAGER", "SUPER_ADMIN"])
    ),
):
    """List all check-ins for the organization from today."""
    checkins = await checkin_service.get_today_checkins(
        org_id=ctx.org_id,
        db=db,
        skip=skip,
        limit=limit,
    )
    return [_to_response(c) for c in checkins]
