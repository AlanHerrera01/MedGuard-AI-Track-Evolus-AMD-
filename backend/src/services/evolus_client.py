"""Cliente HTTP resiliente para la API REST de Evolus AI.

Proporciona:

- ``EvolusAPIError``: excepción de dominio descriptiva que se lanza ante
  cualquier fallo de red, timeout o respuesta HTTP distinta de 200.
- ``EvolusClient``: cliente asíncrono con cabeceras obligatorias
  (``X-ApiKey``, ``X-Application-Id``), timeouts explícitos, logs
  estructurados en caso de fallo y un método genérico para invocar
  herramientas adicionales (``/ai-tools/{tool_name}/run``).

La configuración se importa de ``src.config.settings`` (Pydantic
Settings), de modo que el cliente no depende de ``os.environ``.
"""

import logging
from typing import Any

import httpx

from src.config import settings
from src.schemas.evolus_schemas import EvolusToolRequest

logger = logging.getLogger("medguard.services.evolus")

# Ruta base de los AI Tools de Evolus.
_AI_TOOLS_PATH = "/ai-tools/{tool_name}/run"


class EvolusAPIError(Exception):
    """Error de dominio producido durante una llamada a la API de Evolus.

    Attributes:
        tool_name: Herramienta de Evolus que falló (p. ej. "document-extractor").
        status_code: Código de estado HTTP recibido, o ``None`` si fue un
            error de red/timeout.
        detail: Mensaje descriptivo para el operador/llamante.
    """

    def __init__(
        self,
        tool_name: str,
        detail: str,
        status_code: int | None = None,
    ) -> None:
        """Inicializa el error con contexto descriptivo.

        Args:
            tool_name: Herramienta de Evolus implicada.
            detail: Descripción del fallo (red, timeout o HTTP).
            status_code: Código HTTP si aplica.
        """
        self.tool_name = tool_name
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class EvolusClient:
    """Cliente asíncrono para la API REST de Evolus AI."""

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        application_id: str | None = None,
        timeout: float | None = None,
    ) -> None:
        """Configura el cliente con valores inyectables.

        Args:
            base_url: URL base de Evolus AI. Por defecto ``settings.evolus_base_url``.
            api_key: Clave de API para el encabezado ``X-ApiKey``.
                Por defecto ``settings.evolus_api_key``.
            application_id: Identificador de aplicación para el encabezado
                ``X-Application-Id``. Por defecto ``settings.evolus_application_id``.
            timeout: Timeout de red en segundos.
                Por defecto ``settings.evolus_timeout_seconds``.
        """
        self.base_url = (base_url or settings.evolus_base_url).rstrip("/")
        self.api_key = api_key if api_key is not None else settings.evolus_api_key
        self.application_id = (
            application_id if application_id is not None else settings.evolus_application_id
        )
        self.timeout = timeout if timeout is not None else settings.evolus_timeout_seconds

    @property
    def headers(self) -> dict[str, str]:
        """Cabeceras obligatorias de autenticación de Evolus AI."""
        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-ApiKey": self.api_key,
            "X-Application-Id": self.application_id,
        }

    async def run_document_extractor(self, text_content: str) -> dict[str, Any]:
        """Extrae datos estructurados de un documento clínico.

        Ejecuta el AI Tool ``document-extractor`` de Evolus AI.

        Args:
            text_content: Texto del documento a procesar.

        Returns:
            Diccionario con el JSON estructurado devuelto por Evolus.

        Raises:
            EvolusAPIError: Si el servicio responde con un código HTTP
                distinto de 200 o falla la red/timeout.
        """
        payload = EvolusToolRequest(text=text_content).model_dump()
        return await self.run_ai_tool(tool_name="document-extractor", payload=payload)

    async def run_pii_redaction(self, text_content: str) -> dict[str, Any]:
        """Anonimiza datos sensibles de salud/paciente (PII/PHI).

        Ejecuta el AI Tool ``redaction`` de Evolus AI.

        Args:
            text_content: Texto del documento con posibles datos sensibles.

        Returns:
            Diccionario con la respuesta de anonimización (p. ej.
            ``redacted_text`` y ``entities``).

        Raises:
            EvolusAPIError: Si el servicio responde con un código HTTP
                distinto de 200 o falla la red/timeout.
        """
        payload = EvolusToolRequest(text=text_content).model_dump()
        return await self.run_ai_tool(tool_name="redaction", payload=payload)

    async def run_ai_tool(self, tool_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Invoca una herramienta genérica de Evolus AI.

        Args:
            tool_name: Nombre del AI Tool (se interpolan en
                ``/ai-tools/{tool_name}/run``).
            payload: Cuerpo JSON de la petición.

        Returns:
            Diccionario con la respuesta JSON de la herramienta.

        Raises:
            EvolusAPIError: Si el servicio responde con un código HTTP
                distinto de 200 o falla la red/timeout.
        """
        url = f"{self.base_url}{_AI_TOOLS_PATH.format(tool_name=tool_name)}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
                response = await client.post(url, json=payload)

            if response.status_code != httpx.codes.OK:
                self._log_failure(tool_name, url, response.status_code, None)
                raise EvolusAPIError(
                    tool_name=tool_name,
                    status_code=response.status_code,
                    detail=(
                        f"Evolus `{tool_name}` respondió HTTP {response.status_code}: "
                        f"{response.text[:200]}"
                    ),
                )
        except (httpx.TimeoutException, httpx.RequestError) as exc:
            self._log_failure(tool_name, url, None, exc)
            raise EvolusAPIError(
                tool_name=tool_name,
                detail=(
                    f"Evolus `{tool_name}` no disponible: "
                    f"{exc.__class__.__name__} ({self._safe_reason(exc)})"
                ),
            ) from exc

        return self._decode_response(response, tool_name, url)

    @staticmethod
    def _decode_response(
        response: httpx.Response, tool_name: str, url: str
    ) -> dict[str, Any]:
        """Decodifica el cuerpo JSON de una respuesta exitosa.

        Args:
            response: Respuesta HTTP de Evolus (status 200).
            tool_name: Herramienta involucrada (solo para logs).
            url: URL invocada (solo para logs).

        Returns:
            Diccionario con el JSON. Si el cuerpo no es JSON, envuelve el
            texto en ``{"raw": ...}``.

        Raises:
            EvolusAPIError: Si el cuerpo no puede decodificarse como JSON.
        """
        try:
            data = response.json()
        except ValueError:
            logger.error(
                "Respuesta no JSON de Evolus",
                extra={"service": "evolus", "tool": tool_name, "url": url},
            )
            raise EvolusAPIError(
                tool_name=tool_name,
                status_code=response.status_code,
                detail="Evolus respondió un cuerpo que no es JSON válido.",
            ) from None

        return data if isinstance(data, dict) else {"raw": data}

    @staticmethod
    def _safe_reason(exc: httpx.RequestError) -> str:
        """Extrae un motivo seguro del error (sin stack ni secretos).

        Args:
            exc: Excepción de transporte capturada.

        Returns:
            Motivo descriptivo o genérico.
        """
        if isinstance(exc, httpx.TimeoutException):
            return "timeout superado"
        if isinstance(exc, httpx.ConnectError):
            return "conexión rechazada"
        return str(exc) if str(exc) else exc.__class__.__name__

    @staticmethod
    def _log_failure(
        tool_name: str,
        url: str,
        status_code: int | None,
        exc: Exception | None,
    ) -> None:
        """Emite un log estructurado con contexto del fallo.

        Args:
            tool_name: Herramienta que falló.
            url: URL invocada.
            status_code: Código HTTP o ``None``.
            exc: Excepción original (si existe) para traza.
        """
        logger.error(
            "Fallo en llamada a Evolus",
            extra={
                "event": "evolus_api_error",
                "service": "evolus",
                "tool": tool_name,
                "url": url,
                "status_code": status_code,
                "error_type": exc.__class__.__name__ if exc else None,
            },
            exc_info=exc is not None,
        )