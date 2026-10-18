"""DTOs de la integración con las herramientas de Evolus AI.

Define el contrato de petición común de un AI Tool (``EvolusToolRequest``)
y la respuesta estructurada del Document Extractor (``DocumentExtractorResponse``),
cuyos campos son opcionales porque el JSON devuelto por Evolus puede variar
según el documento procesado.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EvolusToolRequest(BaseModel):
    """Petición base para los AI Tools de Evolus que procesan texto.

    Attributes:
        text: Contenido textual que la herramienta debe procesar.
        options: Opciones específicas de la herramienta (p. ej.
            ``{"format": "json", "content": "data"}`` para ``doc-structure``).
    """

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    text: str = Field(
        min_length=1,
        description="Texto de entrada (documento clínico) que procesa el AI Tool de Evolus.",
    )

    options: dict[str, Any] | None = Field(
        default=None,
        description="Opciones opcionales del AI Tool de Evolus.",
    )


class DocumentExtractorResponse(BaseModel):
    """Respuesta estructurada del Document Extractor de Evolus AI.

    Todos los campos son opcionales: la extracción depende del contenido
    del documento y del modelo subyacente, por lo que es posible que
    algunos atributos no estén presentes.

    Attributes:
        patient_id: Identificador del paciente, si fue detectado.
        patient_name: Nombre del paciente, si fue detectado.
        date_of_birth: Fecha de nacimiento en formato ISO o textual.
        document_date: Fecha del documento clínico.
        procedure_name: Procedimiento o intervención descrita.
        diagnosis: Diagnóstico principal mencionado.
        medications: Lista de medicamentos identificados.
        allergies: Lista de alergias registradas.
        physician: Profesional sanitario que firma o atiende.
        notes: Notas clínicas o texto libre extraído.
        extra_data: Campos adicionales no contemplados (tolerancia a la evolución del modelo).
    """

    model_config = ConfigDict(extra="ignore")

    patient_id: str | None = Field(
        default=None,
        description="Identificador del paciente detectado (sin anonimizar).",
    )
    patient_name: str | None = Field(
        default=None,
        description="Nombre del paciente detectado.",
    )
    date_of_birth: str | None = Field(
        default=None,
        description="Fecha de nacimiento del paciente.",
    )
    document_date: str | None = Field(
        default=None,
        description="Fecha del documento clínico.",
    )
    procedure_name: str | None = Field(
        default=None,
        description="Procedimiento o intervención clínica detectada.",
    )
    diagnosis: str | None = Field(
        default=None,
        description="Diagnóstico principal mencionado en el documento.",
    )
    medications: list[str] = Field(
        default_factory=list,
        description="Medicamentos identificados en el documento.",
    )
    allergies: list[str] = Field(
        default_factory=list,
        description="Alergias registradas en el documento.",
    )
    physician: str | None = Field(
        default=None,
        description="Profesional sanitario que firma o atiende el documento.",
    )
    notes: str | None = Field(
        default=None,
        description="Notas clínicas o fragmentos de texto libre extraídos.",
    )
    extra_data: dict[str, Any] = Field(
        default_factory=dict,
        description="Campos adicionales devueltos por el modelo y no mapeados.",
    )