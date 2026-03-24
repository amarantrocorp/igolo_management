from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Provider: "gemini" or "ollama"
    AI_PROVIDER: str = "gemini"

    # Gemini settings
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # Ollama settings
    OLLAMA_BASE_URL: str = "http://host.docker.internal:11434"
    OLLAMA_MODEL: str = "llava:13b"

    BACKEND_URL: str = "http://backend:8000"
    CORS_ORIGINS: str = "http://localhost:3000"
    REQUEST_TIMEOUT: int = 300  # 5 min — Ollama vision models are slow on CPU

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
