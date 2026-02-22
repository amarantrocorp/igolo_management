from decimal import Decimal
from datetime import date
from typing import List
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.finance import (
    ProjectWallet,
    Transaction,
    TransactionCategory,
    TransactionSource,
    TransactionStatus,
)
from app.models.labor import (
    AttendanceLog,
    AttendanceStatus,
    LaborTeam,
    Worker,
)
from app.schemas.labor import (
    AttendanceLogCreate,
    LaborTeamCreate,
    LaborTeamUpdate,
    WorkerCreate,
)
from app.services.finance_service import authorize_expense

# ---------------------------------------------------------------------------
# Labor Team Management
# ---------------------------------------------------------------------------


async def create_labor_team(data: LaborTeamCreate, db: AsyncSession) -> LaborTeam:
    """Create a new labor team."""
    team = LaborTeam(
        name=data.name,
        leader_name=data.leader_name,
        contact_number=data.contact_number,
        specialization=data.specialization,
        payment_model=data.payment_model,
        default_daily_rate=data.default_daily_rate,
        supervisor_id=data.supervisor_id,
    )
    db.add(team)
    await db.commit()
    # Re-fetch with workers eagerly loaded for the response model
    result = await db.execute(
        select(LaborTeam)
        .options(selectinload(LaborTeam.workers))
        .where(LaborTeam.id == team.id)
    )
    return result.scalar_one()


async def get_labor_teams(
    db: AsyncSession, skip: int = 0, limit: int = 50
) -> List[LaborTeam]:
    """Retrieve a paginated list of labor teams with their workers."""
    result = await db.execute(
        select(LaborTeam)
        .options(selectinload(LaborTeam.workers))
        .order_by(LaborTeam.name)
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_team(team_id: UUID, db: AsyncSession) -> LaborTeam:
    """Retrieve a single labor team by ID, including its workers."""
    result = await db.execute(
        select(LaborTeam)
        .options(selectinload(LaborTeam.workers))
        .where(LaborTeam.id == team_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise NotFoundException(detail=f"Labor team with id '{team_id}' not found")
    return team


async def update_team(
    team_id: UUID, data: LaborTeamUpdate, db: AsyncSession
) -> LaborTeam:
    """Update an existing labor team with partial data."""
    result = await db.execute(
        select(LaborTeam)
        .options(selectinload(LaborTeam.workers))
        .where(LaborTeam.id == team_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise NotFoundException(detail=f"Labor team with id '{team_id}' not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(team, field, value)

    db.add(team)
    await db.commit()
    # Re-fetch with workers eagerly loaded for the response model
    result = await db.execute(
        select(LaborTeam)
        .options(selectinload(LaborTeam.workers))
        .where(LaborTeam.id == team.id)
    )
    return result.scalar_one()


# ---------------------------------------------------------------------------
# Worker Management
# ---------------------------------------------------------------------------


async def add_worker(team_id: UUID, data: WorkerCreate, db: AsyncSession) -> Worker:
    """Add a worker to an existing labor team."""
    # Validate team exists
    team_result = await db.execute(select(LaborTeam).where(LaborTeam.id == team_id))
    team = team_result.scalar_one_or_none()
    if not team:
        raise NotFoundException(detail=f"Labor team with id '{team_id}' not found")

    worker = Worker(
        team_id=team_id,
        name=data.name,
        skill_level=data.skill_level,
        daily_rate=data.daily_rate,
        phone=data.phone,
    )
    db.add(worker)
    await db.commit()
    await db.refresh(worker)
    return worker


# ---------------------------------------------------------------------------
# Attendance & Cost Logging
# ---------------------------------------------------------------------------


async def log_attendance(
    data: AttendanceLogCreate, user_id: UUID, db: AsyncSession
) -> AttendanceLog:
    """Log daily attendance for a labor team on a project.

    Calculates cost as:
        calculated_cost = workers_present * daily_rate * (total_hours / 8)

    The daily_rate used is the team's default_daily_rate.
    """
    # Fetch the team to get the daily rate
    team_result = await db.execute(
        select(LaborTeam).where(LaborTeam.id == data.team_id)
    )
    team = team_result.scalar_one_or_none()
    if not team:
        raise NotFoundException(detail=f"Labor team with id '{data.team_id}' not found")

    # Calculate cost: workers * daily_rate * (hours / 8)
    calculated_cost = (
        Decimal(str(data.workers_present))
        * team.default_daily_rate
        * (Decimal(str(data.total_hours)) / Decimal("8"))
    )
    calculated_cost = calculated_cost.quantize(Decimal("0.01"))

    attendance = AttendanceLog(
        project_id=data.project_id,
        sprint_id=data.sprint_id,
        team_id=data.team_id,
        date=data.date,
        workers_present=data.workers_present,
        total_hours=data.total_hours,
        calculated_cost=calculated_cost,
        status=AttendanceStatus.PENDING,
        site_photo_url=data.site_photo_url,
        notes=data.notes,
        logged_by_id=user_id,
    )
    db.add(attendance)
    await db.commit()
    await db.refresh(attendance)
    return attendance


# ---------------------------------------------------------------------------
# Payroll
# ---------------------------------------------------------------------------


async def get_weekly_payroll(
    week_start: date,
    week_end: date,
    db: AsyncSession,
    project_id: UUID | None = None,
) -> dict:
    """Get weekly payroll summary grouped by team AND project.

    Queries ALL attendance statuses in the date range, groups by
    (team_id, project_id) so each row represents one team's work on
    one project, and returns enriched entries with totals.
    """
    from collections import defaultdict

    from app.models.crm import Client
    from app.models.project import Project

    query = (
        select(AttendanceLog)
        .options(
            selectinload(AttendanceLog.team),
            selectinload(AttendanceLog.project)
            .selectinload(Project.client)
            .selectinload(Client.user),
        )
        .where(
            AttendanceLog.date >= week_start,
            AttendanceLog.date <= week_end,
        )
    )

    if project_id is not None:
        query = query.where(AttendanceLog.project_id == project_id)

    result = await db.execute(query)
    logs = list(result.scalars().all())

    # Group by (team_id, project_id) for per-project-per-team rows
    grouped: dict = defaultdict(list)
    for log in logs:
        grouped[(log.team_id, log.project_id)].append(log)

    entries = []
    total_cost = Decimal("0.00")
    total_approved = Decimal("0.00")
    total_pending = Decimal("0.00")

    for (tid, pid), team_logs in grouped.items():
        team = team_logs[0].team
        proj = team_logs[0].project
        cost = sum((lg.calculated_cost for lg in team_logs), Decimal("0.00"))
        hours = sum(lg.total_hours for lg in team_logs)
        workers_avg = sum(lg.workers_present for lg in team_logs) // max(len(team_logs), 1)
        statuses = {lg.status for lg in team_logs}

        if len(statuses) == 1:
            entry_status = statuses.pop().value
        elif AttendanceStatus.PENDING in statuses:
            entry_status = "PENDING"
        else:
            entry_status = "APPROVED_BY_MANAGER"

        pending_cost = sum(
            (lg.calculated_cost for lg in team_logs if lg.status == AttendanceStatus.PENDING),
            Decimal("0.00"),
        )
        approved_cost = cost - pending_cost

        total_cost += cost
        total_approved += approved_cost
        total_pending += pending_cost

        # Derive a human-readable project name from eagerly loaded chain
        client_name = None
        if proj and proj.client and proj.client.user:
            client_name = proj.client.user.full_name
        project_name = (
            f"{client_name}'s Project" if client_name else f"Project {str(pid)[:8]}"
        )

        entries.append(
            {
                "team_id": tid,
                "team_name": team.name,
                "specialization": team.specialization.value,
                "project_id": pid,
                "project_name": project_name,
                "days_worked": len(team_logs),
                "total_workers": workers_avg,
                "total_hours": hours,
                "calculated_cost": cost,
                "status": entry_status,
            }
        )

    return {
        "entries": entries,
        "total_cost": total_cost,
        "total_approved": total_approved,
        "total_pending": total_pending,
    }


async def list_attendance_logs(
    db: AsyncSession,
    project_id: UUID | None = None,
    sprint_id: UUID | None = None,
    team_id: UUID | None = None,
    status: AttendanceStatus | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    skip: int = 0,
    limit: int = 50,
) -> List[AttendanceLog]:
    """List attendance logs with optional filters and pagination."""
    query = select(AttendanceLog).options(selectinload(AttendanceLog.team))
    if project_id:
        query = query.where(AttendanceLog.project_id == project_id)
    if sprint_id:
        query = query.where(AttendanceLog.sprint_id == sprint_id)
    if team_id:
        query = query.where(AttendanceLog.team_id == team_id)
    if status:
        query = query.where(AttendanceLog.status == status)
    if date_from:
        query = query.where(AttendanceLog.date >= date_from)
    if date_to:
        query = query.where(AttendanceLog.date <= date_to)
    query = query.order_by(AttendanceLog.date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def approve_payroll(
    attendance_ids: List[UUID], user_id: UUID, db: AsyncSession
) -> List[AttendanceLog]:
    """Approve a batch of attendance logs and create an OUTFLOW transaction.

    Steps:
    1. Sum the total cost of all attendance logs.
    2. Verify the project wallet has sufficient funds (via authorize_expense).
    3. Mark all logs as APPROVED_BY_MANAGER.
    4. Create an OUTFLOW LABOR transaction on the project wallet.
    """
    if not attendance_ids:
        raise BadRequestException(detail="No attendance log IDs provided")

    # Fetch all attendance logs
    result = await db.execute(
        select(AttendanceLog).where(AttendanceLog.id.in_(attendance_ids))
    )
    logs = list(result.scalars().all())

    if not logs:
        raise NotFoundException(detail="No attendance logs found for the given IDs")

    # Verify all logs are PENDING
    non_pending = [log for log in logs if log.status != AttendanceStatus.PENDING]
    if non_pending:
        raise BadRequestException(
            detail=f"{len(non_pending)} attendance log(s) are not in PENDING status"
        )

    # Verify all logs belong to the same project
    project_ids = {log.project_id for log in logs}
    if len(project_ids) > 1:
        raise BadRequestException(
            detail="All attendance logs must belong to the same project"
        )

    project_id = logs[0].project_id
    total_cost = sum(log.calculated_cost for log in logs)

    # Authorize the expense from the project wallet
    await authorize_expense(project_id, total_cost, db)

    # Mark all logs as approved
    for log in logs:
        log.status = AttendanceStatus.APPROVED_BY_MANAGER
        db.add(log)

    # Create a single OUTFLOW transaction for the batch
    transaction = Transaction(
        project_id=project_id,
        category=TransactionCategory.OUTFLOW,
        source=TransactionSource.LABOR,
        amount=total_cost,
        description=(f"Weekly labor payroll approval - {len(logs)} attendance log(s)"),
        recorded_by_id=user_id,
        status=TransactionStatus.CLEARED,
    )
    db.add(transaction)

    # Update the project wallet
    wallet_result = await db.execute(
        select(ProjectWallet).where(ProjectWallet.project_id == project_id)
    )
    wallet = wallet_result.scalar_one_or_none()
    if wallet:
        wallet.total_spent += total_cost
        db.add(wallet)

    await db.commit()

    # Refresh all logs
    for log in logs:
        await db.refresh(log)

    return logs


async def approve_payroll_by_filters(
    project_id: UUID,
    team_id: UUID,
    week_start: date,
    week_end: date,
    user_id: UUID,
    db: AsyncSession,
) -> List[AttendanceLog]:
    """Find pending attendance logs matching the project, team, and date range,
    then delegate to approve_payroll to approve them as a batch.

    This is a convenience wrapper used by the router which accepts filter
    parameters instead of explicit attendance log IDs.
    """
    result = await db.execute(
        select(AttendanceLog.id).where(
            AttendanceLog.project_id == project_id,
            AttendanceLog.team_id == team_id,
            AttendanceLog.date >= week_start,
            AttendanceLog.date <= week_end,
            AttendanceLog.status == AttendanceStatus.PENDING,
        )
    )
    attendance_ids = [row[0] for row in result.all()]

    if not attendance_ids:
        raise NotFoundException(
            detail=(
                f"No pending attendance logs found for team '{team_id}' "
                f"on project '{project_id}' between {week_start} and {week_end}"
            )
        )

    return await approve_payroll(attendance_ids=attendance_ids, user_id=user_id, db=db)
