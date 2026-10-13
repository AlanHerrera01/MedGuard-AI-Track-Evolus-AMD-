"""Punto de entrada de la API FastAPI.

Capa de transporte: define los endpoints, configura CORS y conecta
las peticiones HTTP con el orquestador del dominio (`core`).
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from src import __version__
from src.config import settings
from src.core.orchestrator import ClinicalOrchestrator
from src.schemas.audit_schemas import AuditReportResponse, AuditRequest

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger("medguard")


class HealthResponse(BaseModel):
    """Respuesta del endpoint de salud."""

    status: str = Field(default="ok")
    version: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestiona el ciclo de vida de la aplicación (startup / shutdown)."""
    logger.info("Iniciando %s [%s]", settings.app_name, settings.environment)
    app.state.orchestrator = ClinicalOrchestrator()
    yield
    logger.info("Deteniendo %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description="Backend de auditoría agéntica MedGuard AI (Evolus + AMD).",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    """Comprobación de salud para Docker / balanceadores."""
    return HealthResponse(status="ok", version=__version__)


@app.post(
    "/api/v1/audit",
    response_model=AuditReportResponse,
    status_code=status.HTTP_200_OK,
    tags=["audit"],
)
async def create_audit(payload: AuditRequest) -> AuditReportResponse:
    """Procesa una auditoría administrativa del documento clínico.

    Inicia el pipeline: Evolus (extracción) → AMD (agente auditor) con
    fallback determinista y regla de confianza (< 0.85 → override humano).
    """
    orchestrator: ClinicalOrchestrator = app.state.orchestrator
    try:
        result = await orchestrator.process_audit(payload.document_text)
        return AuditReportResponse.model_validate(result)
    except ValueError as exc:
        logger.warning("Petición inválida en /api/v1/audit: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc) or "Solicitud inválida.",
        ) from exc
    except Exception as exc:  # noqa: BLE001 - se traduce a error HTTP controlado
        logger.exception("Fallo inesperado al ejecutar la auditoría")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al procesar la auditoría.",
        ) from exc


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Manejador global de excepciones HTTP con respuesta limpia."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": exc.status_code,
            "message": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Manejador global para excepciones no capturadas."""
    logger.exception("Excepción no manejada en %s", request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "code": 500,
            "message": "Error interno del servidor.",
        },
    )
