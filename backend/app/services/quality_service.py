from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.quality import (
    ChecklistItemStatus,
    Inspection,
    InspectionItem,
    InspectionStatus,
    SnagItem,
    SnagSeverity,
    SnagStatus,
)
from app.schemas.quality import (
    InspectionCreate,
    InspectionItemUpdate,
    SnagItemCreate,
    SnagItemUpdate,
)

# ---------------------------------------------------------------------------
# Inspections
# ---------------------------------------------------------------------------


async def _get_inspection(
    inspection_id: UUID, org_id: UUID, db: AsyncSession
) -> Inspection:
    result = await db.execute(
        select(Inspection)
        .options(
            selectinload(Inspection.checklist_items),
            selectinload(Inspection.inspector),
        )
        .where(Inspection.id == inspection_id)
    )
    inspection = result.scalar_one_or_none()
    if not inspection or inspection.org_id != org_id:
        raise NotFoundException(detail="Inspection not found")
    return inspection


async def create_inspection(
    data: InspectionCreate, user_id: UUID, org_id: UUID, db: AsyncSession
) -> Inspection:
    """Create a new inspection with checklist items."""
    inspection = Inspection(
        project_id=data.project_id,
        sprint_id=data.sprint_id,
        inspector_id=user_id,
        title=data.title,
        inspection_date=data.inspection_date,
        notes=data.notes,
        status=InspectionStatus.DRAFT,
        org_id=org_id,
    )

    for item_data in data.checklist_items:
        inspection.checklist_items.append(
            InspectionItem(
                description=item_data.description,
                status=item_data.status,
                photo_url=item_data.photo_url,
                notes=item_data.notes,
            )
        )

    db.add(inspection)
    await db.commit()
    return await _get_inspection(inspection.id, org_id, db)


async def list_inspections(
    db: AsyncSession,
    org_id: UUID,
    project_id: Optional[UUID] = None,
    sprint_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[Inspection]:
    query = (
        select(Inspection)
        .options(
            selectinload(Inspection.checklist_items),
            selectinload(Inspection.inspector),
        )
        .where(Inspection.org_id == org_id)
        .order_by(Inspection.created_at.desc())
    )
    if project_id:
        query = query.where(Inspection.project_id == project_id)
    if sprint_id:
        query = query.where(Inspection.sprint_id == sprint_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_inspection_item(
    item_id: UUID, data: InspectionItemUpdate, org_id: UUID, db: AsyncSession
) -> InspectionItem:
    """Update a single checklist item's status, photo, or notes."""
    result = await db.execute(
        select(InspectionItem).where(InspectionItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundException(detail="Inspection item not found")

    # Verify the parent inspection belongs to the org
    parent = await _get_inspection(item.inspection_id, org_id, db)

    if data.status is not None:
        item.status = data.status
    if data.photo_url is not None:
        item.photo_url = data.photo_url
    if data.notes is not None:
        item.notes = data.notes

    # Also set parent inspection to IN_PROGRESS if still DRAFT
    if parent.status == InspectionStatus.DRAFT:
        parent.status = InspectionStatus.IN_PROGRESS

    await db.commit()
    return item


async def complete_inspection(
    inspection_id: UUID, org_id: UUID, db: AsyncSession
) -> Inspection:
    """Complete an inspection: compute score and auto-create snags from FAILs."""
    inspection = await _get_inspection(inspection_id, org_id, db)
    if inspection.status == InspectionStatus.COMPLETED:
        raise BadRequestException(detail="Inspection is already completed")

    items = list(inspection.checklist_items)
    scorable = [
        i
        for i in items
        if i.status in (ChecklistItemStatus.PASS, ChecklistItemStatus.FAIL)
    ]
    if scorable:
        pass_count = sum(1 for i in scorable if i.status == ChecklistItemStatus.PASS)
        inspection.overall_score = round((pass_count / len(scorable)) * 100, 1)

    inspection.status = InspectionStatus.COMPLETED

    # Auto-create snag items from FAIL checklist items
    for item in items:
        if item.status == ChecklistItemStatus.FAIL:
            snag = SnagItem(
                project_id=inspection.project_id,
                sprint_id=inspection.sprint_id,
                inspection_id=inspection.id,
                description=f"[Inspection: {inspection.title}] {item.description}",
                severity=SnagSeverity.MEDIUM,
                status=SnagStatus.OPEN,
                photo_url=item.photo_url,
                org_id=org_id,
            )
            db.add(snag)

    await db.commit()
    return await _get_inspection(inspection_id, org_id, db)


# ---------------------------------------------------------------------------
# Snag Items
# ---------------------------------------------------------------------------


async def create_snag(data: SnagItemCreate, org_id: UUID, db: AsyncSession) -> SnagItem:
    """Create a standalone snag item."""
    snag = SnagItem(
        project_id=data.project_id,
        sprint_id=data.sprint_id,
        inspection_id=data.inspection_id,
        description=data.description,
        severity=data.severity,
        photo_url=data.photo_url,
        assigned_to_id=data.assigned_to_id,
        due_date=data.due_date,
        org_id=org_id,
    )
    db.add(snag)
    await db.commit()
    await db.refresh(snag)
    return snag


async def update_snag(
    snag_id: UUID, data: SnagItemUpdate, org_id: UUID, db: AsyncSession
) -> SnagItem:
    """Update a snag item's status, severity, assignment, etc."""
    result = await db.execute(
        select(SnagItem)
        .options(selectinload(SnagItem.assigned_to))
        .where(SnagItem.id == snag_id)
    )
    snag = result.scalar_one_or_none()
    if not snag or snag.org_id != org_id:
        raise NotFoundException(detail="Snag item not found")

    if data.status is not None:
        snag.status = data.status
        if data.status in (SnagStatus.RESOLVED, SnagStatus.VERIFIED):
            snag.resolved_at = datetime.now(timezone.utc)
    if data.severity is not None:
        snag.severity = data.severity
    if data.assigned_to_id is not None:
        snag.assigned_to_id = data.assigned_to_id
    if data.due_date is not None:
        snag.due_date = data.due_date
    if data.resolution_notes is not None:
        snag.resolution_notes = data.resolution_notes
    if data.photo_url is not None:
        snag.photo_url = data.photo_url

    await db.commit()
    await db.refresh(snag)
    return snag


async def list_snags(
    db: AsyncSession,
    org_id: UUID,
    project_id: Optional[UUID] = None,
    severity: Optional[SnagSeverity] = None,
    status: Optional[SnagStatus] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[SnagItem]:
    query = (
        select(SnagItem)
        .options(selectinload(SnagItem.assigned_to))
        .where(SnagItem.org_id == org_id)
        .order_by(SnagItem.created_at.desc())
    )
    if project_id:
        query = query.where(SnagItem.project_id == project_id)
    if severity:
        query = query.where(SnagItem.severity == severity)
    if status:
        query = query.where(SnagItem.status == status)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Quality Summary
# ---------------------------------------------------------------------------


async def get_project_quality_summary(
    project_id: UUID, org_id: UUID, db: AsyncSession
) -> dict:
    """Return aggregated quality metrics for a project."""
    # Inspection counts
    insp_result = await db.execute(
        select(
            func.count().label("total"),
            func.count()
            .filter(Inspection.status == InspectionStatus.COMPLETED)
            .label("completed"),
            func.avg(Inspection.overall_score).label("avg_score"),
        ).where(
            Inspection.project_id == project_id,
            Inspection.org_id == org_id,
        )
    )
    insp_row = insp_result.one()

    # Snag counts
    snag_result = await db.execute(
        select(
            func.count().label("total"),
            func.count().filter(SnagItem.status == SnagStatus.OPEN).label("open"),
            func.count()
            .filter(SnagItem.severity == SnagSeverity.CRITICAL)
            .label("critical"),
            func.count()
            .filter(SnagItem.status.in_([SnagStatus.RESOLVED, SnagStatus.VERIFIED]))
            .label("resolved"),
        ).where(
            SnagItem.project_id == project_id,
            SnagItem.org_id == org_id,
        )
    )
    snag_row = snag_result.one()

    return {
        "total_inspections": insp_row.total,
        "completed_inspections": insp_row.completed,
        "avg_score": round(insp_row.avg_score, 1) if insp_row.avg_score else None,
        "total_snags": snag_row.total,
        "open_snags": snag_row.open,
        "critical_snags": snag_row.critical,
        "resolved_snags": snag_row.resolved,
    }
