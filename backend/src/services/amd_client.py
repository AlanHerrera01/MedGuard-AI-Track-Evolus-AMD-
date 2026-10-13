"""Cliente para la API OpenAI-compatible de AMD TokenFactory.

Infraestructura AMD (contexto de la integración)
-------------------------------------------------
El endpoint ``AMD_TOKEN_ENDPOINT`` (``https://notebooks.amd.com/tokenfactory/v1``)
es un *proxy* OpenAI-compatible por delante de un servidor **vLLM**. vLLM
sirve modelos como ``meta-llama/Llama-3.1-8B-Instruct`` sobre GPUs **AMD
Instinct** ejecutando el runtime **ROCm**.

Implicaciones para este cliente:

- La API imita a OpenAI (``/chat/completions``), por lo que el payload y el
  parsing siguen ese formato.
- ACK del *structured output*: aunque vLLM admite ``response_format`` de
  ``json_object``, su garantía es "best effort"; por eso este cliente hace
  **parsing estricto** (fences de Markdown, aislamiento del objeto JSON)
  y validación posterior con Pydantic en la capa superior.
- El servidor AMD vive en una infraestructura remota con GPUs compartidas:
  es imprescindible manejar timeouts y fallos de conexión, por lo que toda
  falla se traduce en ``AMDAPIError`` con mensaje descriptivo.
"""

import json
import logging
import re
from typing import Any

import httpx
from pydantic import ValidationError

from src.config import settings
from src.schemas.audit_schemas import AuditReportResponse

logger = logging.getLogger("medguard.services.amd")

# Ruta del endpoint OpenAI-compatible de chat (esquema vLLM/ROCm).
_CHAT_PATH = "/chat/completions"

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

# Prefijo usado en el reintento simplificado (fallback).
_FALLBACK_PREFIX = (
    "Reintento estricto. Devuelve SOLO JSON válido y minificado, sin "
    "explicaciones ni Markdown.\n\n"
)


class AMDAPIError(Exception):
    """Error de dominio de la integración con AMD TokenFactory (vLLM/ROCm).

    Attributes:
        detail: Descripción del fallo (conexión, HTTP o JSON inválido).
        status_code: Código HTTP recibido, o ``None`` si fue un error de red.
    """

    def __init__(self, detail: str, status_code: int | None = None) -> None:
        """Inicializa el error.

        Args:
            detail: Mensaje descriptivo del fallo.
            status_code: Código HTTP si aplica.
        """
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class AMDClient:
    """Cliente de la API OpenAI-compatible de AMD TokenFactory (vLLM)."""

    def __init__(
        self,
        token_endpoint: str | None = None,
        api_key: str | None = None,
        model_name: str | None = None,
        timeout: float | None = None,
    ) -> None:
        """Configura el cliente con valores inyectables.

        Args:
            token_endpoint: URL base de TokenFactory. Por defecto
                ``settings.amd_token_endpoint``.
            api_key: Clave de API de AMD (envía ``Authorization: Bearer``).
                Por defecto ``settings.amd_api_key``.
            model_name: Modelo servido por vLLM. Por defecto
                ``settings.amd_model_name``.
            timeout: Timeout de red en segundos. Por defecto
                ``settings.amd_timeout_seconds``.
        """
        self.token_endpoint = (token_endpoint or settings.amd_token_endpoint).rstrip("/")
        self.api_key = api_key if api_key is not None else settings.amd_api_key
        self.model_name = model_name or settings.amd_model_name
        self.timeout = timeout if timeout is not None else settings.amd_timeout_seconds

    @property
    def headers(self) -> dict[str, str]:
        """Cabeceras de autenticación para AMD (Bearer token)."""
        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

    async def generate_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        """Genera una completitud de chat contra el vLLM de AMD (ROCm).

        Args:
            system_prompt: Prompt de sistema (restricciones y formato).
            user_prompt: Prompt de usuario con el contenido a analizar.
            temperature: Temperatura de muestreo del modelo (default 0.1).

        Returns:
            Diccionario con el JSON **ya parseado** que devolvió el modelo.

        Raises:
            AMDAPIError: Si falla la conexión con el endpoint de GPUs AMD,
                si el servidor responde con un código distinto de 200 o si
                el modelo no devuelve un JSON válido.
        """
        # Payload estándar OpenAI, aceptado directamente por la capa
        # OpenAI-compatible de vLLM servida sobre ROCm.
        payload: dict[str, Any] = {
            "model": self.model_name,
            "temperature": temperature,
            "max_tokens": settings.llm_max_tokens,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            # vLLM soporta JSON mode; aún así validamos JSON estrictamente abajo.
            "response_format": {"type": "json_object"},
        }
        url = f"{self.token_endpoint}{_CHAT_PATH}"

        try:
            async with httpx.AsyncClient(
                timeout=self.timeout, headers=self.headers
            ) as client:
                response = await client.post(url, json=payload)

            if response.status_code != httpx.codes.OK:
                self._log_failure(url, response.status_code, None)
                raise AMDAPIError(
                    status_code=response.status_code,
                    detail=(
                        f"El endpoint de GPUs AMD respondió HTTP "
                        f"{response.status_code}: {response.text[:200]}"
                    ),
                )
        except (httpx.TimeoutException, httpx.RequestError) as exc:
            self._log_failure(url, None, exc)
            raise AMDAPIError(
                detail=(
                    "No se pudo conectar con el endpoint AMD (vLLM/ROCm): "
                    f"{exc.__class__.__name__} ({self._safe_reason(exc)})"
                ),
            ) from exc

        content = self._extract_content(response.json())
        parsed = self._parse_strict_json(content)
        if parsed is None:
            self._log_failure(url, httpx.codes.OK, None)
            raise AMDAPIError(
                status_code=httpx.codes.OK,
                detail="El modelo AMD devolvió contenido que no es JSON válido.",
            )

        return parsed

    async def analyze_with_amd_model(
        self,
        prompt: str,
        is_fallback: bool = False,
        system_prompt: str | None = None,
    ) -> dict[str, Any]:
        """Ejecuta el análisis clínico completo (prompt del dominio + validación).

        Este método envuelve ``generate_completion`` para añadir:

        1. El prompt de sistema (por defecto el esquema JSON esperado; el
           orquestador puede inyectar el prompt de dominio del Agente Auditor).
        2. Un reintento simplificado con ``temperature=0.0`` cuando la
           primera llamada falla o el JSON no es válido.
        3. Una respuesta de contingencia que fuerza ``requires_human_override``
           cuando el fallback también falla.

        Args:
            prompt: Prompt de usuario con el contenido clínico.
            is_fallback: Si esta llamada es ya un reintento (evita recursión).
            system_prompt: Prompt de sistema a usar. Por defecto usa el
                esquema JSON local (``_SYSTEM_PROMPT``).

        Returns:
            Diccionario conforme al esquema de ``AuditReportResponse``.
            Nunca lanza excepción (degradación controlada).
        """
        temperature = 0.0 if is_fallback else settings.amd_temperature
        effective_prompt = f"{_FALLBACK_PREFIX}{prompt}" if is_fallback else prompt
        effective_system = system_prompt or _SYSTEM_PROMPT

        try:
            parsed = await self.generate_completion(
                system_prompt=effective_system,
                user_prompt=effective_prompt,
                temperature=temperature,
            )
            validated = AuditReportResponse.model_validate(parsed)
            logger.info(
                "Análisis AMD completado (modelo=%s, fallback=%s)",
                self.model_name,
                is_fallback,
            )
            return validated.model_dump()
        except (AMDAPIError, ValidationError) as exc:
            logger.warning("Fallo en el análisis AMD: %s", self._format_error(exc))
            if not is_fallback:
                logger.info("Activando fallback: reintento con prompt simplificado.")
                return await self.analyze_with_amd_model(
                    prompt, is_fallback=True, system_prompt=system_prompt
                )
            logger.error("Fallback agotado; se exige revisión humana.")
            return self._contingency_response(self._format_error(exc))

    @staticmethod
    def _extract_content(data: dict[str, Any]) -> str:
        """Extrae el contenido textual de una respuesta OpenAI-compatible.

        Args:
            data: Respuesta completa del endpoint ``/chat/completions``.

        Returns:
            Contenido del primer ``choice``; cadena vacía si no existe.
        """
        choices = data.get("choices") or []
        if not choices:
            return ""
        message = choices[0].get("message") or {}
        return message.get("content") or ""

    @staticmethod
    def _parse_strict_json(content: str) -> dict[str, Any] | None:
        """Parsea JSON estricto tolerando cercas ```json ... ```.

        Args:
            content: Texto devuelto por el LLM.

        Returns:
            Diccionario parseado o ``None`` si el JSON es inválido.
        """
        if not content:
            return None

        candidate = content.strip()
        fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", candidate, re.DOTALL)
        if fence:
            candidate = fence.group(1).strip()

        first_brace = candidate.find("{")
        last_brace = candidate.rfind("}")
        if first_brace != -1 and last_brace > first_brace:
            candidate = candidate[first_brace : last_brace + 1]

        try:
            parsed = json.loads(candidate)
        except (json.JSONDecodeError, ValueError):
            return None

        return parsed if isinstance(parsed, dict) else None

    @staticmethod
    def _contingency_response(reason: str) -> dict[str, Any]:
        """Constructs una respuesta segura de contingencia.

        Args:
            reason: Motivo por el que el análisis no pudo completarse.

        Returns:
            Diccionario conforme a ``AuditReportResponse`` con estado
            "failed" y revisión humana obligatoria.
        """
        return AuditReportResponse(
            status="failed",
            procedure_name="UNKNOWN",
            patient_id_masked="[REDACTED]",
            missing_fields=[],
            clinical_risks=[],
            requires_human_override=True,
            audit_confidence_score=0.0,
        ).model_dump()

    @staticmethod
    def _format_error(exc: Exception) -> str:
        """Resume la excepción sin exponer información sensible."""
        if isinstance(exc, AMDAPIError):
            return exc.detail
        if isinstance(exc, ValidationError):
            return "JSON inválido respecto al esquema esperado."
        return str(exc)

    @staticmethod
    def _safe_reason(exc: Exception) -> str:
        """Extrae un motivo seguro del error de transporte."""
        if isinstance(exc, httpx.TimeoutException):
            return "timeout superado"
        if isinstance(exc, httpx.ConnectError):
            return "conexión rechazada"
        return str(exc) if str(exc) else exc.__class__.__name__

    @staticmethod
    def _log_failure(
        url: str,
        status_code: int | None,
        exc: Exception | None,
    ) -> None:
        """Registra un evento estructurado del fallo de AMD."""
        logger.error(
            "Fallo en llamada a AMD TokenFactory",
            extra={
                "event": "amd_api_error",
                "service": "amd",
                "url": url,
                "status_code": status_code,
                "error_type": exc.__class__.__name__ if exc else None,
            },
            exc_info=exc is not None,
        )