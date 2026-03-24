from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.material_request import (
    MaterialRequest,
    MaterialRequestItem,
    MaterialRequestStatus,
)
from app.models.notification import NotificationType
from app.models.user import UserRole
from app.schemas.material_request import (
    MaterialRequestApproval,
    MaterialRequestCreate,
)
from app.services import inventory_service, notification_service


async def _get_request(
    request_id: UUID, org_id: UUID, db: AsyncSession
) -> MaterialRequest:
    """Helper to fetch a material request with eager-loaded relationships."""
    result = await db.execute(
        select(MaterialRequest)
        .options(
            selectinload(MaterialRequest.items).selectinload(
                MaterialRequestItem.item
            ),
            selectinload(MaterialRequest.requested_by),
            selectinload(MaterialRequest.approved_by),
            selectinload(MaterialRequest.project),
        )
        .where(MaterialRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req or req.org_id != org_id:
        raise NotFoundException(detail="Material request not found")
    return req


async def create_material_request(
    data: MaterialRequestCreate, user_id: UUID, org_id: UUID, db: AsyncSession
) -> MaterialRequest:
    """Create a new material request (indent) and notify managers."""
    if not data.items:
        raise BadRequestException(detail="At least one item is required")

    mr = MaterialRequest(
        project_id=data.project_id,
        sprint_id=data.sprint_id,
        requested_by_id=user_id,
        urgency=data.urgency,
        notes=data.notes,
        status=MaterialRequestStatus.PENDING,
        org_id=org_id,
    )

    for item_data in data.items:
        mr.items.append(
            MaterialRequestItem(
                item_id=item_data.item_id,
                quantity_requested=item_data.quantity_requested,
                notes=item_data.notes,
            )
        )

    db.add(mr)
    await db.commit()

    # Notify managers
    await notification_service.notify_role(
        db=db,
        role=UserRole.MANAGER,
        type=NotificationType.APPROVAL_REQ,
        title="New Material Request",
        body=f"A material indent with {len(data.items)} items requires approval.",
        action_url="/dashboard/admin/material-requests",
    )

    return await _get_request(mr.id, org_id, db)


async def get_material_requests(
    db: AsyncSession,
    org_id: UUID,
    project_id: Optional[UUID] = None,
    status: Optional[MaterialRequestStatus] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[MaterialRequest]:
    """List material requests with optional filters."""
    query = (
        select(MaterialRequest)
        .options(
            selectinload(MaterialRequest.items).selectinload(
                MaterialRequestItem.item
            ),
            selectinload(MaterialRequest.requested_by),
            selectinload(MaterialRequest.project),
        )
        .where(MaterialRequest.org_id == org_id)
        .order_by(MaterialRequest.created_at.desc())
    )
    if project_id:
        query = query.where(MaterialRequest.project_id == project_id)
    if status:
        query = query.where(MaterialRequest.status == status)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_material_request(
    request_id: UUID, org_id: UUID, db: AsyncSession
) -> MaterialRequest:
    """Get a single material request by ID."""
    return await _get_request(request_id, org_id, db)


async def approve_material_request(
    request_id: UUID,
    approval: MaterialRequestApproval,
    approver_id: UUID,
    org_id: UUID,
    db: AsyncSession,
) -> MaterialRequest:
    """Approve a material request, setting approved quantities per item."""
    mr = await _get_request(request_id, org_id, db)
    if mr.status != MaterialRequestStatus.PENDING:
        raise BadRequestException(
            detail=f"Cannot approve request with status {mr.status}"
        )

    # Build lookup of approved quantities by item_id
    approved_lookup = {
        item.item_id: item.quantity_approved for item in approval.items
    }

    all_full = True
    any_approved = False

    for mr_item in mr.items:
        qty = approved_lookup.get(mr_item.item_id)
        if qty is not None and qty > 0:
            mr_item.quantity_approved = qty
            any_approved = True
            if qty < mr_item.quantity_requested:
                all_full = False
        else:
            mr_item.quantity_approved = 0
            all_full = False

    if not any_approved:
        raise BadRequestException(
            detail="At least one item must have an approved quantity > 0"
        )

    mr.status = (
        MaterialRequestStatus.APPROVED
        if all_full
        else MaterialRequestStatus.PARTIALLY_APPROVED
    )
    mr.approved_by_id = approver_id
    mr.approved_at = datetime.now(timezone.utc)
    if approval.notes:
        mr.notes = (mr.notes or "") + f"\n[Approval] {approval.notes}"

    await db.commit()

    # Notify the requester
    await notification_service.create_notification(
        db=db,
        recipient_id=mr.requested_by_id,
        type=NotificationType.INFO,
        title="Material Request Approved",
        body=f"Your material request has been {mr.status.value.lower().replace('_', ' ')}.",
        action_url="/dashboard/admin/material-requests",
    )

    return await _get_request(request_id, org_id, db)


async def reject_material_request(
    request_id: UUID, user_id: UUID, org_id: UUID, db: AsyncSession
) -> MaterialRequest:
    """Reject a material request."""
    mr = await _get_request(request_id, org_id, db)
    if mr.status != MaterialRequestStatus.PENDING:
        raise BadRequestException(
            detail=f"Cannot reject request with status {mr.status}"
        )

    mr.status = MaterialRequestStatus.REJECTED
    mr.approved_by_id = user_id
    mr.approved_at = datetime.now(timezone.utc)
    await db.commit()

    await notification_service.create_notification(
        db=db,
        recipient_id=mr.requested_by_id,
        type=NotificationType.ALERT,
        title="Material Request Rejected",
        body="Your material request has been rejected.",
        action_url="/dashboard/admin/material-requests",
    )

    return await _get_request(request_id, org_id, db)


async def fulfill_material_request(
    request_id: UUID, user_id: UUID, org_id: UUID, db: AsyncSession
) -> MaterialRequest:
    """Fulfill an approved material request by issuing stock from warehouse.

    Calls inventory_service.issue_stock_to_project for each approved item.
    The spending lock is enforced within that call.
    """
    mr = await _get_request(request_id, org_id, db)
    if mr.status not in (
        MaterialRequestStatus.APPROVED,
        MaterialRequestStatus.PARTIALLY_APPROVED,
    ):
        raise BadRequestException(
            detail="Only approved requests can be fulfilled"
        )

    for mr_item in mr.items:
        qty = mr_item.quantity_approved
        if qty and qty > 0:
            await inventory_service.issue_stock_to_project(
                item_id=mr_item.item_id,
                quantity=qty,
                project_id=mr.project_id,
                user_id=user_id,
                org_id=org_id,
                db=db,
            )

    mr.status = MaterialRequestStatus.FULFILLED
    await db.commit()

    return await _get_request(request_id, org_id, db)
