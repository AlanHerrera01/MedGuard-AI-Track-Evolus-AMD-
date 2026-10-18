"""Pruebas offline del conector dual de AMD (modo mock / híbrido local).

Validan el comportamiento del desarrollo híbrido SIN red ni credenciales:

1. Resolución de modo (``auto`` / ``live`` / ``mock``) según ``AMD_MODE`` y
   la disponibilidad de la instancia AMD (endpoint + API key).
2. Modo mock: respuesta determinista, 100 % offline (cero llamadas httpx),
   siempre conforme a ``AuditReportResponse`` y SIEMPRE con
   ``requires_human_override=True`` y confianza < umbral 0.85.
3. Pipeline completo (ClinicalOrchestrator + AMDClient mock): el informe
   final sale validado por Pydantic y etiquetado como simulado.

Estas pruebas complementan (no sustituyen) a ``test_integrations.py``:
allí se prueba la GPU AMD real; aquí se prueba que el código está listo,
probado y limpio para el momento en que se habilite la instancia.

Uso:
- Standalone:        python backend/tests/test_amd_dual_mode.py
- Con pytest:        pytest backend/tests/test_amd_dual_mode.py -v

No requiere credenciales ni conectividad.
"""

import asyncio
import importlib.util
import sys
from pathlib import Path
from unittest import mock

BACKEND_DIR = Path(__file__).resolve().parents[1]  # backend/
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Consolas Windows (cp1252) no soportan emojis/Unicode: fuerza UTF-8 con fallback.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

from src.core import prompts  # noqa: E402
from src.core.orchestrator import ClinicalOrchestrator  # noqa: E402
from src.schemas.audit_schemas import AuditReportResponse  # noqa: E402
from src.services import amd_client as amd_module  # noqa: E402
from src.services.amd_client import AMDClient  # noqa: E402
from src.services.evolus_client import EvolusAPIError  # noqa: E402

pytest = importlib.util.find_spec("pytest") and __import__("pytest")

# Extracción de prueba (sin PII real) con procedimiento y paciente, pero sin
# firma ni consentimiento: debe traducirse en campos ausentes y riesgos.
SAMPLE_EXTRACTED: dict = {
    "patient_id": "123456789",
    "procedure_name": "apendicectomía programada",
    "document_date": "2026-09-01",
    "medications": ["amoxicilina 500 mg cada 8 h"],
}

# Umbral de confianza del orquestador: el mock jamás debe superarlo.
OVERRIDE_THRESHOLD = ClinicalOrchestrator.CONFIDENCE_OVERRIDE_THRESHOLD


# ---------------------------------------------------------------------------
# Comprobaciones individuales (reutilizables por standalone y pytest)
# ---------------------------------------------------------------------------
def check_mode_resolution() -> str:
    """El conector dual resuelve auto/live/mock según infraestructura."""
    # auto sin API key → mock (instancia AMD no habilitada aún).
    auto_no_key = AMDClient(api_key="", mode="auto")
    if not auto_no_key.is_mock:
        return "FAIL: auto sin API key debería degradar a mock"

    # auto con endpoint + API key → live (lista para vLLM/ROCm).
    auto_with_key = AMDClient(api_key="k", token_endpoint="https://amd.example/v1", mode="auto")
    if auto_with_key.is_mock:
        return "FAIL: auto con endpoint+API key debería resolver a live"

    # mock forzado gana aunque haya credenciales.
    forced_mock = AMDClient(api_key="k", mode="mock")
    if not forced_mock.is_mock:
        return "FAIL: AMD_MODE=mock debe forzar el modo mock"

    # live forzado respeta la decisión del operador (aunque sin key).
    forced_live = AMDClient(api_key="", mode="live")
    if forced_live.is_mock:
        return "FAIL: AMD_MODE=live debe forzar el modo live"

    return "PASS (auto/live/mock resueltos según infraestructura)"


def check_mock_is_offline_and_deterministic() -> str:
    """El modo mock no toca la red y devuelve resultados idénticos."""
    client = AMDClient(mode="mock")
    user_prompt = prompts.get_audit_user_prompt(SAMPLE_EXTRACTED)

    # Cualquier intento de abrir un AsyncClient de httpx es un fallo del test.
    with mock.patch.object(
        amd_module.httpx,
        "AsyncClient",
        side_effect=AssertionError("el modo mock no debe usar httpx"),
    ):
        first = asyncio.run(
            client.generate_completion(
                system_prompt=prompts.CLINICAL_AUDITOR_SYSTEM_PROMPT,
                user_prompt=user_prompt,
            )
        )
        second = asyncio.run(
            client.generate_completion(
                system_prompt=prompts.CLINICAL_AUDITOR_SYSTEM_PROMPT,
                user_prompt=user_prompt,
            )
        )

    if first != second:
        return "FAIL: la simulación debe ser determinista (mismo input, mismo output)"
    return "PASS (cero llamadas httpx; salida determinista)"


def check_mock_schema_and_safety() -> str:
    """El informe simulado valida contra el esquema y exige revisión humana."""
    client = AMDClient(mode="mock")
    user_prompt = prompts.get_audit_user_prompt(SAMPLE_EXTRACTED)

    parsed = asyncio.run(
        client.generate_completion(
            system_prompt=prompts.CLINICAL_AUDITOR_SYSTEM_PROMPT,
            user_prompt=user_prompt,
        )
    )

    try:
        report = AuditReportResponse.model_validate(parsed)
    except Exception as exc:  # noqa: BLE001 - se reporta el resultado
        return f"FAIL: el mock no cumple el esquema AuditReportResponse ({exc})"

    if not report.requires_human_override:
        return "FAIL: el mock debe forzar requires_human_override=True"
    if report.audit_confidence_score >= OVERRIDE_THRESHOLD:
        return (
            "FAIL: la confianza simulada "
            f"({report.audit_confidence_score}) no debe superar {OVERRIDE_THRESHOLD}"
        )
    return (
        f"PASS (esquema válido, override=True, "
        f"confianza={report.audit_confidence_score} < {OVERRIDE_THRESHOLD})"
    )


def check_mock_detects_gaps() -> str:
    """El mock detecta procedimiento y campos administrativos ausentes."""
    client = AMDClient(mode="mock")
    user_prompt = prompts.get_audit_user_prompt(SAMPLE_EXTRACTED)
    parsed = asyncio.run(
        client.generate_completion(
            system_prompt=prompts.CLINICAL_AUDITOR_SYSTEM_PROMPT,
            user_prompt=user_prompt,
        )
    )

    if parsed.get("procedure_name") != "apendicectomía programada":
        return f"FAIL: procedimiento no detectado → {parsed.get('procedure_name')!r}"

    missing = parsed.get("missing_fields") or []
    expected_gaps = ("firma del profesional responsable", "consentimiento informado (si aplica)")
    for gap in expected_gaps:
        if gap not in missing:
            return f"FAIL: el campo ausente {gap!r} no se detectó → {missing}"

    return f"PASS (procedimiento detectado; {len(missing)} campos ausentes señalados)"


def check_orchestrator_end_to_end() -> str:
    """Pipeline completo con Evolus simulado y AMD en modo mock."""

    class _FakeEvolusClient:
        """Duck-typed stub del Document Extractor (sin red)."""

        async def run_document_extractor(self, raw_document_text: str) -> dict:
            return dict(SAMPLE_EXTRACTED)

    orchestrator = ClinicalOrchestrator(
        evolus_client=_FakeEvolusClient(),
        amd_client=AMDClient(mode="mock"),
    )
    result = asyncio.run(orchestrator.process_audit("Texto clínico de prueba."))

    try:
        report = AuditReportResponse.model_validate(result)
    except Exception as exc:  # noqa: BLE001 - se reporta el resultado
        return f"FAIL: el informe final no valida ({exc})"

    if not report.requires_human_override:
        return "FAIL: el pipeline mock debe exigir revisión humana"
    if not result.get("safety_notice"):
        return "FAIL: falta el safety_notice que etiqueta el informe simulado"
    return "PASS (pipeline completo validado y etiquetado como simulado)"


def check_failing_extraction_stays_safe() -> str:
    """Si Evolus falla, el mock devuelve contingencia segura y desconfianza."""

    class _BrokenEvolusClient:
        async def run_document_extractor(self, raw_document_text: str) -> dict:
            raise EvolusAPIError("document-extractor", "sin backend (modo local)")

    orchestrator = ClinicalOrchestrator(
        evolus_client=_BrokenEvolusClient(),
        amd_client=AMDClient(mode="mock"),
    )
    result = asyncio.run(orchestrator.process_audit("Texto clínico de prueba."))

    report = AuditReportResponse.model_validate(result)
    if not report.requires_human_override:
        return "FAIL: con extracción fallida debe exigirse revisión humana"
    if report.audit_confidence_score > 0.1:
        return "FAIL: la confianza debe ser mínima sin evidencia extraída"
    return "PASS (extracción fallida → contingencia segura con desconfianza máxima)"


# ---------------------------------------------------------------------------
# Funciones pytest (ejecución opcional bajo pytest)
# ---------------------------------------------------------------------------
def test_mode_resolution() -> None:
    result = check_mode_resolution()
    assert not result.startswith("FAIL"), result


def test_mock_is_offline_and_deterministic() -> None:
    result = check_mock_is_offline_and_deterministic()
    assert not result.startswith("FAIL"), result


def test_mock_schema_and_safety() -> None:
    result = check_mock_schema_and_safety()
    assert not result.startswith("FAIL"), result


def test_mock_detects_gaps() -> None:
    result = check_mock_detects_gaps()
    assert not result.startswith("FAIL"), result


def test_orchestrator_end_to_end() -> None:
    result = check_orchestrator_end_to_end()
    assert not result.startswith("FAIL"), result


def test_failing_extraction_stays_safe() -> None:
    result = check_failing_extraction_stays_safe()
    assert not result.startswith("FAIL"), result


# ---------------------------------------------------------------------------
# Runner standalone
# ---------------------------------------------------------------------------
def run_all() -> int:
    """Ejecuta todas las pruebas y reporta PASÓ/FALLÓ en consola.

    Returns:
        Código de salida 0 (todo ok) o 1 (alguno falló).
    """
    cases = [
        ("Conector dual · resolución de modo", check_mode_resolution),
        ("Modo mock · offline + determinista", check_mock_is_offline_and_deterministic),
        ("Modo mock · esquema + seguridad", check_mock_schema_and_safety),
        ("Modo mock · detección de vacíos", check_mock_detects_gaps),
        ("Orquestador · pipeline completo (mock)", check_orchestrator_end_to_end),
        ("Orquestador · extracción fallida (mock)", check_failing_extraction_stays_safe),
    ]

    failed = False
    print("=" * 70)
    print("DUAL MODE TESTS (offline) - MedGuard AI")
    print("=" * 70)

    for name, fn in cases:
        try:
            result = fn()
        except Exception as exc:  # noqa: BLE001 - volcado de cualquier imprevisto
            result = f"FAIL: excepción inesperada → {exc!r}"

        tag = "PASÓ" if result.startswith("PASS") else "FALLÓ"
        failed = failed or tag == "FALLÓ"
        print(f"\n[{tag}] {name}")
        print(f"    {result}")

    print("\n" + "=" * 70)
    if failed:
        print("RESULTADO GLOBAL: FALLÓ (revisa los detalles)")
        return 1
    print("RESULTADO GLOBAL: PASÓ (modo híbrido listo para la instancia AMD)")
    return 0


if __name__ == "__main__":
    sys.exit(run_all())
