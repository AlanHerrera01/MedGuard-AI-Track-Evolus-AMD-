"""Configuración central de la aplicación.

Carga las variables de entorno mediante Pydantic Settings, ofreciendo
un objeto único y tipado (`settings`) para evitar `os.environ` disperso
en el código. Esta capa no conoce detalles del dominio ni del transporte.
"""

from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración tipada de la aplicación."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Aplicación ---
    app_name: str = Field(default="MedGuard AI", alias="APP_NAME")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # --- Servidor ---
    backend_host: str = Field(default="0.0.0.0", alias="BACKEND_HOST")
    backend_port: int = Field(default=8000, alias="BACKEND_PORT")
    cors_origins: str = Field(
        default="http://localhost:5173",
        alias="CORS_ORIGINS",
    )

    # --- Evolus AI ---
    evolus_base_url: str = Field(
        default="https://api.evolus.example.com/v1",
        validation_alias=AliasChoices("EVOLUS_BASE_URL", "EVOLUS_API_BASE_URL"),
    )
    evolus_api_key: str = Field(default="", alias="EVOLUS_API_KEY")
    evolus_application_id: str = Field(default="", alias="EVOLUS_APPLICATION_ID")
    evolus_timeout_seconds: int = Field(default=30, alias="EVOLUS_TIMEOUT_SECONDS")

    # --- Gemini ---
    llm_provider: Literal["gemini"] = Field(
        default="gemini",
        alias="LLM_PROVIDER",
    )
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    gemini_model: str = Field(
        default="gemini-2.5-flash",
        alias="GEMINI_MODEL",
    )
    # Reutilizar temperatura y max_tokens para compatibilidad
    llm_temperature: float = Field(default=0.2, alias="LLM_TEMPERATURE")
    llm_max_tokens: int = Field(default=2048, alias="LLM_MAX_TOKENS")

    # --- AMD Cloud / TokenFactory (API OpenAI-compatible) ---
    amd_cloud_base_url: str = Field(
        default="https://cloud.amd.example.com",
        alias="AMD_CLOUD_BASE_URL",
    )
    amd_api_key: str = Field(default="", alias="AMD_API_KEY")
    amd_token_endpoint: str = Field(
        default="https://notebooks.amd.com/tokenfactory/v1",
        validation_alias=AliasChoices("AMD_TOKEN_ENDPOINT", "AMD_TOKEN_FACTORY_URL"),
    )
    amd_model_name: str = Field(
        default="meta-llama/Llama-3.1-8B-Instruct",
        validation_alias=AliasChoices("AMD_MODEL_NAME", "AMD_MODEL"),
    )
    amd_temperature: float = Field(default=0.0, alias="AMD_TEMPERATURE")
    amd_timeout_seconds: int = Field(default=60, alias="AMD_TIMEOUT_SECONDS")
    # Conector dual del Agente Auditor (desarrollo híbrido local):
    #   auto -> vLLM/ROCm real si endpoint + API key están definidos; si no, mock local.
    #   live -> fuerza la llamada real a la GPU AMD.
    #   mock -> nunca llama a AMD; simula la auditoría de forma determinista local.
    amd_mode: Literal["auto", "live", "mock"] = Field(default="auto", alias="AMD_MODE")

    @property
    def cors_origins_list(self) -> list[str]:
        """Devuelve los orígenes CORS como lista normalizada."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Devuelve una instancia cacheada de la configuración."""
    return Settings()


settings = get_settings()
