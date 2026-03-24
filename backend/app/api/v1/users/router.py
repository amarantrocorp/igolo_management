from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_auth_context, role_required, AuthContext
from app.db.session import get_db
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services import user_service

router = APIRouter()


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def read_user_me(
    ctx: AuthContext = Depends(get_auth_context),
):
    """Get current user."""
    return ctx.user


@router.get("", response_model=list[UserResponse], status_code=status.HTTP_200_OK)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["SUPER_ADMIN"])),
):
    """List all users. Admin only."""
    users = await user_service.get_users(
        org_id=ctx.org_id, db=db, skip=skip, limit=limit
    )
    return users


@router.post(
    "/create", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["SUPER_ADMIN"])),
):
    """Create a new internal staff user. Admin only."""
    user = await user_service.create_user(data=payload, org_id=ctx.org_id, db=db)
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    ctx: AuthContext = Depends(role_required(["SUPER_ADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing user. Admin only."""
    return await user_service.update_user(
        user_id=user_id, data=data, org_id=ctx.org_id, db=db
    )


@router.delete("/{user_id}", status_code=204)
async def deactivate_user(
    user_id: UUID,
    ctx: AuthContext = Depends(role_required(["SUPER_ADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a user (soft delete). Admin only."""
    await user_service.deactivate_user(user_id=user_id, org_id=ctx.org_id, db=db)
