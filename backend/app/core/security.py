from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.db.session import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        raise UnauthorizedException()


@dataclass
class AuthContext:
    """Holds the authenticated user, active org, and role within that org."""
    user: "User"  # type: ignore[name-defined]
    org_id: UUID
    role: "UserRole"  # type: ignore[name-defined]


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    """Return the raw User object (no org context). Used only by auth endpoints."""
    from app.models.user import User

    payload = decode_token(token)
    user_id: str = payload.get("sub")
    token_type: str = payload.get("type")

    if user_id is None or token_type != "access":
        raise UnauthorizedException()

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise UnauthorizedException(detail="User not found")
    if not user.is_active:
        raise UnauthorizedException(detail="User account is deactivated")

    return user


async def get_auth_context(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> AuthContext:
    """Return AuthContext with user, active org_id, and role within that org."""
    from app.models.organization import OrgMembership
    from app.models.user import User, UserRole

    payload = decode_token(token)
    user_id: str = payload.get("sub")
    token_type: str = payload.get("type")
    org_id_str: str = payload.get("org_id")

    if user_id is None or token_type != "access":
        raise UnauthorizedException()
    if not org_id_str:
        raise UnauthorizedException(detail="No organization context in token")

    org_id = UUID(org_id_str)

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise UnauthorizedException(detail="User not found")
    if not user.is_active:
        raise UnauthorizedException(detail="User account is deactivated")

    # Platform admins bypass membership check
    if user.is_platform_admin:
        return AuthContext(user=user, org_id=org_id, role=UserRole.SUPER_ADMIN)

    # Verify org membership
    mem_result = await db.execute(
        select(OrgMembership).where(
            OrgMembership.user_id == user.id,
            OrgMembership.org_id == org_id,
            OrgMembership.is_active == True,  # noqa: E712
        )
    )
    membership = mem_result.scalar_one_or_none()
    if not membership:
        raise ForbiddenException(detail="You do not belong to this organization")

    return AuthContext(user=user, org_id=org_id, role=membership.role)


def role_required(allowed_roles: List[str]):
    """Dependency that checks the user's role within their active org.

    Returns AuthContext (not User). Callers use ctx.user, ctx.org_id, ctx.role.
    """
    async def dependency(
        token: str = Depends(oauth2_scheme),
        db: AsyncSession = Depends(get_db),
    ) -> AuthContext:
        ctx = await get_auth_context(token=token, db=db)
        # Platform admins pass all role checks
        if ctx.user.is_platform_admin:
            return ctx
        if ctx.role.value not in allowed_roles:
            raise ForbiddenException()
        return ctx

    return dependency
