from __future__ import annotations
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db_session
from models.guardian import Guardian
from models.engagement import DonorChurnScore, EngagementTrend
from schemas.common import ApiResponse
from services.donor_churn_service import trigger_reengagement_if_needed

router = APIRouter(prefix="/guardians", tags=["Guardians Direct"])

@router.post(
    "/{guardian_id}/reengage",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Force a manual re-engagement nudge to a guardian",
)
async def manual_reengage_guardian(
    guardian_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> ApiResponse[Dict[str, Any]]:
    """Force-sends a personalized Bedrock re-engagement message to a guardian via Telegram."""
    # 1. Fetch guardian
    g_stmt = select(Guardian).where(Guardian.id == guardian_id)
    g_res = await db.execute(g_stmt)
    guardian = g_res.scalar_one_or_none()
    if not guardian:
        raise HTTPException(status_code=404, detail=f"Guardian with ID {guardian_id} not found.")

    # 2. Fetch or create churn score row
    cs_stmt = select(DonorChurnScore).where(DonorChurnScore.guardian_id == guardian_id)
    cs_res = await db.execute(cs_stmt)
    score_row = cs_res.scalar_one_or_none()
    if not score_row:
        score_row = DonorChurnScore(
            guardian_id=guardian_id,
            cusum_score=0.0,
            engagement_trend=EngagementTrend.stable,
        )
        db.add(score_row)
        await db.flush()

    # 3. Force critical trend and clear cooldown temporarily to ensure message dispatch
    old_trend = score_row.engagement_trend
    old_sent_at = score_row.reengagement_sent_at
    old_attempted = score_row.reengagement_attempted

    score_row.engagement_trend = EngagementTrend.critical
    score_row.reengagement_sent_at = None
    score_row.reengagement_attempted = False

    try:
        dispatched = await trigger_reengagement_if_needed(guardian, score_row, db)
        if not dispatched:
            # Restore old state if dispatch failed
            score_row.engagement_trend = old_trend
            score_row.reengagement_sent_at = old_sent_at
            score_row.reengagement_attempted = old_attempted
            db.add(score_row)
            await db.flush()
            raise HTTPException(status_code=500, detail="Failed to dispatch re-engagement nudge.")
            
        return ApiResponse(
            success=True,
            data={
                "dispatched": True,
                "message": f"Re-engagement nudge successfully generated and sent to {guardian.name} via Telegram!",
            },
            error=None
        )
    except Exception as exc:
        # Restore old state on error
        score_row.engagement_trend = old_trend
        score_row.reengagement_sent_at = old_sent_at
        score_row.reengagement_attempted = old_attempted
        db.add(score_row)
        await db.flush()
        raise HTTPException(status_code=500, detail=f"Error dispatching re-engagement: {str(exc)}")
