import sys
from pathlib import Path
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

# Add backend directory to Python path to cleanly resolve modules during migrations
sys.path.insert(0, ".")

from db.session import Base
from models.patient import Patient
from models.hb_reading import HbReading
from models.forecast import Forecast
from models.guardian import Guardian
from models.blood_bank import BloodBank
from models.inventory import Inventory
from models.alert import Alert
from models.engagement import DonorEngagementSignal, DonorChurnScore
from models.sentinel import CaregiverCheckin, SentinelAlert
from models.memorial import GuardianMemorialMessage, CircleRepairLog
from models.weather import BloodWeatherForecast

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Overwrite the database URL inside alembic.ini with the sync database URL from core settings
from core.config import settings
config.set_main_option("sqlalchemy.url", settings.database_url_sync)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's DeclarativeBase object here
# for 'autogenerate' support
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
