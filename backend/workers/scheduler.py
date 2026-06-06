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


async def run_bank_sync_job() -> None:
    """Trigger job running periodic inventory pulls from external blood bank endpoints."""
    logger.info("background_job_triggered", job_name="bank_sync")
    from workers.bank_sync_worker import run_bank_sync_worker
    
    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            res = await run_bank_sync_worker(session)
            logger.info("background_job_completed", job_name="bank_sync", result=res)
        except Exception as err:
            logger.error("background_job_failed", job_name="bank_sync", error=str(err))


async def run_donor_churn_job() -> None:
    """Trigger CUSUM churn scan across all guardians (Innovation 1: Living Circle)."""
    logger.info("background_job_triggered", job_name="donor_churn")
    from workers.donor_churn_worker import run_donor_churn_worker

    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            res = await run_donor_churn_worker(session)
            logger.info("background_job_completed", job_name="donor_churn", result=res)
        except Exception as err:
            logger.error("background_job_failed", job_name="donor_churn", error=str(err))


async def run_blood_weather_job() -> None:
    """Generate weekly blood weather demand-supply forecasts (Innovation 6)."""
    logger.info("background_job_triggered", job_name="blood_weather")
    from services.blood_weather_service import generate_blood_weather_forecast

    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            res = await generate_blood_weather_forecast(session)
            logger.info("background_job_completed", job_name="blood_weather", result=res)
        except Exception as err:
            logger.error("background_job_failed", job_name="blood_weather", error=str(err))


async def run_fatigue_lift_job() -> None:
    """Lift expired fatigue rest periods for eligible guardians (Innovation 4)."""
    logger.info("background_job_triggered", job_name="fatigue_lift")
    from services.fatigue_service import lift_expired_fatigue_rests

    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            res = await lift_expired_fatigue_rests(session)
            logger.info("background_job_completed", job_name="fatigue_lift", result=res)
        except Exception as err:
            logger.error("background_job_failed", job_name="fatigue_lift", error=str(err))


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

    # 4. Register blood bank inventory sync running hourly
    scheduler.add_job(
        run_bank_sync_job,
        trigger=IntervalTrigger(hours=1),
        id="bank_sync_job",
        replace_existing=True
    )

    # 5. Register CUSUM donor churn scan every 6 hours (Innovation 1: Living Circle)
    scheduler.add_job(
        run_donor_churn_job,
        trigger=IntervalTrigger(hours=6),
        id="donor_churn_job",
        replace_existing=True
    )

    # 6. Register blood weather forecast daily at 03:00 AM (Innovation 6)
    scheduler.add_job(
        run_blood_weather_job,
        trigger=CronTrigger(hour=3, minute=0),
        id="blood_weather_job",
        replace_existing=True
    )

    # 7. Lift expired fatigue rests daily at 01:00 AM (Innovation 4)
    scheduler.add_job(
        run_fatigue_lift_job,
        trigger=CronTrigger(hour=1, minute=0),
        id="fatigue_lift_job",
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
