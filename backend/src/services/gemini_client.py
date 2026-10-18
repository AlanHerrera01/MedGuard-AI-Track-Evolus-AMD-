"""Cliente para Google Gemini API.

Proporciona una interfaz compatible con el resto del sistema para usar
Gemini como proveedor de LLM en lugar de OpenAI. Soporta los modelos de
Gemini con structured output (JSON mode) para auditorías clínicas.
"""

import json
import logging
from typing import Any

import httpx
from pydantic import ValidationError

from src.config import settings
from src.schemas.audit_schemas import AuditReportResponse

logger = logging.getLogger("medguard.services.gemini")

# Instrucción de sistema: fuerza salida JSON estricta y sin texto adicional.
_SYSTEM_PROMPT = (
    "Eres un motor de auditoría clínica. Responde EXCLUSIVAMENTE con un objeto "
    "JSON válido, sin texto adicional ni bloques de código Markdown. El JSON "
    "debe cumplir este esquema: "
    '{"status": "completed", "procedure_name": str, "patient_id_masked": str, '
    '"missing_fields": [str], "clinical_risks": [{"risk_category": str, '
    '"description": str, "severity": "HIGH"|"MEDIUM"|"LOW"}], '
    '"requires_human_override": bool, "audit_confidence_score": float}.'
)


class GeminiAPIError(Exception):
    """Error de dominio de la integración con Gemini API."""

    def __init__(self, detail: str, status_code: int | None = None) -> None:
        """Inicializa el error.

        Args:
            detail: Mensaje descriptivo del fallo.
            status_code: Código HTTP si aplica.
        """
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class GeminiClient:
    """Cliente para Google Gemini API (Modelo 1.5 Flash/Pro)."""

    def __init__(
        self,
        api_key: str | None = None,
        model_name: str | None = None,
        timeout: float | None = None,
    ) -> None:
        """Configura el cliente con valores inyectables.

        Args:
            api_key: Clave de API de Gemini. Por defecto
                ``settings.gemini_api_key``.
            model_name: Modelo de Gemini a usar. Por defecto
                ``settings.gemini_model``.
            timeout: Timeout de red en segundos. Por defecto
                ``settings.amd_timeout_seconds``.
        """
        self.api_key = api_key if api_key is not None else settings.gemini_api_key
        self.model_name = model_name or settings.gemini_model
        self.timeout = timeout if timeout is not None else settings.amd_timeout_seconds

    @property
    def headers(self) -> dict[str, str]:
        """Cabeceras para Gemini API."""
        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _build_url(self) -> str:
        """Construye la URL del endpoint de chat de Gemini."""
        return f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"

    @staticmethod
    def _parse_strict_json(content: str) -> dict[str, Any] | None:
        """Parsea JSON tolerando cercas de código, texto alrededor y truncamientos."""
        if not content:
            return None

        candidate = content.strip()
        import re

        # Quitar cercas de Markdown
        fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", candidate, re.DOTALL)
        if fence:
            candidate = fence.group(1).strip()

        first_brace = candidate.find("{")
        last_brace = candidate.rfind("}")
        if first_brace != -1 and last_brace > first_brace:
            candidate = candidate[first_brace : last_brace + 1]

        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except (json.JSONDecodeError, ValueError):
            pass

        # Intento de rescate si el JSON fue truncado al final
        if first_brace != -1 and not candidate.endswith("}"):
            for suffix in ["}]}", "]}", "}", '"]}']:
                try:
                    repaired = json.loads(candidate + suffix)
                    if isinstance(repaired, dict):
                        return repaired
                except Exception:
                    continue

        return None

    @staticmethod
    def _contingency_response(reason: str) -> dict[str, Any]:
        """Constructs una respuesta segura de contingencia."""
        return AuditReportResponse(
            status="failed",
            procedure_name="UNKNOWN",
            patient_id_masked="[REDACTED]",
            missing_fields=[],
            clinical_risks=[],
            requires_human_override=True,
            audit_confidence_score=0.0,
        ).model_dump()

    async def generate_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        """Genera una completitud usando Gemini API.

        Args:
            system_prompt: Prompt de sistema (restricciones y formato).
            user_prompt: Prompt de usuario con el contenido a analizar.
            temperature: Temperatura de muestreo del modelo (default 0.1).

        Returns:
            Diccionario con el JSON **ya parseado** que devolvió el modelo.

        Raises:
            GeminiAPIError: Si falla la conexión con Gemini, si el servidor
                responde con un código distinto de 200 o si el modelo no
                devuelve un JSON válido.
        """
        if not self.api_key:
            raise GeminiAPIError(
                detail="Gemini API key no configurada. Configura GEMINI_API_KEY."
            )

        # Construir payload para Gemini
        payload: dict[str, Any] = {
            "contents": [
                {
                    "parts": [
                        {"text": system_prompt},
                        {"text": user_prompt},
                    ]
                }
            ],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max(settings.llm_max_tokens, 4096),
                "responseMimeType": "application/json",
            },
        }

        url = self._build_url()

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
                response = await client.post(url, json=payload)

            if response.status_code != httpx.codes.OK:
                logger.error(
                    "Fallo en llamada a Gemini API",
                    extra={
                        "event": "gemini_api_error",
                        "service": "gemini",
                        "url": url,
                        "status_code": response.status_code,
                        "response": response.text[:200],
                    },
                )
                raise GeminiAPIError(
                    status_code=response.status_code,
                    detail=(
                        f"Gemini API respondió HTTP {response.status_code}: "
                        f"{response.text[:200]}"
                    ),
                )

            result = response.json()
            content = self._extract_content(result)
            parsed = self._parse_strict_json(content)
            if parsed is None:
                candidates = result.get("candidates") or []
                finish_reason = candidates[0].get("finishReason") if candidates else "unknown"
                logger.error(
                    "Gemini parse fail: finishReason=%s, content length=%d, content preview: %s",
                    finish_reason,
                    len(content),
                    content[:500],
                )
                raise GeminiAPIError(
                    status_code=httpx.codes.OK,
                    detail="El modelo Gemini devolvió contenido que no es JSON válido.",
                )

            return parsed

        except (httpx.TimeoutException, httpx.RequestError) as exc:
            logger.error(
                "Fallo en llamada a Gemini API",
                extra={
                    "event": "gemini_network_error",
                    "service": "gemini",
                    "url": url,
                    "error_type": exc.__class__.__name__,
                },
                exc_info=True,
            )
            raise GeminiAPIError(
                detail=(
                    "No se pudo conectar con Gemini API: "
                    f"{exc.__class__.__name__} ({str(exc)})"
                ),
            ) from exc

    async def analyze_with_gemini(
        self,
        prompt: str,
        is_fallback: bool = False,
        system_prompt: str | None = None,
    ) -> dict[str, Any]:
        """Ejecuta el análisis clínico completo usando Gemini.

        Args:
            prompt: Prompt de usuario con el contenido clínico.
            is_fallback: Si esta llamada es ya un reintento.
            system_prompt: Prompt de sistema a usar. Por defecto usa el
                esquema JSON local (``_SYSTEM_PROMPT``).

        Returns:
            Diccionario conforme al esquema de ``AuditReportResponse``.
            Nunca lanza excepción (degradación controlada).
        """
        temperature = 0.0 if is_fallback else settings.llm_temperature
        effective_system = system_prompt or _SYSTEM_PROMPT

        try:
            parsed = await self.generate_completion(
                system_prompt=effective_system,
                user_prompt=prompt,
                temperature=temperature,
            )
            validated = AuditReportResponse.model_validate(parsed)
            logger.info(
                "Análisis Gemini completado (modelo=%s)",
                self.model_name,
            )
            return validated.model_dump()
        except (GeminiAPIError, ValidationError) as exc:
            logger.warning("Fallo en el análisis Gemini: %s", str(exc))
            if not is_fallback:
                logger.info("Activando fallback: reintento con prompt simplificado.")
                return await self.analyze_with_gemini(
                    prompt, is_fallback=True, system_prompt=system_prompt
                )
            logger.error("Fallback agotado; se exige revisión humana.")
            return self._contingency_response(str(exc))

    @staticmethod
    def _extract_content(data: dict[str, Any]) -> str:
        """Extrae el contenido textual de una respuesta de Gemini.

        Args:
            data: Respuesta completa del endpoint de Gemini.

        Returns:
            Contenido del primer candidate; cadena vacía si no existe.
        """
        candidates = data.get("candidates") or []
        if not candidates:
            return ""
        content = candidates[0].get("content") or {}
        parts = content.get("parts") or []
        if not parts:
            return ""
        texts = [p.get("text", "") for p in parts if isinstance(p, dict) and "text" in p]
        return "".join(texts)