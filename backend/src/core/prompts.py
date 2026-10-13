"""Prompts del Agente Auditor de MedGuard AI (desplegado en AMD Cloud).

Diseñados con criterio de Ingeniería de Prompts y Cumplimiento Normativo
(ISO 27001 / GDPR / auditoría administrativa clínica):

- Ámbito LIMITADO a lo administrativo y de cumplimiento: el modelo jamás
  emite diagnóstico ni consejo clínico (se evita el sesgo de "LLM clínico").
- Salida contractual en JSON estricto: se exige el esquema exacto de
  ``AuditReportResponse`` para garantizar validación Pydantic aguas arriba.
- Principio de minimización de datos (GDPR): la auditoría trabaja con datos
  extraídos/anónimos (``patient_id_masked``) y nunca debe reproducir PII
  innecesaria.
- Desconfianza explícita: ante incertidumbre se fuerza
  ``requires_human_override = true`` (control humano obligatorio).

Estas constantes se envían al LLM servido en AMD (vLLM/ROCm) a través de
``AMDClient.generate_completion`` / ``analyze_with_amd_model``.
"""

import json

# ---------------------------------------------------------------------------
# System prompt: rol, alcance y restricciones del Agente Auditor.
# ---------------------------------------------------------------------------
CLINICAL_AUDITOR_SYSTEM_PROMPT = """\
Eres un Auditor Senior de Cumplimiento Normativo y Procesos Administrativos en Salud. NUNCA emitas diagnósticos médicos, tratamientos ni consejos clínicos. Tu único objetivo es auditar la integridad administrativa de documentos, detectar vacíos en consentimientos informados, verificar faltas de firmas/fechas y señalar riesgos legales o de protección de datos (PII).
Responde ÚNICAMENTE en formato JSON válido que cumpla estrictamente con el esquema requerido, sin texto adicional fuera del JSON.
"""

# ---------------------------------------------------------------------------
# Campos administrativos obligatorios que el auditor debe verificar
# (integridad documental, no criterio médico).
# ---------------------------------------------------------------------------
MINIMUM_REQUIRED_FIELDS: tuple[str, ...] = (
    "identificación del paciente",
    "procedimiento o finalidad del documento",
    "fecha del documento",
    "firma del profesional responsable",
    "consentimiento informado (si aplica)",
)

# Categorías de riesgo permitidas en la salida (documental/legal/PII).
RISK_CATEGORIES: tuple[str, ...] = (
    "ALLERGY_WARNING",   # solo ausencia de registro documental de alergias.
    "CONSENT_GAP",       # consentimiento ausente, incompleto o vencido.
    "DOSAGE_CHECK",      # solo registro posológico/documental inconsistente.
    "LEGAL_COMPLIANCE",  # incumplimiento legal, normativo o de protección de datos.
)

# Plantilla del contrato JSON de salida (esquema requerido).
AUDIT_OUTPUT_SCHEMA = """\
{
  "status": "completed",
  "procedure_name": "procedimiento detectado o UNKNOWN",
  "patient_id_masked": "identificador anonimizado o [REDACTED]",
  "missing_fields": ["campo administrativo ausente"],
  "clinical_risks": [
    {
      "risk_category": "CONSENT_GAP | LEGAL_COMPLIANCE | DOSAGE_CHECK | ALLERGY_WARNING",
      "description": "descripción del riesgo detectado",
      "severity": "HIGH | MEDIUM | LOW"
    }
  ],
  "requires_human_override": true,
  "audit_confidence_score": 0.0
}
"""

# La salida debe respetar el rango de confianza cerrado [0.0, 1.0].
_CONFIDENCE_RULE = (
    "Asigna `audit_confidence_score` entre 0.0 y 1.0 según la completitud y "
    "solidez de la evidencia documental disponible."
)

# Regla de desconfianza: cualquier incertidumbre relevante deriva en
# revisión humana obligatoria (control ISO 27001 / consentimiento).
_OVERRIDE_RULE = (
    "Si existe incertidumbre significativa (ausencia de firmas/fechas "
    "verificables, consentimiento ausente, extracción incompleta o datos "
    "contradictorios), establece `requires_human_override` en true."
)


def get_audit_user_prompt(extracted_data: dict) -> str:
    """Construye el prompt de usuario para el Agente Auditor.

    Recibe los datos estructurados por el Document Extractor de Evolus y
    pide evaluar exclusivamente el cumplimiento administrativo:

    1. Campos obligatorios faltantes.
    2. Riesgos legales o de consentimiento (PII incluida).
    3. Confianza del análisis en [0.0, 1.0], activando
       ``requires_human_override`` ante incertidumbre.

    Args:
        extracted_data: Diccionario con los datos extraídos por Evolus
            (p. ej. ``procedure_name``, ``medications``, notas, etc.).
            Si no se pudo extraer nada, pasar un dict vacío o con
            ``{"document_text": ...}``; el prompt lo tratará como evidencia
            limitada y exigirá revisión humana.

    Returns:
        Prompt de usuario listo para ``AMDClient.generate_completion``.
    """
    payload = extracted_data or {}
    data_json = json.dumps(
        payload, ensure_ascii=False, indent=2, default=str
    ) or "{}"

    missing_hint = ""
    if not payload:
        missing_hint = (
            "\nNOTA: no se recibieron datos estructurados. Audita con la "
            "evidencia disponible y activa `requires_human_override` a true "
            "dado que la extracción falló o está incompleta."
        )

    required_fields = ", ".join(f'"{f}"' for f in MINIMUM_REQUIRED_FIELDS)
    risk_categories = " | ".join(RISK_CATEGORIES)

    return f"""\
Evalúa el siguiente documento clínico a partir de su extracción estructurada.

--- DATOS ESTRUCTURADOS (Document Extractor de Evolus) ---
{data_json}
--- FIN DE LA EXTRACCIÓN ---{missing_hint}

TAREA — ámbito EXCLUSIVAMENTE administrativo y de cumplimiento (ISO 27001 / GDPR):
1. Determina qué campos administrativos obligatorios faltan o están incompletos.
   Campos a verificar: {required_fields}.
2. Identifica riesgos de consentimiento informado, legales o de protección de
   datos (PII/PHI). Clasifica cada riesgo con una de estas categorías:
   {risk_categories}.
   Recuerda: NUNCA sugieras tratamientos ni emitas juicios clínicos.
3. {_CONFIDENCE_RULE}
4. {_OVERRIDE_RULE}

Responde ÚNICAMENTE con el siguiente JSON, sin texto adicional:
{AUDIT_OUTPUT_SCHEMA}
"""