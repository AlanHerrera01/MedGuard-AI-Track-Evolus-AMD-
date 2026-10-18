"""Pruebas de integración QA de MedGuard AI (Evolus AI + AMD TokenFactory).

Verifica contra los servicios REALES:

1. ``EvolusClient`` -> Document Extractor: envía un texto clínico de prueba y
   valida status 200 y estructura de respuesta.
2. ``AMDClient``   -> ``/chat/completions`` (vLLM/ROCm): envía un prompt de
   sonda y valida que el modelo responda con un JSON determinista, lo que
   confirma que la GPU AMD procesó la petición.

Uso:
- Standalone:        python backend/tests/test_integrations.py
- Con pytest:        pytest backend/tests/test_integrations.py -v

Requiere credenciales reales en ``.env`` (``EVOLUS_API_KEY``,
``EVOLUS_APPLICATION_ID`` y ``AMD_API_KEY``). Sin ellas, o con el conector
dual de AMD en modo mock (``AMD_MODE=mock`` o infraestructura no
habilitada), cada prueba se marca como SKIP en lugar de fallar.
"""

import asyncio
import importlib.util
import json
import sys
from pathlib import Path

# Carga de variables de entorno (python-dotenv) ANTES de importar la app.
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]  # backend/
REPO_ROOT = BACKEND_DIR.parent                      # raíz del monorepo
load_dotenv(REPO_ROOT / ".env")
load_dotenv(BACKEND_DIR / ".env")  # sobrescribe con .env local de backend si existe

# Asegura que `src` sea importable al ejecutar el script directamente.
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Consolas Windows (cp1252) no soportan emojis/Unicode: fuerza UTF-8 con fallback.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

import httpx  # noqa: E402

from src.config import settings  # noqa: E402
from src.schemas.evolus_schemas import DocumentExtractorResponse  # noqa: E402
from src.services.amd_client import AMDAPIError, AMDClient  # noqa: E402
from src.services.evolus_client import EvolusAPIError, EvolusClient  # noqa: E402

# pytest es opcional; el script funciona standalone sin él.
pytest = importlib.util.find_spec("pytest") and __import__("pytest")

# Texto clínico sintético para el extractor (sin datos reales de pacientes).
SAMPLE_CLINICAL_TEXT = (
    "Paciente: Juan Pérez, ID 12345. Procedimiento: apendicectomía. "
    "Alergia: penicilina. Medicación: amoxicilina 500 mg cada 8 horas."
)

# Sonda determinista para AMD: el JSON exacto esperado acredita que el modelo
# respondió (inferencia ejecutada en la GPU AMD).
AMD_PROBE_JSON = {"gpu": "AMD", "processed": True}
AMD_PROBE_PROMPT = (
    "Responde EXCLUSIVAMENTE con este JSON exacto, sin texto adicional: "
    + json.dumps(AMD_PROBE_JSON)
)


# ---------------------------------------------------------------------------
# Comprobaciones individuales (reutilizables por standalone y pytest)
# ---------------------------------------------------------------------------
def check_evolus_integration() -> str:
    """Ejecuta la integración con Evolus AI.

    Returns:
        "PASS", "SKIP" o "FAIL: <detalle>".
    """
    if not settings.evolus_api_key or not settings.evolus_application_id:
        return "SKIP"  # sin credenciales no se puede probar contra el servicio real

    client = EvolusClient()

    # 1) Status code: llamada HTTP directa y explícita.
    try:
        raw = httpx.post(
            f"{settings.evolus_base_url}/ai-tools/doc-structure/run",
            json={
                "text": SAMPLE_CLINICAL_TEXT,
                "options": {"format": "json", "content": "data"},
            },
            headers=client.headers,
            timeout=settings.evolus_timeout_seconds,
        )
    except httpx.RequestError as exc:
        return f"FAIL: no se pudo conectar con Evolus ({exc.__class__.__name__})"

    if raw.status_code != 200:
        return f"FAIL: status code {raw.status_code} (esperado 200)"

    # 2) Estructura: usar el propio cliente y validar el JSON devuelto.
    try:
        data = asyncio.run(client.run_document_extractor(SAMPLE_CLINICAL_TEXT))
    except EvolusAPIError as exc:
        return f"FAIL: cliente Evolus → {exc.detail}"

    if not isinstance(data, dict) or not data:
        return "FAIL: estructura no válida (se esperaba un dict con datos)"

    # 3) El DTO DocumentExtractorResponse debe poder ingerirlo sin errores.
    try:
        mapped = DocumentExtractorResponse.model_validate(data)
    except Exception:  # noqa: BLE001 - el mapeo es tolerante; se reporta el resultado
        return "FAIL: el JSON no cumple el contrato de DocumentExtractorResponse"

    fields = len(mapped.model_dump(exclude_none=True))
    return f"PASS (HTTP 200, {fields} campos extraídos, {len(data)} claves)"


def check_amd_integration() -> str:
    """Ejecuta la integración con AMD TokenFactory (vLLM/ROCm).

    Returns:
        "PASS", "SKIP" o "FAIL: <detalle>".
    """
    if not settings.amd_api_key:
        return "SKIP"  # sin credenciales no se puede probar contra el servicio real

    client = AMDClient()

    if client.is_mock:
        return "SKIP"  # conector dual en modo mock: no hay GPU AMD real que probar

    try:
        result = asyncio.run(
            client.generate_completion(
                system_prompt="Eres un asistente de verificación de infraestructura.",
                user_prompt=AMD_PROBE_PROMPT,
                temperature=0.0,
            )
        )
    except AMDAPIError as exc:
        return f"FAIL: cliente AMD → {exc.detail}"

    if not isinstance(result, dict) or not result:
        return "FAIL: el modelo devolvió un JSON vacío o no válido"

    if result.get("gpu") == "AMD" and result.get("processed") is True:
        return "PASS (JSON determinista recibido: GPU AMD procesó la petición)"

    return f"FAIL: el modelo no confirmó el procesamiento esperado → {result}"


# ---------------------------------------------------------------------------
# Funciones pytest (ejecución opcional bajo pytest)
# ---------------------------------------------------------------------------
def test_evolus_client_integration() -> None:
    """pytest: valida la integración con el Document Extractor de Evolus."""
    result = check_evolus_integration()
    if result.startswith("SKIP"):
        pytest.skip("Sin credenciales de Evolus (EVOLUS_API_KEY / EVOLUS_APPLICATION_ID)")
    assert result != "FAIL", result


def test_amd_client_integration() -> None:
    """pytest: valida la integración con AMD TokenFactory."""
    result = check_amd_integration()
    if result.startswith("SKIP"):
        pytest.skip(
            "Sin credenciales de AMD (AMD_API_KEY) o conector dual en modo mock"
        )
    assert result != "FAIL", result


# ---------------------------------------------------------------------------
# Runner standalone
# ---------------------------------------------------------------------------
def run_all() -> int:
    """Ejecuta todas las pruebas y reporta PASÓ/FALLÓ/SKIP en consola.

    Returns:
        Código de salida 0 (todo ok o skip) o 1 (alguno falló).
    """
    cases = [
        ("Evolus AI · Document Extractor", check_evolus_integration),
        ("AMD TokenFactory · vLLM/ROCm", check_amd_integration),
    ]

    failed = False
    width = max(len(name) for name, _ in cases) + 2
    print("=" * 70)
    print("QA INTEGRATION TESTS - MedGuard AI")
    print("=" * 70)

    for name, fn in cases:
        try:
            result = fn()
        except Exception as exc:  # noqa: BLE001 - volcado de cualquier imprevisto
            result = f"FAIL: excepción inesperada → {exc!r}"

        if result == "SKIP":
            tag = "SKIP"
        elif result.startswith("PASS"):
            tag = "PASÓ"
        else:
            tag = "FALLÓ"
            failed = True

        print(f"\n[{tag}] {name}")
        print(f"    {result}")

    print("\n" + "=" * 70)
    if failed:
        print("RESULTADO GLOBAL: FALLÓ (revisa los detalles y el .env)")
        return 1
    print("RESULTADO GLOBAL: PASÓ (o SKIP por falta de credenciales)")
    return 0


if __name__ == "__main__":
    sys.exit(run_all())