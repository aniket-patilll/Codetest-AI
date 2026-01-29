"""
Application configuration using Pydantic Settings.
Loads from environment variables or .env file.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        extra="ignore",
        env_file=".env",
        env_file_encoding="utf-8",
    )
    
    # Supabase
    supabase_url: str
    supabase_key: str
    supabase_service_key: str
    supabase_jwt_secret: str
    
    # Groq (OpenAI-compatible, free tier: https://api.groq.com/openai/v1)
    groq_api_key: str = Field(validation_alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.1-8b-instant", validation_alias="GROQ_MODEL")
    
    # Code Execution
    code_timeout_seconds: int = 10
    code_memory_limit_mb: int = 256
    
    # Environment
    environment: str = "development"
    
    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8080", "http://127.0.0.1:5173", "http://127.0.0.1:8080", "https://codetest-ai-at8z.onrender.com", "https://code-test-ai-phi.vercel.app"]


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
