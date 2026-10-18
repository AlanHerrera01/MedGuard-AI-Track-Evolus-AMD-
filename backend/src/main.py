"""Punto de entrada de la API FastAPI.

Capa de transporte: define los endpoints, configura CORS y conecta
las peticiones HTTP con el orquestador del dominio (`core`).
"""

import logging
from contextlib import asynccontextmanager
from io import BytesIO

import pdfplumber
from fastapi import FastAPI, HTTPException, Request, status, UploadFile, File
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


class DocumentExtractResponse(BaseModel):
    """Respuesta de la extracción de texto desde un archivo clínico."""

    status: str = Field(default="ok")
    filename: str = Field(description="Nombre del archivo procesado.")
    pages: int = Field(default=1, description="Número de páginas extraídas.")
    text: str = Field(description="Texto clínico extraído del documento.")


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
    "/api/v1/extract-pdf",
    response_model=DocumentExtractResponse,
    status_code=status.HTTP_200_OK,
    tags=["documents"],
)
@app.post(
    "/api/v1/extract-document",
    response_model=DocumentExtractResponse,
    status_code=status.HTTP_200_OK,
    tags=["documents"],
)
async def extract_document(file: UploadFile = File(...)) -> DocumentExtractResponse:
    """Extrae texto clínico desde un archivo PDF o TXT subido por el usuario.

    Permite previsualizar y editar el documento en el buffer clínico antes
    de enviarlo al pipeline de auditoría (Evolus Extractor + AMD Auditor).
    """
    filename = file.filename or "documento"
    extension = filename.split(".")[-1].lower() if "." in filename else ""

    # Validar formato permitido (.pdf o .txt)
    is_valid_ext = extension in ("pdf", "txt")
    is_valid_mime = file.content_type in ("application/pdf", "text/plain")
    if (extension and not is_valid_ext) or (not is_valid_ext and not is_valid_mime):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato no soportado. Por favor sube un archivo .pdf o .txt.",
        )

    try:
        contents = await file.read()
    except Exception as exc:
        logger.error("Error al leer el archivo subido %s: %s", filename, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo leer el archivo subido.",
        ) from exc

    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo subido está vacío.",
        )

    text = ""
    pages_count = 1

    if extension == "pdf" or file.content_type == "application/pdf":
        try:
            with pdfplumber.open(BytesIO(contents)) as pdf:
                pages_count = len(pdf.pages)
                extracted_pages = []
                for p in pdf.pages:
                    page_text = p.extract_text()
                    if page_text:
                        extracted_pages.append(page_text.strip())
                text = "\n\n".join(extracted_pages).strip()
        except Exception as exc:
            logger.warning(
                "Fallo en pdfplumber para %s, intentando fallback con pypdf: %s",
                filename,
                exc,
            )
            try:
                import pypdf

                reader = pypdf.PdfReader(BytesIO(contents))
                pages_count = len(reader.pages)
                extracted_pages = [
                    p.extract_text().strip() for p in reader.pages if p.extract_text()
                ]
                text = "\n\n".join(extracted_pages).strip()
            except Exception as inner_exc:
                logger.error("Fallo definitivo al parsear PDF %s: %s", filename, inner_exc)
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="El archivo PDF está dañado o no se pudo interpretar.",
                ) from inner_exc

        if not text:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="El PDF no contiene texto legible (posiblemente es un documento escaneado como imagen pura).",
            )
    else:
        # Texto plano .txt
        try:
            text = contents.decode("utf-8").strip()
        except UnicodeDecodeError:
            text = contents.decode("latin-1", errors="replace").strip()

    return DocumentExtractResponse(
        status="ok",
        filename=filename,
        pages=pages_count,
        text=text,
    )


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
