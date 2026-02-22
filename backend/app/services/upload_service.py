import os
import uuid
from pathlib import Path

import aiofiles
import boto3
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import BadRequestException

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_DOC_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}

VALID_CATEGORIES = {
    "items",
    "leads",
    "projects",
    "attendance",
    "finance",
    "avatars",
    "quotes",
    "purchase-orders",
    "daily-logs",
    "variation-orders",
}

# Categories that accept documents (PDF) in addition to images
DOC_CATEGORIES = {"leads", "finance", "purchase-orders", "variation-orders"}


def _get_allowed_types(category: str) -> set[str]:
    if category in DOC_CATEGORIES:
        return ALLOWED_DOC_TYPES
    return ALLOWED_IMAGE_TYPES


def _get_max_size(category: str) -> int:
    if category in DOC_CATEGORIES:
        return settings.UPLOAD_MAX_DOC_SIZE
    return settings.UPLOAD_MAX_IMAGE_SIZE


def validate_category(category: str) -> None:
    if category not in VALID_CATEGORIES:
        raise BadRequestException(
            detail=f"Invalid upload category '{category}'. Must be one of: {', '.join(sorted(VALID_CATEGORIES))}"
        )


async def validate_file(file: UploadFile, category: str) -> None:
    """Validate file MIME type and size."""
    allowed = _get_allowed_types(category)
    content_type = file.content_type or ""

    if content_type not in allowed:
        raise BadRequestException(
            detail=f"File type '{content_type}' not allowed. Accepted: {', '.join(sorted(allowed))}"
        )

    max_size = _get_max_size(category)
    contents = await file.read()
    if len(contents) > max_size:
        max_mb = max_size / (1024 * 1024)
        raise BadRequestException(
            detail=f"File too large. Maximum size is {max_mb:.0f} MB."
        )
    # Reset file position for subsequent read
    await file.seek(0)


def _generate_filename(file: UploadFile) -> str:
    ext = ""
    if file.filename:
        ext = Path(file.filename).suffix.lower()
    if not ext:
        # Fallback based on content type
        ct_map = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
            "application/pdf": ".pdf",
        }
        ext = ct_map.get(file.content_type or "", ".bin")
    return f"{uuid.uuid4()}{ext}"


async def upload_file(file: UploadFile, category: str) -> str:
    """Upload a file and return its URL.

    Uses S3 in production, local filesystem otherwise.
    """
    validate_category(category)
    await validate_file(file, category)

    filename = _generate_filename(file)

    if settings.ENVIRONMENT == "production":
        return await _upload_to_s3(file, category, filename)
    return await _upload_to_local(file, category, filename)


async def _upload_to_s3(file: UploadFile, category: str, filename: str) -> str:
    s3 = boto3.client(
        "s3",
        region_name=settings.S3_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )
    key = f"{category}/{filename}"
    contents = await file.read()

    s3.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=key,
        Body=contents,
        ContentType=file.content_type or "application/octet-stream",
    )

    return f"https://{settings.S3_BUCKET_NAME}.s3.{settings.S3_REGION}.amazonaws.com/{key}"


async def _upload_to_local(file: UploadFile, category: str, filename: str) -> str:
    upload_dir = Path(settings.UPLOAD_DIR) / category
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / filename
    contents = await file.read()

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(contents)

    return f"/uploads/{category}/{filename}"


async def delete_file(url: str) -> None:
    """Delete a previously uploaded file."""
    if not url:
        return

    if url.startswith("https://") and "s3" in url:
        # S3 URL: extract key from URL
        # Format: https://bucket.s3.region.amazonaws.com/category/filename
        try:
            key = "/".join(url.split(".amazonaws.com/")[1:])
            if key:
                s3 = boto3.client(
                    "s3",
                    region_name=settings.S3_REGION,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                )
                s3.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
        except (IndexError, Exception):
            pass  # Best-effort deletion
    elif url.startswith("/uploads/"):
        # Local file
        local_path = Path(settings.UPLOAD_DIR) / url.removeprefix("/uploads/")
        if local_path.exists():
            os.remove(local_path)
