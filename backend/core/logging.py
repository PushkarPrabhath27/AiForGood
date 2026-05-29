import structlog

def configure_logging() -> None:
    """
    Configures structlog to render log outputs in structured JSON format
    for high observability in production environments.
    """
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer(),
        ]
    )

logger = structlog.get_logger()
configure_logging()
