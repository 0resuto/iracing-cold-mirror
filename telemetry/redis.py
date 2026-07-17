import redis
from telemetry.config import settings

redis_client = redis.Redis(
    host=settings.redis_host, 
    port=settings.redis_port, 
    db=0, 
    decode_responses=True
)