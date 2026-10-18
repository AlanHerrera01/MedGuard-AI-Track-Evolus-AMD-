from io import BytesIO
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[1]  # backend/
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)
REPO_ROOT = Path(__file__).resolve().parents[2]
DOCS_DIR = REPO_ROOT / "documentos"


def test_extract_txt_document():
    """Valida la extracción de texto plano desde un archivo .txt."""
    sample_content = b"HOSPITAL CLINICO\nConsentimiento informado del paciente Juan Perez."
    response = client.post(
        "/api/v1/extract-document",
        files={"file": ("prueba.txt", BytesIO(sample_content), "text/plain")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["filename"] == "prueba.txt"
    assert "Juan Perez" in data["text"]
    assert data["pages"] == 1


def test_extract_pdf_document():
    """Valida la extracción de texto desde un archivo .pdf real del proyecto."""
    pdf_path = DOCS_DIR / "consentimiento_bueno.pdf"
    if not pdf_path.exists():
        return

    with open(pdf_path, "rb") as f:
        response = client.post(
            "/api/v1/extract-pdf",
            files={"file": ("consentimiento_bueno.pdf", f, "application/pdf")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["filename"] == "consentimiento_bueno.pdf"
    assert data["pages"] >= 1
    assert "COLECISTECTOM" in data["text"] or "PACIENTE" in data["text"]


def test_extract_unsupported_format():
    """Valida que formatos no soportados devuelvan error 400."""
    response = client.post(
        "/api/v1/extract-document",
        files={"file": ("archivo.exe", BytesIO(b"\x00\x01\x02"), "application/octet-stream")},
    )
    assert response.status_code == 400
