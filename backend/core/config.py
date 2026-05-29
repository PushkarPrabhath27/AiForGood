from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables and local .env files.
    Enforces strict validation of DB URLs and secret keys on startup to prevent credential leakage.
    Looks for .env in both current and parent directories to support subdirectory run contexts.
    Extra variables in .env (like Docker parameters) are ignored.
    """
    app_env: str = "development"
    app_secret_key: str = Field(..., min_length=32)
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    
    # DB URLs must be defined in the environment/ .env file — NO defaults in code to prevent leaks.
    database_url: str = Field(...)
    database_url_sync: str = Field(...)
    
    # Cache Configurations
    redis_url: str = Field(default="redis://localhost:6379")
    
    # Supabase Integrations (Auth / RLS Validation)
    supabase_url: str = ""
    supabase_service_key: str = ""
    
    # Clinical AI / Messaging Integrations
    anthropic_api_key: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = "whatsapp:+14155238886"
    sarvam_api_key: str = ""
    
    # CORS White-list
    frontend_url: str = "http://localhost:3000"

    # Multi-path search for .env ensures robust execution from both root and backend/ subdirectories
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

settings = Settings()
