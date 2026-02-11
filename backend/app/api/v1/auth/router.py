from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import Token, TokenRefresh
from app.schemas.user import UserResponse
from app.services import auth_service

router = APIRouter()


@router.post("/token", response_model=Token, status_code=status.HTTP_200_OK)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """OAuth2 password flow login. Returns access + refresh token pair."""
    token = await auth_service.authenticate_user(
        email=form_data.username,
        password=form_data.password,
        db=db,
    )
    return token


@router.post("/refresh", response_model=Token, status_code=status.HTTP_200_OK)
async def refresh_token(
    payload: TokenRefresh,
    db: AsyncSession = Depends(get_db),
):
    """Exchange a valid refresh token for a new access + refresh token pair."""
    token = await auth_service.refresh_tokens(
        refresh_token=payload.refresh_token,
        db=db,
    )
    return token


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Return the profile of the currently authenticated user."""
    return current_user
