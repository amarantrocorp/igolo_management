"""Approval chain service — configurable multi-level approval rules."""

from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.approval import (
    ApprovalEntityType,
    ApprovalLog,
    ApprovalRule,
    ApprovalStatus,
)


async def create_rule(
    entity_type: str,
    min_amount: float,
    max_amount: float | None,
    required_roles: list[str],
    org_id: UUID,
    db: AsyncSession,
) -> ApprovalRule:
    """Create a new approval rule."""
    rule = ApprovalRule(
        entity_type=ApprovalEntityType(entity_type),
        min_amount=min_amount,
        max_amount=max_amount,
        required_roles=required_roles,
        org_id=org_id,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


async def list_rules(
    db: AsyncSession,
    org_id: UUID,
    entity_type: str | None = None,
) -> list[ApprovalRule]:
    """List all approval rules, optionally filtered by entity_type."""
    query = (
        select(ApprovalRule)
        .where(ApprovalRule.org_id == org_id)
        .order_by(ApprovalRule.entity_type, ApprovalRule.min_amount)
    )
    if entity_type:
        query = query.where(ApprovalRule.entity_type == ApprovalEntityType(entity_type))
    result = await db.execute(query)
    return list(result.scalars().all())


async def delete_rule(rule_id: UUID, org_id: UUID, db: AsyncSession) -> None:
    result = await db.execute(select(ApprovalRule).where(ApprovalRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule or rule.org_id != org_id:
        raise NotFoundException(detail=f"Approval rule '{rule_id}' not found")
    await db.delete(rule)
    await db.commit()


async def initiate_approval_chain(
    entity_type: str,
    entity_id: UUID,
    amount: float,
    org_id: UUID,
    db: AsyncSession,
) -> list[ApprovalLog]:
    """Find matching rules for entity_type+amount and create ApprovalLog entries."""
    et = ApprovalEntityType(entity_type)
    amount_dec = Decimal(str(amount))

    query = select(ApprovalRule).where(
        ApprovalRule.entity_type == et,
        ApprovalRule.org_id == org_id,
        ApprovalRule.min_amount <= amount_dec,
    )
    result = await db.execute(query)
    rules = list(result.scalars().all())

    # Filter rules where max_amount is None (unlimited) or >= amount
    matching = [
        r
        for r in rules
        if r.max_amount is None or Decimal(str(r.max_amount)) >= amount_dec
    ]

    if not matching:
        return []  # No approval needed for this amount

    logs = []
    level = 1
    for rule in matching:
        for role in rule.required_roles:
            log = ApprovalLog(
                entity_type=et,
                entity_id=entity_id,
                level=level,
                required_role=role,
                status=ApprovalStatus.PENDING,
                org_id=org_id,
            )
            db.add(log)
            logs.append(log)
            level += 1

    await db.commit()
    for log in logs:
        await db.refresh(log)
    return logs


async def process_approval(
    log_id: UUID,
    approver_id: UUID,
    status: str,
    comments: str | None,
    org_id: UUID,
    db: AsyncSession,
) -> ApprovalLog:
    """Process a single approval step."""
    result = await db.execute(select(ApprovalLog).where(ApprovalLog.id == log_id))
    log = result.scalar_one_or_none()
    if not log or log.org_id != org_id:
        raise NotFoundException(detail=f"Approval log '{log_id}' not found")
    if log.status != ApprovalStatus.PENDING:
        raise BadRequestException(detail="This approval has already been processed.")

    log.approver_id = approver_id
    log.status = ApprovalStatus(status)
    log.comments = comments
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


async def get_pending_approvals(
    db: AsyncSession,
    user_role: str,
    org_id: UUID,
) -> list[ApprovalLog]:
    """Get all pending approval logs that match the user's role."""
    result = await db.execute(
        select(ApprovalLog)
        .where(
            ApprovalLog.status == ApprovalStatus.PENDING,
            ApprovalLog.required_role == user_role,
            ApprovalLog.org_id == org_id,
        )
        .order_by(ApprovalLog.created_at.desc())
    )
    return list(result.scalars().all())


async def get_entity_approvals(
    entity_type: str,
    entity_id: UUID,
    org_id: UUID,
    db: AsyncSession,
) -> list[ApprovalLog]:
    """Get all approval logs for a specific entity."""
    result = await db.execute(
        select(ApprovalLog)
        .where(
            ApprovalLog.entity_type == ApprovalEntityType(entity_type),
            ApprovalLog.entity_id == entity_id,
            ApprovalLog.org_id == org_id,
        )
        .order_by(ApprovalLog.level)
    )
    return list(result.scalars().all())


async def is_fully_approved(
    entity_type: str,
    entity_id: UUID,
    org_id: UUID,
    db: AsyncSession,
) -> bool:
    """Check if all approval steps for an entity are approved."""
    logs = await get_entity_approvals(entity_type, entity_id, org_id, db)
    if not logs:
        return True  # No approval chain -> auto-approved
    return all(log.status == ApprovalStatus.APPROVED for log in logs)
