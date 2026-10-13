"""DTOs de auditoría clínica de MedGuard AI (Pydantic v2).

Define el flujo completo de auditoría:

- ``AuditRequest``: contrato de entrada del cliente.
- ``ClinicalRisk``: riesgo clínico/legal individual identificado.
- ``AuditReportResponse``: informe final de la auditoría.

Se prioriza lo que exige la especificación: type hints estrictos con
valores anotados y descripciones claras en cada campo.
"""

from pydantic import BaseModel, ConfigDict, Field


class AuditRequest(BaseModel):
    """Petición de auditoría de un documento clínico.

    Attributes:
        document_text: Texto completo del documento a auditar.
    """

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    document_text: str = Field(
        min_length=1,
        description="Texto completo del documento clínico a auditar.",
    )


class ClinicalRisk(BaseModel):
    """Riesgo clínico o legal identificado durante la auditoría.

    Attributes:
        risk_category: Categoría del riesgo (p. ej. DOSAGE_CHECK, CONSENT_GAP,
            ALLERGY_WARNING, LEGAL_COMPLIANCE).
        description: Explicación del riesgo detectado en el documento.
        severity: Gravedad estimada del riesgo (HIGH, MEDIUM o LOW).
    """

    model_config = ConfigDict(
        extra="ignore",
        str_strip_whitespace=True,
    )

    risk_category: str = Field(
        min_length=1,
        description=(
            "Categoría del riesgo detectado (p. ej. ALLERGY_WARNING, CONSENT_GAP, "
            "DOSAGE_CHECK, LEGAL_COMPLIANCE)."
        ),
    )
    description: str = Field(
        min_length=1,
        description="Descripción del riesgo clínico o legal identificado.",
    )
    severity: str = Field(
        min_length=1,
        description="Severidad del riesgo: HIGH, MEDIUM o LOW.",
    )


class AuditReportResponse(BaseModel):
    """Informe final de una auditoría clínica agéntica.

    Attributes:
        status: Estado del proceso (p. ej. "completed").
        procedure_name: Procedimiento clínico detectado en el documento.
        patient_id_masked: Identificador del paciente anonimizado.
        missing_fields: Campos obligatorios ausentes en la documentación.
        clinical_risks: Lista de riesgos clínicos/legales identificados.
        requires_human_override: True si el resultado exige revisión humana.
        audit_confidence_score: Confianza del análisis en el rango [0.0, 1.0].
    """

    model_config = ConfigDict(extra="ignore")

    status: str = Field(
        default="completed",
        description="Estado de la auditoría (p. ej. 'completed' o 'failed').",
    )
    procedure_name: str = Field(
        default="UNKNOWN",
        description="Procedimiento clínico detectado en el documento.",
    )
    patient_id_masked: str = Field(
        default="[REDACTED]",
        description="Identificador del paciente anonimizado.",
    )
    missing_fields: list[str] = Field(
        default_factory=list,
        description="Campos obligatorios que faltan en el documento.",
    )
    clinical_risks: list[ClinicalRisk] = Field(
        default_factory=list,
        description="Riesgos clínicos o legales identificados por la auditoría.",
    )
    requires_human_override: bool = Field(
        default=True,
        description="Indica si el informe exige validación por un profesional humano.",
    )
    audit_confidence_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Nivel de confianza del análisis, entre 0.0 y 1.0.",
    )