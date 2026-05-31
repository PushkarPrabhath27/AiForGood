from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from api.routers import health, forecasts, guardians
from core.config import settings
from core.exceptions import RaktaSetuException
from core.logging import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles application startup and shutdown lifecycle events.
    Enables initialization of connection pools and external APIs.
    """
    logger.info("application_startup_initiated", environment=settings.app_env)
    if settings.app_env != "test":
        from workers.scheduler import start_scheduler
        start_scheduler()
    yield
    if settings.app_env != "test":
        from workers.scheduler import stop_scheduler
        stop_scheduler()
    logger.info("application_shutdown_initiated")

# Instantiate core FastAPI application
app = FastAPI(
    title="RaktaSetu NOOR",
    description="Empathetic, Predictive Blood Management Infrastructure for Thalassemia Care.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register a global exception handler for custom RaktaSetuExceptions
@app.exception_handler(RaktaSetuException)
async def raktasetu_exception_handler(request: Request, exc: RaktaSetuException) -> JSONResponse:
    """
    Catches all domain-specific exceptions and serializes them into
    the standardized ApiResponse JSON envelope.
    """
    logger.warning(
        "api_domain_exception_handled",
        path=request.url.path,
        exception=exc.__class__.__name__,
        status_code=exc.status_code,
        detail=exc.detail
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": exc.__class__.__name__,
                "message": exc.detail
            }
        }
    )

# Register route controllers
app.include_router(health.router, prefix="/health", tags=["System Diagnostics"])

# Register API v1 sub-routers
from fastapi import APIRouter
from api.routers import grid, alerts, chatbot, patients
api_router = APIRouter(prefix="/api/v1")
api_router.include_router(patients.router, prefix="/patients", tags=["Patients Directory"])
api_router.include_router(forecasts.router, prefix="/patients", tags=["Forecasting"])
api_router.include_router(guardians.router, prefix="/patients", tags=["Guardians"])
api_router.include_router(alerts.router, prefix="/patients", tags=["Alerts"])
api_router.include_router(grid.router, prefix="/grid", tags=["RaktaGrid Optimization"])
api_router.include_router(chatbot.router, tags=["Saathi Chatbot"])
app.include_router(api_router)

@app.get("/")
async def root_redirect():
    """Redirects to root health information."""
    return {"message": "Welcome to the RaktaSetu NOOR API platform. Navigate to /docs for specifications."}
