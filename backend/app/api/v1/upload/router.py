from fastapi import APIRouter, Depends, UploadFile

from app.core.security import get_auth_context, AuthContext
from app.services import upload_service

router = APIRouter()


@router.post("")
async def upload_file(
    file: UploadFile,
    category: str,
    ctx: AuthContext = Depends(get_auth_context),
):
    """Upload a file. Returns the URL of the uploaded file.

    **Categories:** items, leads, projects, attendance, finance, avatars,
    quotes, purchase-orders, daily-logs, variation-orders.
    """
    url = await upload_service.upload_file(file, category)
    return {"url": url}
