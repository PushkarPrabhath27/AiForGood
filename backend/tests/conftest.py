"""
Session-scoped pytest conftest.

Creates all SQLAlchemy tables and seeds demo data exactly once before
the test session starts. This replaces relying on the FastAPI lifespan
event for DB initialisation, which is too late when tests open raw
sessions directly.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

# Ensure `backend/` is on sys.path so every test module can import `api`,
# `db`, `models`, etc. without a package prefix.
_BACKEND = Path(__file__).resolve().parent.parent   # …/AIforgood/backend
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))


# ---------------------------------------------------------------------------
# Session-scoped fixture: create tables + seed once for the whole test run
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def initialise_database():
    """Create all ORM tables and seed demo data before any test runs.

    Uses the *synchronous* SQLAlchemy engine so it can run inside a plain
    (non-async) fixture without requiring an event-loop fixture dependency.

    Yields:
        None — the fixture is used purely for its side-effects.
    """
    from sqlalchemy import create_engine, inspect, text
    from core.config import settings

    # Import every model so SQLAlchemy's metadata is fully populated
    from db.session import Base
    import models.patient        # noqa: F401
    import models.hb_reading     # noqa: F401
    import models.forecast       # noqa: F401
    import models.guardian       # noqa: F401
    import models.blood_bank     # noqa: F401
    import models.inventory      # noqa: F401
    import models.alert          # noqa: F401

    sync_engine = create_engine(settings.database_url_sync, future=True)

    # Create any tables that don't exist yet (safe on an existing populated DB)
    Base.metadata.create_all(sync_engine)

    # Add telegram_chat_id column if it was missing from an older DB file
    with sync_engine.connect() as conn:
        inspector = inspect(sync_engine)
        existing_cols = [c["name"] for c in inspector.get_columns("guardians")]
        if "telegram_chat_id" not in existing_cols:
            conn.execute(
                text("ALTER TABLE guardians ADD COLUMN telegram_chat_id VARCHAR(20)")
            )
            conn.commit()

    # Seed demo data (the function is idempotent — skips if Priya already exists)
    from db.seed_demo_data import seed_database
    seed_database()

    yield

    sync_engine.dispose()
