from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://iracing:iracing_local@localhost:5432/telemetry"
    redis_host: str = "localhost"
    redis_port: int = 6379

    class Config:
        env_file = ".env"

settings = Settings()