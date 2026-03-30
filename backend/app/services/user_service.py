from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.email import send_email_fire_and_forget
from app.core.exceptions import ConflictException, NotFoundException
from app.core.security import get_password_hash, verify_password
from app.models.organization import OrgMembership
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


async def create_user(data: UserCreate, org_id: UUID, db: AsyncSession) -> User:
    """Create a new user after checking email uniqueness and hashing the password.

    Also creates an OrgMembership linking the user to the given org.
    """
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
    await db.flush()  # get user.id before creating membership

    # Create OrgMembership
    membership = OrgMembership(
        user_id=user.id,
        org_id=org_id,
        role=data.role,
        is_default=True,
        is_active=True,
    )
    db.add(membership)

    await db.commit()
    await db.refresh(user)

    # Email new staff their credentials
    send_email_fire_and_forget(
        subject="Welcome to IntDesign ERP - Your Account",
        email_to=user.email,
        template_name="client_welcome.html",
        template_data={
            "subject": "Welcome to IntDesign ERP",
            "client_name": user.full_name,
            "email": user.email,
            "password": data.password,
            "login_url": f"{settings.FRONTEND_URL}/login",
        },
    )

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
    org_id: UUID, db: AsyncSession, skip: int = 0, limit: int = 50
) -> List[User]:
    """Retrieve a paginated list of users belonging to the given org.

    Each returned User has its `role` field set to the OrgMembership role
    for the requested org (not the legacy User.role column).
    """
    result = await db.execute(
        select(User, OrgMembership.role)
        .join(OrgMembership, OrgMembership.user_id == User.id)
        .where(OrgMembership.org_id == org_id, OrgMembership.is_active == True)
        .order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = result.all()
    users: List[User] = []
    for user_obj, membership_role in rows:
        # Stamp the org-level role onto the user object for serialization
        user_obj.role = membership_role
        users.append(user_obj)
    return users


async def update_user(
    user_id: UUID, data: UserUpdate, db: AsyncSession, org_id: UUID | None = None
) -> User:
    """Update user fields. Only non-None fields from the update schema are applied.

    When *org_id* is supplied the function also validates that the target user
    belongs to the organisation (via OrgMembership).
    """
    user = await get_user_by_id(user_id, db)

    if org_id is not None:
        membership = (
            await db.execute(
                select(OrgMembership).where(
                    OrgMembership.user_id == user_id,
                    OrgMembership.org_id == org_id,
                )
            )
        ).scalar_one_or_none()
        if not membership:
            raise NotFoundException(detail="User does not belong to this organisation")

    update_data = data.model_dump(exclude_unset=True)

    # If the role is being changed, keep the OrgMembership in sync
    new_role = update_data.get("role")

    for field, value in update_data.items():
        setattr(user, field, value)

    if new_role is not None and org_id is not None:
        membership_result = await db.execute(
            select(OrgMembership).where(
                OrgMembership.user_id == user_id,
                OrgMembership.org_id == org_id,
            )
        )
        mem = membership_result.scalar_one_or_none()
        if mem:
            mem.role = new_role

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def deactivate_user(user_id: UUID, org_id: UUID, db: AsyncSession) -> None:
    """Soft-delete a user by setting is_active=False."""
    user = await get_user_by_id(user_id, db)

    # Verify the user belongs to this org
    membership = (
        await db.execute(
            select(OrgMembership).where(
                OrgMembership.user_id == user_id,
                OrgMembership.org_id == org_id,
            )
        )
    ).scalar_one_or_none()
    if not membership:
        raise NotFoundException(detail="User does not belong to this organisation")

    user.is_active = False
    membership.is_active = False
    db.add(user)
    await db.commit()


async def authenticate_user(
    email: str, password: str, db: AsyncSession
) -> Optional[User]:
    """Verify email and password. Returns the User on success, None on failure."""
    email = email.strip().lower()
    user = await get_user_by_email(email, db)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user
