"""Esquemas Pydantic (DTOs) de MedGuard AI.

Contratos de entrada/salida de la API y validación de datos. Mantener
los DTOs separados del dominio permite evolucionar la API sin acoplar
las entidades internas.
"""

from src.schemas.audit_schemas import (
    AuditReportResponse,
    AuditRequest,
    ClinicalRisk,
)
from src.schemas.evolus_schemas import (
    DocumentExtractorResponse,
    EvolusToolRequest,
)

__all__ = [
    "AuditReportResponse",
    "AuditRequest",
    "ClinicalRisk",
    "DocumentExtractorResponse",
    "EvolusToolRequest",
]