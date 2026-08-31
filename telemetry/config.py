import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://iracing:iracing_local@localhost:5432/telemetry"
    server_url: str = "http://localhost:8000"
    cors_origins: list[str] = ["http://localhost:5173"]
    api_key: str | None = None

    postgres_user: str = "iracing"
    postgres_password: str = "iracing_local"
    postgres_db: str = "telemetry"

    redis_host: str = "localhost"
    redis_port: int = 6379

    admin_username: str = "admin"
    admin_password: str | None = None
    admin_password_hash: str | None = None
    jwt_secret_key: str = "change-in-production-1234567890"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    iracing_telemetry_dir: str = os.path.expanduser(r"~\Documents\iRacing\telemetry")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
