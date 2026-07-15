from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://iracing:iracing_local@localhost:5432/telemetry"
    
    postgres_user: str = "iracing"
    postgres_password: str = "iracing_local"
    postgres_db: str = "telemetry"

    redis_host: str = "localhost"
    redis_port: int = 6379

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()