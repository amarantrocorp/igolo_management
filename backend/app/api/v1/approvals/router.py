from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_auth_context, role_required, AuthContext
from app.db.session import get_db
from app.schemas.approval import (
    ApprovalAction,
    ApprovalLogResponse,
    ApprovalRuleCreate,
    ApprovalRuleResponse,
)
from app.services import approval_service

router = APIRouter()


# ---- Approval Rules (CRUD) ----


@router.post(
    "/rules",
    response_model=ApprovalRuleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_approval_rule(
    data: ApprovalRuleCreate,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["SUPER_ADMIN"])),
):
    """Create a new approval rule."""
    return await approval_service.create_rule(
        entity_type=data.entity_type,
        min_amount=data.min_amount,
        max_amount=data.max_amount,
        required_roles=data.required_roles,
        org_id=ctx.org_id,
        db=db,
    )


@router.get("/rules", response_model=list[ApprovalRuleResponse])
async def list_approval_rules(
    entity_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """List all approval rules."""
    return await approval_service.list_rules(db, org_id=ctx.org_id, entity_type=entity_type)


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_approval_rule(
    rule_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["SUPER_ADMIN"])),
):
    """Delete an approval rule."""
    await approval_service.delete_rule(rule_id, ctx.org_id, db)


# ---- Approval Chain ----


@router.post("/initiate", response_model=list[ApprovalLogResponse])
async def initiate_approval(
    entity_type: str = Query(...),
    entity_id: UUID = Query(...),
    amount: float = Query(...),
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Initiate an approval chain for an entity."""
    return await approval_service.initiate_approval_chain(
        entity_type=entity_type,
        entity_id=entity_id,
        amount=amount,
        org_id=ctx.org_id,
        db=db,
    )


@router.patch("/{log_id}", response_model=ApprovalLogResponse)
async def process_approval(
    log_id: UUID,
    action: ApprovalAction,
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Approve or reject an approval step."""
    return await approval_service.process_approval(
        log_id=log_id,
        approver_id=ctx.user.id,
        status=action.status,
        comments=action.comments,
        org_id=ctx.org_id,
        db=db,
    )


@router.get("/pending", response_model=list[ApprovalLogResponse])
async def get_pending_approvals(
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Get all pending approvals for the current user's role."""
    return await approval_service.get_pending_approvals(
        db=db, user_role=ctx.role.value, org_id=ctx.org_id
    )


@router.get("/entity", response_model=list[ApprovalLogResponse])
async def get_entity_approvals(
    entity_type: str = Query(...),
    entity_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Get approval history for a specific entity."""
    return await approval_service.get_entity_approvals(
        entity_type=entity_type, entity_id=entity_id, org_id=ctx.org_id, db=db
    )
