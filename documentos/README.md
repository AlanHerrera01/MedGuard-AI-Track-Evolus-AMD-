# Documentos de Prueba para MedGuard AI

Esta carpeta contiene ejemplos de documentos clínicos para probar el sistema de auditoría.

## Archivos Disponibles

### 1. Consentimiento Bueno (completo)
- **Consentimiento Bueno.txt** - Documento completo con todos los campos necesarios
- **Consentimiento Bueno.pdf** - Versión PDF del mismo documento

Este documento incluye:
- ✅ Nombre completo del paciente
- ✅ Número de documento de identidad
- ✅ Fecha de nacimiento
- ✅ Fecha del procedimiento
- ✅ Descripción detallada del procedimiento
- ✅ Riesgos y complicaciones completos
- ✅ Alternativas al procedimiento
- ✅ Firma del paciente
- ✅ Firma del médico cirujano
- ✅ Firma del anestesiólogo
- ✅ Historia clínica
- ✅ Información de anestesia

### 2. Consentimiento Malo (incompleto - para alertas)
- **Consentimiento Malo.txt** - Documento incompleto con errores
- **Consentimiento Malo.pdf** - Versión PDF del mismo documento

Este documento carece de:
- ❌ Sin fecha del procedimiento
- ❌ Sin nombre completo del paciente (solo "Juan Pérez")
- ❌ Sin número de documento
- ❌ Sin descripción de riesgos específicos
- ❌ Sin alternativas al procedimiento
- ❌ Sin firma del médico
- ❌ Sin firma del anestesiólogo
- ❌ Sin firma del paciente
- ❌ Sin historia clínica

## Cómo Usar

### Para probar con el texto:
1. Copia el contenido del archivo `.txt`
2. Pégalo en el área de texto del frontend
3. Haz clic en "AUDITAR" o usa el botón "PROBAR CON DOCUMENTO DE PRUEBA"
4. Observa los resultados de la auditoría

### Para probar con PDF:
1. Abre el frontend en http://localhost:5173
2. Haz clic en el botón "Upload File"
3. Selecciona el archivo PDF
4. El sistema extraerá el texto y lo mostrará en el área de texto
5. Haz clic en "AUDITAR"

## Expected Results

### Para "Consentimiento Bueno":
- `status`: "completed"
- `audit_confidence_score`: > 0.85 (si todo está completo)
- `requires_human_override`: false (si todo está bien)
- `missing_fields`: [] (vacío)
- `clinical_risks`: [] (vacío o muy pocos)

### Para "Consentimiento Malo":
- `status`: "completed" (o "failed" en modo fallback)
- `audit_confidence_score`: < 0.6 (en modo mock) o < 0.85 (si hay campos faltantes)
- `requires_human_override`: true (siempre para documentos incompletos)
- `missing_fields`: ["identificación del paciente", "procedimiento o finalidad", "fecha", "firma", "consentimiento"]
- `clinical_risks`: Lista de riesgos por cada campo faltante

## Notas

- El sistema usará **Gemini** como LLM por defecto
- Si no hay API key de Gemini, usará el **modo mock** (simulación local)
- El modo mock siempre fuerza `requires_human_override = true` y limita la confianza a 0.6
- Los informes simulados incluyen un `safety_notice` explícito