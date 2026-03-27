import math
from datetime import date, datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.checkin import CheckIn, CheckInStatus
from app.models.project import Project
from app.schemas.checkin import CheckInRequest, CheckOutRequest


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the distance in meters between two GPS coordinates
    using the Haversine formula.
    """
    R = 6_371_000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def check_in(
    data: CheckInRequest,
    user_id: UUID,
    org_id: UUID,
    db: AsyncSession,
) -> CheckIn:
    """Check in a user to a project site with geofence validation.

    1. Verify the project exists and has a location set.
    2. Calculate distance using Haversine formula.
    3. Reject if outside the geofence radius.
    4. Prevent double check-in (user already checked in today).
    5. Create and return the CheckIn record.
    """
    # 1. Fetch the project
    result = await db.execute(
        select(Project).where(
            Project.id == data.project_id,
            Project.org_id == org_id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise NotFoundException(detail=f"Project with id '{data.project_id}' not found")

    # 2. Verify project has location configured
    if project.site_latitude is None or project.site_longitude is None:
        raise BadRequestException(
            detail="Project site location (latitude/longitude) has not been set. "
            "A manager must configure the project location before check-ins are allowed."
        )

    # 3. Calculate distance from site
    distance = haversine_distance(
        data.latitude, data.longitude,
        project.site_latitude, project.site_longitude,
    )

    # 4. Enforce geofence
    if distance > project.geofence_radius_meters:
        raise BadRequestException(
            detail=f"You are {distance:.0f}m from the project site. "
            f"Check-in requires being within {project.geofence_radius_meters}m. "
            "Please move closer to the site and try again."
        )

    # 5. Prevent double check-in (active check-in for this user at any project)
    active_result = await db.execute(
        select(CheckIn).where(
            CheckIn.user_id == user_id,
            CheckIn.org_id == org_id,
            CheckIn.status == CheckInStatus.CHECKED_IN,
        )
    )
    active_checkin = active_result.scalar_one_or_none()
    if active_checkin:
        raise BadRequestException(
            detail="You already have an active check-in. "
            "Please check out first before checking in again."
        )

    # 6. Create CheckIn record
    checkin = CheckIn(
        user_id=user_id,
        project_id=data.project_id,
        check_in_latitude=data.latitude,
        check_in_longitude=data.longitude,
        distance_from_site_meters=round(distance, 2),
        notes=data.notes,
        status=CheckInStatus.CHECKED_IN,
        org_id=org_id,
    )
    db.add(checkin)
    await db.commit()
    await db.refresh(checkin)
    return checkin


async def check_out(
    checkin_id: UUID,
    data: CheckOutRequest,
    user_id: UUID,
    org_id: UUID,
    db: AsyncSession,
) -> CheckIn:
    """Check out from an active check-in.

    1. Find the active check-in belonging to the user.
    2. Set check_out_time, coordinates, and status.
    """
    result = await db.execute(
        select(CheckIn).where(
            CheckIn.id == checkin_id,
            CheckIn.user_id == user_id,
            CheckIn.org_id == org_id,
        )
    )
    checkin = result.scalar_one_or_none()
    if not checkin:
        raise NotFoundException(detail=f"Check-in with id '{checkin_id}' not found")

    if checkin.status == CheckInStatus.CHECKED_OUT:
        raise BadRequestException(detail="This check-in has already been checked out.")

    checkin.check_out_time = datetime.now(timezone.utc)
    checkin.check_out_latitude = data.latitude
    checkin.check_out_longitude = data.longitude
    checkin.status = CheckInStatus.CHECKED_OUT

    db.add(checkin)
    await db.commit()
    await db.refresh(checkin)
    return checkin


async def get_active_checkin(
    user_id: UUID,
    org_id: UUID,
    db: AsyncSession,
) -> Optional[CheckIn]:
    """Return the user's current active check-in (status=CHECKED_IN), if any."""
    result = await db.execute(
        select(CheckIn)
        .options(selectinload(CheckIn.project))
        .where(
            CheckIn.user_id == user_id,
            CheckIn.org_id == org_id,
            CheckIn.status == CheckInStatus.CHECKED_IN,
        )
    )
    return result.scalar_one_or_none()


async def get_checkins(
    org_id: UUID,
    db: AsyncSession,
    project_id: Optional[UUID] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    user_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[CheckIn]:
    """List check-ins with optional filters for project, date range, and user."""
    query = select(CheckIn).where(CheckIn.org_id == org_id)

    if project_id:
        query = query.where(CheckIn.project_id == project_id)
    if user_id:
        query = query.where(CheckIn.user_id == user_id)
    if date_from:
        query = query.where(CheckIn.check_in_time >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.where(
            CheckIn.check_in_time
            <= datetime.combine(date_to, datetime.max.time()).replace(tzinfo=timezone.utc)
        )

    query = query.order_by(CheckIn.check_in_time.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_today_checkins(
    org_id: UUID,
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
) -> List[CheckIn]:
    """List all check-ins for the organization from today."""
    today = date.today()
    return await get_checkins(
        org_id=org_id,
        db=db,
        date_from=today,
        date_to=today,
        skip=skip,
        limit=limit,
    )
