import redis as sync_redis
import redis.asyncio as redis

from telemetry.config import settings

redis_client = redis.Redis(
    host=settings.redis_host, port=settings.redis_port, db=0, decode_responses=True
)

redis_sync = sync_redis.Redis(
    host=settings.redis_host, port=settings.redis_port, db=0, decode_responses=True
)
