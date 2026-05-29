from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from core.logging import logger

# Defer engine and session maker creation to prevent startup import circles
_engine = None
_async_session_maker = None

def get_engine():
    """
    Lazy engine factory that creates and caches the async database engine
    upon first demand.
    
    Returns:
        AsyncEngine: The active SQLAlchemy async engine.
    """
    global _engine
    if _engine is None:
        from core.config import settings
        _engine = create_async_engine(settings.database_url, future=True)
    return _engine

def get_session_maker():
    """
    Lazy session maker factory that creates and caches the async session maker.
    
    Returns:
        async_sessionmaker: The active SQLAlchemy async session maker.
    """
    global _async_session_maker
    if _async_session_maker is None:
        _async_session_maker = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            future=True
        )
    return _async_session_maker

# Base class for declarative models
Base = declarative_base()

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injection session generator utilizing lazy session makers.
    
    Yields:
        AsyncSession: An active SQLAlchemy async session.
    """
    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception as err:
            await session.rollback()
            logger.error("db_session_transaction_failed", error=str(err))
            raise err
        finally:
            await session.close()
