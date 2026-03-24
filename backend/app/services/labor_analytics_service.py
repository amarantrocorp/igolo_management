"""Labor productivity analytics."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.labor import AttendanceLog, LaborTeam


async def get_team_productivity(team_id: UUID, org_id: UUID, db: AsyncSession) -> dict:
    """Get productivity metrics for a labor team."""
    result = await db.execute(select(LaborTeam).where(LaborTeam.id == team_id))
    team = result.scalar_one_or_none()
    if not team or team.org_id != org_id:
        raise NotFoundException(detail=f"Team '{team_id}' not found")

    # Aggregate attendance data
    agg_result = await db.execute(
        select(
            func.count(AttendanceLog.id),
            func.coalesce(func.sum(AttendanceLog.total_hours), 0),
            func.coalesce(func.sum(AttendanceLog.calculated_cost), 0),
            func.coalesce(func.sum(AttendanceLog.workers_present), 0),
            func.coalesce(func.avg(AttendanceLog.calculated_cost), 0),
        ).where(
            AttendanceLog.team_id == team_id,
            AttendanceLog.org_id == org_id,
        )
    )
    row = agg_result.one()
    total_logs = int(row[0])
    total_hours = float(row[1])
    total_cost = float(row[2])
    total_worker_days = int(row[3])
    avg_daily_cost = float(row[4])

    # Per-project breakdown
    project_result = await db.execute(
        select(
            AttendanceLog.project_id,
            func.count(AttendanceLog.id),
            func.coalesce(func.sum(AttendanceLog.calculated_cost), 0),
            func.coalesce(func.sum(AttendanceLog.total_hours), 0),
        )
        .where(
            AttendanceLog.team_id == team_id,
            AttendanceLog.org_id == org_id,
        )
        .group_by(AttendanceLog.project_id)
    )
    project_breakdown = [
        {
            "project_id": str(r[0]),
            "days_worked": int(r[1]),
            "total_cost": float(r[2]),
            "total_hours": float(r[3]),
        }
        for r in project_result.all()
    ]

    return {
        "team_id": str(team_id),
        "team_name": team.name,
        "total_logs": total_logs,
        "total_hours": round(total_hours, 1),
        "total_cost": round(total_cost, 2),
        "total_worker_days": total_worker_days,
        "avg_daily_cost": round(avg_daily_cost, 2),
        "project_breakdown": project_breakdown,
    }
