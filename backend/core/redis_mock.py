import logging

logger = logging.getLogger(__name__)

class MockRedis:
    """
    In-memory async Redis mock.
    Saves $12 of ElastiCache costs by intercepting all redis.asyncio commands
    and backing them with a Python dictionary cache.
    """
    _store = {}

    @classmethod
    def from_url(cls, url, *args, **kwargs):
        # We log this at debug level to keep logs clean, or info once at startup
        logger.debug(f"Intercepted Redis connection. Routing to In-Memory Cache.")
        return cls()

    async def get(self, key: str):
        val = self._store.get(key)
        if val is not None:
            # Redis get returns bytes
            return val.encode('utf-8')
        return None

    async def set(self, key: str, value: str, *args, **kwargs):
        self._store[key] = str(value)
        return True

    async def setex(self, key: str, ttl: int, value: str):
        self._store[key] = str(value)
        return True

    async def delete(self, key: str):
        if key in self._store:
            del self._store[key]
            return 1
        return 0

    async def aclose(self):
        pass
