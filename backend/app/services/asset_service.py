"""Asset/Equipment management business logic."""

from datetime import date
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.asset import Asset, AssetCondition, AssetStatus, AssetUsageLog
from app.schemas.asset import AssetCreate, AssetUpdate


# ---------------------------------------------------------------------------
# Asset CRUD
# ---------------------------------------------------------------------------


async def create_asset(data: AssetCreate, org_id: UUID, db: AsyncSession) -> Asset:
    """Register a new asset/equipment."""
    asset = Asset(
        name=data.name,
        category=data.category,
        serial_number=data.serial_number,
        purchase_date=data.purchase_date,
        purchase_cost=data.purchase_cost,
        condition=AssetCondition(data.condition),
        status=AssetStatus.AVAILABLE,
        org_id=org_id,
    )
    if data.notes:
        asset.notes = data.notes
    db.add(asset)
    await db.commit()
    return await get_asset(asset.id, org_id, db)


async def get_asset(asset_id: UUID, org_id: UUID, db: AsyncSession) -> Asset:
    """Fetch a single asset with its usage logs."""
    result = await db.execute(
        select(Asset)
        .options(selectinload(Asset.usage_logs))
        .where(Asset.id == asset_id)
    )
    asset = result.scalar_one_or_none()
    if not asset or asset.org_id != org_id:
        raise NotFoundException(detail=f"Asset '{asset_id}' not found")
    return asset


async def list_assets(
    db: AsyncSession,
    org_id: UUID,
    category: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Asset]:
    """List assets with optional filters."""
    q = (
        select(Asset)
        .options(selectinload(Asset.usage_logs))
        .where(Asset.org_id == org_id)
    )
    if category:
        q = q.where(Asset.category == category)
    if status:
        q = q.where(Asset.status == AssetStatus(status))
    q = q.order_by(Asset.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def update_asset(asset_id: UUID, data: AssetUpdate, org_id: UUID, db: AsyncSession) -> Asset:
    """Update asset details."""
    asset = await get_asset(asset_id, org_id, db)
    if data.name is not None:
        asset.name = data.name
    if data.category is not None:
        asset.category = data.category
    if data.condition is not None:
        asset.condition = AssetCondition(data.condition)
    if data.status is not None:
        asset.status = AssetStatus(data.status)
    if data.notes is not None:
        asset.notes = data.notes
    await db.commit()
    return await get_asset(asset_id, org_id, db)


# ---------------------------------------------------------------------------
# Assign / Return
# ---------------------------------------------------------------------------


async def assign_asset(
    asset_id: UUID, project_id: UUID, assigned_date: date, org_id: UUID, db: AsyncSession
) -> AssetUsageLog:
    """Assign an asset to a project."""
    asset = await get_asset(asset_id, org_id, db)
    if asset.status != AssetStatus.AVAILABLE:
        raise BadRequestException(
            detail=f"Asset is not available (current status: {asset.status.value})"
        )

    asset.status = AssetStatus.ASSIGNED

    log = AssetUsageLog(
        asset_id=asset_id,
        project_id=project_id,
        assigned_date=assigned_date,
        org_id=org_id,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


async def return_asset(
    asset_id: UUID, condition_on_return: str, org_id: UUID, db: AsyncSession
) -> AssetUsageLog:
    """Return an assigned asset. Updates asset status back to AVAILABLE
    and records the return condition."""
    asset = await get_asset(asset_id, org_id, db)
    if asset.status != AssetStatus.ASSIGNED:
        raise BadRequestException(detail="Asset is not currently assigned")

    # Find the open usage log (no returned_date)
    result = await db.execute(
        select(AssetUsageLog)
        .where(
            AssetUsageLog.asset_id == asset_id,
            AssetUsageLog.returned_date.is_(None),
            AssetUsageLog.org_id == org_id,
        )
        .order_by(AssetUsageLog.assigned_date.desc())
    )
    log = result.scalar_one_or_none()
    if not log:
        raise NotFoundException(detail="No open usage log found for this asset")

    log.returned_date = date.today()
    log.condition_on_return = AssetCondition(condition_on_return)

    # Update asset condition and status
    asset.condition = AssetCondition(condition_on_return)
    asset.status = AssetStatus.AVAILABLE

    await db.commit()
    await db.refresh(log)
    return log


async def get_asset_usage_logs(
    asset_id: UUID, org_id: UUID, db: AsyncSession
) -> list[AssetUsageLog]:
    """List all usage logs for an asset."""
    # Verify asset belongs to org
    await get_asset(asset_id, org_id, db)
    result = await db.execute(
        select(AssetUsageLog)
        .where(
            AssetUsageLog.asset_id == asset_id,
            AssetUsageLog.org_id == org_id,
        )
        .order_by(AssetUsageLog.assigned_date.desc())
    )
    return list(result.scalars().all())
