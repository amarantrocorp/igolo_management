from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, role_required
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.services import user_service

router = APIRouter()


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def read_user_me(
    current_user: User = Depends(get_current_user),
):
    """Get current user."""
    return current_user


@router.get("", response_model=list[UserResponse], status_code=status.HTTP_200_OK)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["SUPER_ADMIN"])),
):
    """List all users. Admin only."""
    users = await user_service.get_users(db=db, skip=skip, limit=limit)
    return users


@router.post(
    "/create", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(role_required(["SUPER_ADMIN"])),
):
    """Create a new internal staff user. Admin only."""
    user = await user_service.create_user(data=payload, db=db)
    return user
