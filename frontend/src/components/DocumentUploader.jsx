import { useState } from "react";
import { translations } from "../i18n";

const SAMPLE_TEXT_EN = `INFORMED CONSENT FOR SURGICAL PROCEDURE

Patient: __NAME__
Date: __MISSING_DATE__

Appendectomy is proposed. Known allergies not specified. Surgeon signature missing. Explicit anesthesia consent omitted. Incomplete patient ID. Valid signature date missing.

DOSAGE: Amoxicillin 1 g every 4 hours mentioned without max duration or renal adjustment.`;

const SAMPLE_TEXT_ES = `CONSENTIMIENTO INFORMADO PARA PROCEDIMIENTO QUIRÚRGICO

Paciente: __NOMBRE__
Fecha: __SIN_FECHA__

Se propone la realización de una apendicectomía. No se especifica alergias conocidas. No consta firma del profesional responsable. Se omite el consentimiento explícito para anestesia. No se registra número de identificación completo. Falta fecha válida de firma.

POSOLOGÍA: Amoxicilina 1 g cada 4 horas sin indicación de duración máxima ni ajuste renal.`;

export default function DocumentUploader({ onAudit, loading, lang = "en" }) {
  const [documentText, setDocumentText] = useState("");
  const t = translations[lang];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!documentText.trim() || loading) return;
    onAudit(documentText);
  };

  const loadSample = () => {
    setDocumentText(lang === "es" ? SAMPLE_TEXT_ES : SAMPLE_TEXT_EN);
  };

  return (
    <form onSubmit={handleSubmit} className="document-uploader">
      <div className="uploader-header">
        <h2>{t.documentTitle}</h2>
        <button type="button" className="secondary" onClick={loadSample} disabled={loading}>{t.loadSample}</button>
      </div>
      <textarea className="uploader-textarea" value={documentText} onChange={(e) => setDocumentText(e.target.value)} placeholder={t.pasteText} rows={14} />
      <div className="uploader-actions">
        <button type="submit" className="primary" disabled={!documentText.trim() || loading}>{loading ? t.processing : t.auditBtn}</button>
      </div>
      {loading && <div className="loading-indicator"><div className="spinner" /><span>{t.analyzing}</span></div>}
    </form>
  );
}
