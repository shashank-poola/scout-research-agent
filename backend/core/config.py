from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    groq_api_key: str = ""
    exa_api_key: str = ""
    database_url: str = "sqlite:///./scout.db"
    storage_dir: str = "storage/reports"
    log_level: str = "INFO"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]


settings = Settings()
