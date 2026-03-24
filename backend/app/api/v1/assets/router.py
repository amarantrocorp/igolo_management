from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_auth_context, role_required, AuthContext
from app.db.session import get_db
from app.schemas.asset import (
    AssetAssign,
    AssetCreate,
    AssetResponse,
    AssetReturn,
    AssetUpdate,
    AssetUsageLogResponse,
)
from app.services import asset_service

router = APIRouter()


@router.post("/", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    data: AssetCreate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Register a new asset/equipment."""
    return await asset_service.create_asset(data, ctx.org_id, db)


@router.get("/", response_model=list[AssetResponse])
async def list_assets(
    category: Optional[str] = Query(None),
    asset_status: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List assets with optional filters."""
    return await asset_service.list_assets(
        db,
        org_id=ctx.org_id,
        category=category,
        status=asset_status,
        skip=skip,
        limit=limit,
    )


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Get a single asset with its usage logs."""
    return await asset_service.get_asset(asset_id, ctx.org_id, db)


@router.patch("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: UUID,
    data: AssetUpdate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Update asset details."""
    return await asset_service.update_asset(asset_id, data, ctx.org_id, db)


@router.post(
    "/{asset_id}/assign",
    response_model=AssetUsageLogResponse,
    status_code=status.HTTP_201_CREATED,
)
async def assign_asset(
    asset_id: UUID,
    data: AssetAssign,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Assign an asset to a project."""
    return await asset_service.assign_asset(
        asset_id,
        data.project_id,
        data.assigned_date,
        ctx.org_id,
        db,
    )


@router.post("/{asset_id}/return", response_model=AssetUsageLogResponse)
async def return_asset(
    asset_id: UUID,
    data: AssetReturn,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Return an assigned asset."""
    return await asset_service.return_asset(
        asset_id, data.condition_on_return, ctx.org_id, db
    )


@router.get("/{asset_id}/usage-logs", response_model=list[AssetUsageLogResponse])
async def get_usage_logs(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Get usage history for an asset."""
    return await asset_service.get_asset_usage_logs(asset_id, ctx.org_id, db)
