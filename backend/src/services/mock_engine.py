"""Motor de simulación local (modo mock) del Agente Auditor de MedGuard AI.

Permite el **desarrollo híbrido**: mientras la instancia AMD (vLLM/ROCm) no
está habilitada, `AMDClient` delega en este motor para simular de forma
**determinista y 100 % offline** la inferencia del LLM alojado en AMD.

Garantías de seguridad del modo mock (principio de desconfianza):

- Nunca toca la red: es código local puro (sin httpx ni I/O externo).
- Siempre devuelve JSON conforme a ``AuditReportResponse``.
- Fuerza ``requires_human_override=True`` y limita ``audit_confidence_score``
  a un tope conservador (``MAX_MOCK_CONFIDENCE``), de modo que la regla de
  confianza del orquestador (< 0.85) SIEMPRE exige revisión humana: un
  informe simulado jamás puede parecer un informe auditado por la GPU AMD.

La heurística es transparente y auditable (sin caja negra):

1. Recupera los datos estructurados del prompt del orquestador (marcadores
   ``--- DATOS ESTRUCTURADOS ---`` / ``--- FIN DE LA EXTRACCIÓN ---``).
2. Detecta procedimiento e identificador de paciente por palabras clave.
3. Verifica los campos administrativos obligatorios (espejo de
   ``prompts.MINIMUM_REQUIRED_FIELDS``) contra el texto de la evidencia.
4. Genera riesgos documentales/legal por campo ausente y calcula una
   confianza proporcional a la completitud de la evidencia.

Nota de arquitectura: este módulo NO importa de ``src.core`` para no crear
una dependencia circular (``core`` ya depende de ``services`` vía
``AMDClient``); los nombres de campo obligatorios se mantienen alineados
con ``prompts.MINIMUM_REQUIRED_FIELDS`` por convención.
"""

import json
import logging
import re
from typing import Any

logger = logging.getLogger("medguard.services.mock_engine")

# Tope de confianza del modo simulado: siempre < 0.85 (umbral del orquestador).
MAX_MOCK_CONFIDENCE: float = 0.6

# Confianza base cuando no hay evidencia utilizable (extracción fallida).
MIN_MOCK_CONFIDENCE: float = 0.05

# Penalización por cada campo administrativo obligatorio ausente.
_CONFIDENCE_PENALTY_PER_MISSING_FIELD: float = 0.1

# Claves (en minúsculas) que, en el payload de Evolus, revelan cada campo.
_PROCEDURE_KEYS: tuple[str, ...] = (
    "procedure_name",
    "procedure",
    "procedimiento",
    "intervention",
    "intervencion",
    "finalidad",
)
_PATIENT_KEYS: tuple[str, ...] = (
    "patient_id",
    "patient",
    "paciente",
    "id_paciente",
    "documento_identidad",
)

# Palabras clave que acreditan la PRESENCIA documental de cada campo obligatorio.
_REQUIRED_FIELD_KEYWORDS: dict[str, tuple[str, ...]] = {
    "identificación del paciente": ("patient", "paciente", "identific"),
    "procedimiento o finalidad del documento": (
        "procedure",
        "procedimiento",
        "finalidad",
        "intervention",
        "intervencion",
    ),
    "fecha del documento": ("fecha", "date", "documento_date", "document_date"),
    "firma del profesional responsable": ("firma", "signature", "firmado", "signed"),
    "consentimiento informado (si aplica)": (
        "consentimiento",
        "consent",
        "informed",
    ),
}

# Riesgo documental generado por campo obligatorio ausente (determinista).
_MISSING_FIELD_RISKS: dict[str, tuple[str, str, str]] = {
    "identificación del paciente": (
        "LEGAL_COMPLIANCE",
        "No se identifica al paciente en la documentación; incumple los "
        "requisitos de trazabilidad y protección de datos (GDPR).",
        "HIGH",
    ),
    "procedimiento o finalidad del documento": (
        "LEGAL_COMPLIANCE",
        "No consta el procedimiento o finalidad del documento; el "
        "consentimiento no puede considerarse informado.",
        "MEDIUM",
    ),
    "fecha del documento": (
        "LEGAL_COMPLIANCE",
        "Documento sin fecha verificable; imposible acreditar vigencia "
        "temporal del acto clínico-documental.",
        "MEDIUM",
    ),
    "firma del profesional responsable": (
        "LEGAL_COMPLIANCE",
        "Ausencia de firma del profesional responsable; el documento carece "
        "de validez acreditativa.",
        "HIGH",
    ),
    "consentimiento informado (si aplica)": (
        "CONSENT_GAP",
        "No se localiza consentimiento informado; riesgo legal directo por "
        "intervención sin autorización documentada del paciente.",
        "HIGH",
    ),
}


class MockAuditEngine:
    """Auditor determinista y offline que simula la inferencia del LLM AMD."""

    # Extrae el bloque de evidencia estructurada embebido en el prompt.
    _EVIDENCE_RE = re.compile(
        r"--- DATOS ESTRUCTURADOS[^\n]*\n(.*?)\n--- FIN DE LA EXTRACCIÓN ---",
        re.DOTALL,
    )

    def generate(self, user_prompt: str) -> dict[str, Any]:
        """Simula la completitud del Agente Auditor sin salir de la máquina.

        Args:
            user_prompt: Prompt de usuario del orquestador (contiene el JSON
                de la extracción de Evolus entre marcadores conocidos).

        Returns:
            Diccionario siempre conforme a ``AuditReportResponse``, con
            ``requires_human_override=True`` y confianza topeada.
        """
        evidence_text, evidence_data = self._extract_evidence(user_prompt)
        missing_fields = self._detect_missing_fields(evidence_text)

        if not evidence_data:
            # Extracción fallida o sin datos: evidencia mínima, máxima desconfianza.
            logger.info("MockAuditEngine: sin evidencia estructurada; auditoría de contingencia.")
        else:
            logger.info(
                "MockAuditEngine: evidencia simulada procesada (%d campos, %d ausentes).",
                len(evidence_data),
                len(missing_fields),
            )

        return {
            "status": "completed",
            "procedure_name": self._detect_procedure(evidence_data),
            "patient_id_masked": self._mask_patient_id(evidence_data),
            "missing_fields": missing_fields,
            "clinical_risks": self._build_risks(missing_fields, has_evidence=bool(evidence_data)),
            "requires_human_override": True,  # inquebrantable en modo mock
            "audit_confidence_score": self._compute_confidence(missing_fields, evidence_data),
        }

    # ------------------------------------------------------------------
    # Evidencia (recuperación del payload de Evolus dentro del prompt)
    # ------------------------------------------------------------------
    @classmethod
    def _extract_evidence(cls, user_prompt: str) -> tuple[str, dict[str, Any]]:
        """Recupera la evidencia estructurada embebida en el prompt.

        Args:
            user_prompt: Prompt de usuario generado por ``prompts``.

        Returns:
            Tupla (texto de evidencia, dict parseado). Ambos vacíos si el
            prompt no contiene marcadores o el JSON es ilegible.
        """
        match = cls._EVIDENCE_RE.search(user_prompt or "")
        if not match:
            return "", {}
        raw = match.group(1).strip()
        try:
            parsed = json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            return raw, {}
        return raw, parsed if isinstance(parsed, dict) else {}

    # ------------------------------------------------------------------
    # Heurística determinista
    # ------------------------------------------------------------------
    @staticmethod
    def _detect_missing_fields(evidence_text: str) -> list[str]:
        """Lista los campos obligatorios cuya keyword no aparece en la evidencia."""
        haystack = (evidence_text or "").lower()
        return [
            field
            for field, keywords in _REQUIRED_FIELD_KEYWORDS.items()
            if not any(keyword in haystack for keyword in keywords)
        ]

    @staticmethod
    def _detect_procedure(evidence_data: dict[str, Any]) -> str:
        """Extrae el procedimiento por claves conocidas (búsqueda en profundidad 2)."""
        for key in _PROCEDURE_KEYS:
            for candidate in (evidence_data, *(v for v in evidence_data.values() if isinstance(v, dict))):
                value = candidate.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
        return "UNKNOWN"

    @staticmethod
    def _mask_patient_id(evidence_data: dict[str, Any]) -> str:
        """Devuelve un identificador enmascarado (mínimo de datos, GDPR)."""
        for key in _PATIENT_KEYS:
            value = evidence_data.get(key)
            if isinstance(value, (str, int)) and str(value).strip():
                raw = str(value).strip()
                tail = raw[-3:] if len(raw) >= 3 else raw
                return f"****{tail}"
        return "[REDACTED]"

    @staticmethod
    def _build_risks(
        missing_fields: list[str],
        has_evidence: bool,
    ) -> list[dict[str, str]]:
        """Construye un riesgo documental determinista por campo ausente."""
        risks = [
            {
                "risk_category": category,
                "description": description,
                "severity": severity,
            }
            for field in missing_fields
            for category, description, severity in (_MISSING_FIELD_RISKS[field],)
        ]
        if not has_evidence:
            risks.append(
                {
                    "risk_category": "LEGAL_COMPLIANCE",
                    "description": (
                        "Modo de simulación local (mock): no se dispone de "
                        "evidencia estructurada verificable; el informe es "
                        "provisional y requiere validación humana."
                    ),
                    "severity": "HIGH",
                }
            )
        return risks

    @staticmethod
    def _compute_confidence(
        missing_fields: list[str],
        evidence_data: dict[str, Any],
    ) -> float:
        """Confianza proporcional a la completitud, topeada a MAX_MOCK_CONFIDENCE."""
        if not evidence_data:
            return MIN_MOCK_CONFIDENCE
        score = MAX_MOCK_CONFIDENCE - (
            _CONFIDENCE_PENALTY_PER_MISSING_FIELD * len(missing_fields)
        )
        return max(MIN_MOCK_CONFIDENCE, round(score, 2))
