"""Esquemas Pydantic v2 para la API de auditoría.

Define los DTOs de entrada y salida del endpoint `/api/v1/audit`, incluyendo
validación estricta, generación automática de documentación OpenAPI y
serialización/deserialización a/from JSON.
"""

from typing import Any

from pydantic import BaseModel, Field, field_validator


class AuditRequest(BaseModel):
    """Solicitud de auditoría.

    Attributes:
        document_text: Texto del documento a auditar.
        lang: Código de idioma (por defecto "en").
        document_file: Archivo PDF/txt (opcional, si se sube un archivo).
    """

    document_text: str = Field(
        default="",
        description="Texto del documento a auditar.",
        min_length=1,
    )
    lang: str = Field(default="en", description="Código de idioma (en/es).")
    # document_file se maneja separadamente en FastAPI como UploadFile

    @field_validator("document_text")
    @classmethod
    def validate_document_text(cls, v: str) -> str:
        """Valida que el texto no esté vacío."""
        if not v or not v.strip():
            raise ValueError("document_text no puede estar vacío.")
        return v.strip()


class AuditReportResponse(BaseModel):
    """Informe de auditoría generado por el Agente Auditor.

    Attributes:
        status: Estado del proceso ("completed" o "failed").
        procedure_name: Nombre del procedimiento o finalidad extraído.
        patient_id_masked: Identificador del paciente enmascarado (GDPR).
        missing_fields: Lista de campos obligatorios ausentes.
        clinical_risks: Lista de riesgos clínicos/documentales detectados.
        requires_human_override: Indica si requiere revisión humana obligatoria.
        audit_confidence_score: Puntuación de confianza del análisis (0.0-1.0).
        safety_notice: Nota de seguridad para informes simulados o con riesgo.
    """

    status: str = Field(
        default="completed",
        pattern="^(completed|failed)$",
        description="Estado del proceso de auditoría.",
    )
    procedure_name: str = Field(
        default="UNKNOWN",
        description="Nombre del procedimiento o finalidad extraído.",
    )
    patient_id_masked: str = Field(
        default="[REDACTED]",
        description="Identificador del paciente enmascarado (GDPR).",
    )
    missing_fields: list[str] = Field(
        default_factory=list,
        description="Lista de campos obligatorios ausentes en el documento.",
    )
    clinical_risks: list["ClinicalRisk"] = Field(
        default_factory=list,
        description="Lista de riesgos clínicos/documentales detectados.",
    )
    requires_human_override: bool = Field(
        default=False,
        description="Indica si requiere revisión humana obligatoria.",
    )
    audit_confidence_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Puntuación de confianza del análisis (0.0-1.0).",
    )
    safety_notice: str | None = Field(
        default=None,
        description="Nota de seguridad para informes simulados o con riesgo.",
    )


class ClinicalRisk(BaseModel):
    """Riesgo clínico o documental detectado por el agente auditor.

    Attributes:
        risk_category: Categoría del riesgo (LEGAL_COMPLIANCE, CONSENT_GAP, etc.).
        description: Descripción detallada del riesgo.
        severity: Nivel de severidad (HIGH, MEDIUM, LOW).
    """

    risk_category: str = Field(
        default="LEGAL_COMPLIANCE",
        description="Categoría del riesgo detectado.",
    )
    description: str = Field(
        default="",
        description="Descripción detallada del riesgo.",
    )
    severity: str = Field(
        default="MEDIUM",
        pattern="^(HIGH|MEDIUM|LOW)$",
        description="Nivel de severidad del riesgo.",
    )


# Importar aquí para evitar dependencia circular
AuditReportResponse.model_rebuild()