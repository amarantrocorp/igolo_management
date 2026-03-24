"""Project document management service."""

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.document import DocumentCategory, ProjectDocument
from app.schemas.document import DocumentCreate


async def create_document(
    project_id: UUID, data: DocumentCreate, user_id: UUID, org_id: UUID, db: AsyncSession
) -> ProjectDocument:
    """Upload/register a document for a project."""
    doc = ProjectDocument(
        project_id=project_id,
        name=data.name,
        category=DocumentCategory(data.category),
        file_url=data.file_url,
        uploaded_by_id=user_id,
        version=data.version,
        notes=data.notes,
        org_id=org_id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def list_documents(
    project_id: UUID,
    db: AsyncSession,
    org_id: UUID,
    category: Optional[str] = None,
) -> list[ProjectDocument]:
    """List documents for a project."""
    q = select(ProjectDocument).where(
        ProjectDocument.project_id == project_id,
        ProjectDocument.org_id == org_id,
    )
    if category:
        q = q.where(ProjectDocument.category == DocumentCategory(category))
    q = q.order_by(ProjectDocument.created_at.desc())
    result = await db.execute(q)
    return list(result.scalars().all())


async def delete_document(doc_id: UUID, org_id: UUID, db: AsyncSession) -> None:
    """Delete a project document."""
    result = await db.execute(
        select(ProjectDocument).where(ProjectDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc or doc.org_id != org_id:
        raise NotFoundException(detail=f"Document '{doc_id}' not found")
    await db.delete(doc)
    await db.commit()
