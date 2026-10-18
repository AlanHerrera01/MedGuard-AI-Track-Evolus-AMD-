"""Orquestador clínico de MedGuard AI (capa de dominio).

`ClinicalOrchestrator` coordina el pipeline de auditoría administrativa:

* Paso 1: estructura el documento con `EvolusClient.run_document_extractor`.
* Paso 2: entrega los datos extraídos al Agente Auditor, que ejecuta la
  inferencia en la **GPU AMD** (vLLM sobre ROCm vía AMD TokenFactory)
  cuando la instancia está habilitada (``AMD_MODE=auto`` + API key).
* Paso 3 (fallback): cadena de degradación de reportes, tanto para el
  resultado bueno como para el malo:
  1. GPU AMD (si está habilitada, se resuelve en el Paso 2).
  2. Gemini modelo principal (nube).
  3. Gemini modelo secundario (cuota independiente).
  4. Motor local de contingencia (``MockAuditEngine``): informe
     CONCLUSIVO y determinista a partir de la evidencia de Evolus,
     etiquetado como contingencia local con revisión humana obligatoria.
  5. Solo si todo lo anterior falla: estructura de emergencia segura
     con ``requires_human_override=True`` y riesgo crítico por fallo de
     infraestructura. Los informes generados sin GPU AMD se etiquetan
     con un ``safety_notice`` explícito.
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
        self._apply_confidence_rule(result, extracted_data)
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
                "extraction_error": str(exc)[:300],
            }

    async def _analyze_with_fallback(self, extracted_data: dict[str, Any]) -> dict[str, Any]:
        user_prompt = prompts.get_audit_user_prompt(extracted_data=extracted_data)

        # Paso 2: Agente Auditor en la GPU AMD (vLLM/ROCm vía TokenFactory).
        # Si la instancia AMD no está habilitada (modo mock) o falla, se
        # delega al Agente Fallback en la nube (Gemini).
        if not self.amd.is_mock:
            amd_result = await self.amd.analyze_with_amd_model(
                user_prompt,
                system_prompt=prompts.CLINICAL_AUDITOR_SYSTEM_PROMPT,
            )
            if amd_result.get("status") != "failed":
                logger.info(
                    "Paso 2 | Agente Auditor completado en GPU AMD "
                    "(vLLM/ROCm, modelo=%s)",
                    self.amd.model_name,
                )
                return amd_result
            logger.warning(
                "Paso 2 | GPU AMD no disponible (%s); se delega al Agente Fallback",
                amd_result.get("safety_notice") or "fallo de infraestructura",
            )
        else:
            logger.info(
                "Paso 2 | Instancia AMD no habilitada (modo mock); se delega "
                "al Agente Fallback (Gemini)."
            )

        # Paso 3 (fallback): Agente Fallback en la nube (Gemini). Se intenta
        # primero el modelo principal y, si falla (503/429/timeout), el
        # modelo secundario de respaldo (cuota independiente).
        from src.services.gemini_client import GeminiClient

        models = [settings.gemini_model]
        if (
            settings.gemini_fallback_model
            and settings.gemini_fallback_model != settings.gemini_model
        ):
            models.append(settings.gemini_fallback_model)

        result: dict[str, Any] | None = None
        last_reason: str | None = None
        for model in models:
            try:
                parsed = await GeminiClient(model_name=model).generate_completion(
                    system_prompt=prompts.CLINICAL_AUDITOR_SYSTEM_PROMPT,
                    user_prompt=user_prompt,
                    temperature=settings.llm_temperature,
                )
                result = AuditReportResponse.model_validate(parsed).model_dump()
                logger.info("Paso 3 | Gemini (%s) respondió JSON válido", model)
                break
            except Exception as exc:  # noqa: BLE001 - degradación controlada
                last_reason = self._safe_reason(exc)
                logger.warning(
                    "Paso 3 | Gemini (%s) falló (%s); se intenta el siguiente modelo",
                    model,
                    last_reason,
                )

        if result is None:
            # Última red de reportes antes de la emergencia: motor local
            # determinista (MockAuditEngine). Emite un informe CONCLUSIVO a
            # partir de la evidencia de Evolus, etiquetado como contingencia
            # local y con revisión humana obligatoria.
            logger.warning(
                "Paso 3 | Modelos de IA no disponibles (%s); "
                "contingencia con motor local determinista",
                last_reason,
            )
            try:
                from src.services.mock_engine import MockAuditEngine

                parsed = MockAuditEngine().generate(user_prompt)
                result = AuditReportResponse.model_validate(parsed).model_dump()
                result["requires_human_override"] = True
                detail = (last_reason or "").strip()
                result["safety_notice"] = (
                    "Los modelos de IA no respondieron; el informe lo generó "
                    "el motor local de contingencia (heurística determinista) "
                    "sobre la evidencia estructurada de Evolus."
                    + (f" Motivo: {detail}" if detail else "")
                    + " Requiere revisión humana obligatoria."
                )
                logger.warning("Paso 3 | Contingencia local emitida (motor determinista)")
            except Exception as exc:  # noqa: BLE001 - último recurso
                reason = self._safe_reason(exc)
                logger.error("Paso 3 | Agente Fallback agotado (%s)", reason)
                result = self._emergency_response(reason)
                result["safety_notice"] = _EMERGENCY_NOTICE
                return result

        # Transparencia: si la GPU AMD no participó, el informe se etiqueta
        # como provisional y se exige revisión humana obligatoria.
        if self.amd.is_mock:
            result["requires_human_override"] = True
            result["safety_notice"] = (
                "La instancia AMD (vLLM/ROCm) no está habilitada; el análisis "
                "lo ejecutó el Agente Fallback en la nube (Gemini). Informe "
                "provisional que requiere revisión humana obligatoria."
            )
            logger.warning("Paso 3 | Informe etiquetado: sin GPU AMD (modo mock)")
        else:
            logger.info("Paso 3 | Gemini respondió JSON válido (fallback de AMD)")
        return result

    def _apply_confidence_rule(
        self,
        result: dict[str, Any],
        extracted_data: dict[str, Any] | None = None,
    ) -> None:
        score = float(result.get("audit_confidence_score", 0.0))
        notices: list[str] = []

        existing = result.get("safety_notice")
        if existing:
            notices.append(str(existing))

        # Transparencia: explicar si la evidencia llegó degradada (Paso 1).
        # Con evidencia degradada la confianza se limita a 0.10 (cautela).
        if (extracted_data or {}).get("extraction_status") == "failed":
            notice = (
                "El Extractor Estructurado (Evolus) no estuvo disponible; la "
                "auditoría se basó únicamente en el texto crudo del documento, "
                "lo que reduce la fiabilidad de la evidencia."
            )
            reason = str((extracted_data or {}).get("extraction_error") or "").strip()
            if reason:
                notice = f"{notice} Motivo: {reason}"
            notices.append(notice)
            if score > 0.1:
                score = 0.1
                result["audit_confidence_score"] = score
            logger.info(
                "Paso 4 | Extracción fallida: confianza limitada a %.2f", score
            )

        if score < self.CONFIDENCE_OVERRIDE_THRESHOLD:
            result["requires_human_override"] = True
            notices.append(
                f"Confianza del análisis ({score:.2f}) por debajo del umbral "
                f"{self.CONFIDENCE_OVERRIDE_THRESHOLD:.2f}; se exige revisión "
                f"humana obligatoria."
            )

        if notices:
            result["safety_notice"] = " ".join(notices)
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
