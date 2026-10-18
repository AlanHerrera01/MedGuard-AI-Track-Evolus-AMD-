"""Orquestador clínico de MedGuard AI (capa de dominio).

`ClinicalOrchestrator` coordina el pipeline de auditoría administrativa:

* Paso 1: estructura el documento con `EvolusClient.run_document_extractor`.
* Paso 2: entrega los datos extraídos al Agente Auditor utilizando Gemini.
  Si el conector dual opera en modo mock (instancia AMD aún no habilitada),
  la respuesta es simulada localmente y se etiqueta con un `safety_notice`
  explícito; en cualquier caso se exige `requires_human_override=True` para
  el informe simulado.
* Paso 3 (fallback): si el modelo Gemini falla al decodificar el JSON o la
  llamada falla, se activa un Agente Fallback determinista que devuelve
  una estructura de emergencia segura con `requires_human_override=True`
  y un riesgo crítico por fallo de infraestructura.
* Paso 4 (regla de negocio): si `audit_confidence_score < 0.85` se fuerza
  `requires_human_override=True` y se adjunta una advertencia de seguridad
  visible.

El orquestador no conoce FastAPI ni transporte. Los clientes se inyectan
como dependencias.
"""

import logging
from typing import Any

from pydantic import ValidationError

from src.config import settings
from src.core import prompts
from src.schemas.audit_schemas import AuditReportResponse
from src.services.amd_client import AMDAPIError, AMDClient
from src.services.evolus_client import EvolusAPIError, EvolusClient

logger = logging.getLogger("medguard.orchestrator")

_INFRASTRUCTURE_RISK: dict[str, str] = {
    "risk_category": "LEGAL_COMPLIANCE",
    "description": (
        "Fallo de infraestructura en el análisis automático; "
        "la auditoría no pudo completarse."
    ),
    "severity": "HIGH",
}

_EMERGENCY_NOTICE = (
    "Análisis automático no disponible por fallo de infraestructura. "
    "Se requiere revisión humana obligatoria."
)


class ClinicalOrchestrator:
    """Orquesta el pipeline de auditoría clínico-administrativa."""

    CONFIDENCE_OVERRIDE_THRESHOLD: float = 0.85

    def __init__(
        self,
        evolus_client: EvolusClient | None = None,
        amd_client: AMDClient | None = None,
    ) -> None:
        self.evolus = evolus_client or EvolusClient()
        self.amd = amd_client or AMDClient()
        logger.info("ClinicalOrchestrator inicializado")

    async def process_audit(self, raw_document_text: str) -> dict[str, Any]:
        if not raw_document_text or not raw_document_text.strip():
            raise ValueError("raw_document_text no puede estar vacío.")

        extracted_data = await self._extract(raw_document_text)
        result = await self._analyze_with_fallback(extracted_data)
        self._apply_confidence_rule(result)
        return result

    async def _extract(self, raw_document_text: str) -> dict[str, Any]:
        try:
            data = await self.evolus.run_document_extractor(raw_document_text)
            if not isinstance(data, dict):
                data = {"raw": str(data)}
            logger.info("Paso 1 | Extracción completada (%s claves)", len(data))
            return data
        except EvolusAPIError as exc:
            logger.warning(
                "Paso 1 | Extractor no disponible (%s); se usará evidencia mínima",
                exc,
            )
            return {
                "document_text": raw_document_text,
                "extraction_status": "failed",
            }

    async def _analyze_with_fallback(self, extracted_data: dict[str, Any]) -> dict[str, Any]:
        user_prompt = prompts.get_audit_user_prompt(extracted_data=extracted_data)
        
        from src.services.gemini_client import GeminiAPIError, GeminiClient
        gemini_client = GeminiClient()

        try:
            parsed = await gemini_client.generate_completion(
                system_prompt=prompts.CLINICAL_AUDITOR_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=settings.llm_temperature,
            )
            result = AuditReportResponse.model_validate(parsed).model_dump()

            # Marcar si la respuesta es simulada (modo mock AMD)
            if hasattr(self.amd, 'is_mock') and self.amd.is_mock:
                result["requires_human_override"] = True
                result["safety_notice"] = (
                    "Modo simulación local (mock) activo: la instancia AMD "
                    "(vLLM/ROCm) aún no está habilitada. Informe provisional "
                    "generado por heurística local; requiere revisión humana."
                )
                logger.warning(
                    "Paso 2 | Respuesta SIMULADA localmente (modo mock AMD)"
                )
            else:
                logger.info("Paso 2 | Gemini respondió JSON válido")
            return result
        except (AMDAPIError, GeminiAPIError, ValidationError, NotImplementedError, Exception) as exc:
            reason = self._safe_reason(exc)
            logger.error("Paso 3 | Agente Fallback activado (%s)", reason)
            result = self._emergency_response(reason)
            result["safety_notice"] = _EMERGENCY_NOTICE
            return result

    def _apply_confidence_rule(self, result: dict[str, Any]) -> None:
        score = float(result.get("audit_confidence_score", 0.0))
        if score >= self.CONFIDENCE_OVERRIDE_THRESHOLD:
            return
        result["requires_human_override"] = True
        notice = (
            f"Confianza del análisis ({score:.2f}) por debajo del umbral "
            f"{self.CONFIDENCE_OVERRIDE_THRESHOLD:.2f}; se exige revisión humana obligatoria."
        )
        existing = result.get("safety_notice")
        result["safety_notice"] = f"{existing} {notice}" if existing else notice
        logger.info("Paso 4 | Regla de confianza aplicada (score=%.2f)", score)

    @staticmethod
    def _emergency_response(reason: str) -> dict[str, Any]:
        logger.error("Emergency response emitida: %s", reason)
        return AuditReportResponse(
            status="failed",
            procedure_name="UNKNOWN",
            patient_id_masked="[REDACTED]",
            missing_fields=[],
            clinical_risks=[_INFRASTRUCTURE_RISK],
            requires_human_override=True,
            audit_confidence_score=0.0,
            safety_notice=_EMERGENCY_NOTICE,
        ).model_dump()

    @staticmethod
    def _safe_reason(exc: Exception) -> str:
        from src.services.gemini_client import GeminiAPIError

        if isinstance(exc, (AMDAPIError, GeminiAPIError)):
            return exc.detail
        if isinstance(exc, ValidationError):
            return "el modelo devolvió un JSON no conforme al esquema"
        return exc.__class__.__name__
