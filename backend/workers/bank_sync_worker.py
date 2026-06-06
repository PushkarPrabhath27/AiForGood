from __future__ import annotations
import logging
from typing import Dict, Any, List
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.logging import logger
from models.blood_bank import BloodBank
from services.bank_sync_service import sync_bank_inventory

# HTTP Client configurations
HTTP_TIMEOUT_SECONDS: float = 10.0


async def run_bank_sync_worker(db: AsyncSession) -> Dict[str, Any]:
    """
    Background task that pulls the latest inventory from all blood bank API endpoints.
    Updates the local inventory cache in the database for each bank.

    Args:
        db (AsyncSession): Active async database session.

    Returns:
        Dict[str, Any]: Execution results metadata summary.
    """
    logger.info("initiating_blood_bank_inventory_sync_run")

    # 1. Query all blood banks in the database
    stmt = select(BloodBank)
    res = await db.execute(stmt)
    banks = list(res.scalars().all())

    success_count = 0
    failure_count = 0
    synced_items_count = 0

    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as http_client:
        for bank in banks:
            if not bank.api_endpoint:
                logger.info("skipping_sync_for_bank_missing_api_endpoint", bank_name=bank.name)
                continue

            logger.info("pulling_inventory_from_external_endpoint", bank_name=bank.name, url=bank.api_endpoint)
            
            try:
                # Dispatch HTTP GET request
                response = await http_client.get(bank.api_endpoint)
                if response.status_code != 200:
                    logger.warning(
                        "bank_inventory_pull_returned_non_200_status",
                        bank_name=bank.name,
                        status_code=response.status_code
                    )
                    failure_count += 1
                    continue

                payload = response.json()
                
                # Check for standard API envelope format or raw list
                items: List[Dict[str, Any]] = []
                if isinstance(payload, list):
                    items = payload
                elif isinstance(payload, dict):
                    # Check common envelope wrappers
                    items = payload.get("data", []) or payload.get("items", []) or payload.get("inventory", [])
                    if not items and "blood_type" in payload:
                        # Might be a single inventory dict
                        items = [payload]

                if not isinstance(items, list):
                    logger.warning("invalid_inventory_payload_format", bank_name=bank.name, payload=payload)
                    failure_count += 1
                    continue

                # Run transaction to sync inventory (this completely replaces existing inventory for this bank)
                await sync_bank_inventory(db, bank.id, items)
                
                success_count += 1
                synced_items_count += len(items)
                logger.info("inventory_synchronized_successfully", bank_name=bank.name, items_count=len(items))

            except Exception as err:
                logger.error(
                    "failed_to_synchronize_inventory_for_bank",
                    bank_name=bank.name,
                    error=str(err)
                )
                failure_count += 1
                continue

    logger.info(
        "blood_bank_inventory_sync_completed",
        success=success_count,
        failed=failure_count,
        total_items_synced=synced_items_count
    )
    
    return {
        "job_name": "bank_sync_worker",
        "success_count": success_count,
        "failure_count": failure_count,
        "synced_items_count": synced_items_count
    }
