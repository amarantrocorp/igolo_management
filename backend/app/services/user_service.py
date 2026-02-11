from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.core.security import get_password_hash, verify_password
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate


async def create_user(data: UserCreate, db: AsyncSession) -> User:
    """Create a new user after checking email uniqueness and hashing the password."""
    # Check if email already exists
    existing = await get_user_by_email(data.email, db)
    if existing:
        raise ConflictException(detail=f"User with email '{data.email}' already exists")

    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=data.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_email(email: str, db: AsyncSession) -> Optional[User]:
    """Retrieve a user by their email address."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(user_id: UUID, db: AsyncSession) -> User:
    """Retrieve a user by their ID. Raises NotFoundException if not found."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException(detail=f"User with id '{user_id}' not found")
    return user


async def get_users(
    db: AsyncSession, skip: int = 0, limit: int = 50
) -> List[User]:
    """Retrieve a paginated list of users."""
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all())


async def update_user(user_id: UUID, data: UserUpdate, db: AsyncSession) -> User:
    """Update user fields. Only non-None fields from the update schema are applied."""
    user = await get_user_by_id(user_id, db)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(
    email: str, password: str, db: AsyncSession
) -> Optional[User]:
    """Verify email and password. Returns the User on success, None on failure."""
    user = await get_user_by_email(email, db)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
