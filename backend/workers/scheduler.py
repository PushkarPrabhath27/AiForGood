from __future__ import annotations
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from core.logging import logger
from db.session import get_session_maker

# Initialize the shared AsyncIOScheduler instance
scheduler = AsyncIOScheduler()


async def run_hb_forecast_job() -> None:
    """Trigger job running clinical forecaster calculations for all active patients."""
    logger.info("background_job_triggered", job_name="hb_forecast")
    from workers.hb_forecast_worker import run_hb_forecast_worker
    
    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            res = await run_hb_forecast_worker(session)
            logger.info("background_job_completed", job_name="hb_forecast", result=res)
        except Exception as err:
            logger.error("background_job_failed", job_name="hb_forecast", error=str(err))


async def run_circle_health_job() -> None:
    """Trigger job recalculating circle scores and pair-survivability resilience."""
    logger.info("background_job_triggered", job_name="circle_health")
    from workers.circle_health_worker import run_circle_health_worker
    
    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            res = await run_circle_health_worker(session)
            logger.info("background_job_completed", job_name="circle_health", result=res)
        except Exception as err:
            logger.error("background_job_failed", job_name="circle_health", error=str(err))


async def run_inventory_match_job() -> None:
    """Trigger job executing CP-SAT blood bank inventory optimization across cities."""
    logger.info("background_job_triggered", job_name="inventory_match")
    from workers.inventory_match_worker import run_inventory_match_worker
    
    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            res = await run_inventory_match_worker(session)
            logger.info("background_job_completed", job_name="inventory_match", result=res)
        except Exception as err:
            logger.error("background_job_failed", job_name="inventory_match", error=str(err))


def start_scheduler() -> None:
    """
    Initializes and starts the periodic scheduler engine.
    Registers jobs under non-blocking AsyncIO loops.
    """
    logger.info("starting_background_task_scheduler")
    
    # 1. Register Prophet forecast calculations daily at 02:00 AM
    scheduler.add_job(
        run_hb_forecast_job,
        trigger=CronTrigger(hour=2, minute=0),
        id="hb_forecast_job",
        replace_existing=True
    )

    # 2. Register circle health score updating hourly
    scheduler.add_job(
        run_circle_health_job,
        trigger=IntervalTrigger(hours=1),
        id="circle_health_job",
        replace_existing=True
    )

    # 3. Register OR-Tools optimization matches running every 6 hours
    scheduler.add_job(
        run_inventory_match_job,
        trigger=IntervalTrigger(hours=6),
        id="inventory_match_job",
        replace_existing=True
    )

    scheduler.start()
    logger.info("background_task_scheduler_started_successfully")


def stop_scheduler() -> None:
    """
    Stops the scheduler, releasing resources and terminating queued executors.
    """
    logger.info("shutting_down_background_task_scheduler")
    try:
        scheduler.shutdown(wait=False)
        logger.info("background_task_scheduler_shutdown_completed")
    except Exception as err:
        logger.warning("scheduler_shutdown_failed", error=str(err))
