"""
Donor Churn Background Worker — scheduled job for Innovation 1.

Wired into the APScheduler; runs every 6 hours to scan all guardians
for engagement drift and dispatch re-engagement nudges via Bedrock.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import logger
from services.donor_churn_service import run_churn_scan


async def run_donor_churn_worker(db: AsyncSession) -> Dict[str, Any]:
    """Execute a full donor churn CUSUM scan pass.

    Args:
        db: Active async database session.

    Returns:
        Dict[str, Any]: Execution summary for logging.
    """
    logger.info("donor_churn_worker_started")
    start_time = datetime.utcnow()

    result = await run_churn_scan(db)

    duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
    result["duration_ms"] = duration_ms

    logger.info("donor_churn_worker_completed", **result)
    return result
