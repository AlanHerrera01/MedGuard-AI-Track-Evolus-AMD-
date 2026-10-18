import { useState, useEffect } from "react";
import { translations } from "../i18n";
import { extractDocumentFile } from "../services/api";

const SAMPLE_TEXT_EN = `HOSPITAL METROPOLITANO DE ALTA COMPLEJIDAD
SERVICIO DE CIRUGÍA GENERAL Y DIGESTIVA
DOCUMENTO DE CONSENTIMIENTO INFORMADO: COLECISTECTOMÍA LAPAROSCÓPICA

1. IDENTIFICATION AND DIAGNOSIS:
The patient with confidential clinical history, diagnosed with symptomatic recurrent cholelithiasis, consents to the performance of a laparoscopic cholecystectomy under general anesthesia.

2. PROCEDURE EXPLAINED:
The surgical removal of the gallbladder will be performed through minimal incisions assisted by high-definition video camera.

3. GENERAL RISKS MENTIONED:
Mild intraoperative bleeding, surgical wound infection, and tolerable postoperative pain.

[AUDIT NOTE: This document DOES NOT specify:
a) Risk of injury to the main bile duct (common bile duct) or conversion rate to open laparotomy.
b) Alternatives for expectant medical management or pharmacological treatment.
c) Explicit consent for anesthetic technique separately.
d) Prognosis in case of refusal of the surgical procedure.]

Patient Signature: [Registered]
Attending Physician Signature: Dr. R. Valdés (Col. 48102)`;

const SAMPLE_TEXT_ES = `HOSPITAL METROPOLITANO DE ALTA COMPLEJIDAD
SERVICIO DE CIRUGÍA GENERAL Y DIGESTIVA
DOCUMENTO DE CONSENTIMIENTO INFORMADO: COLECISTECTOMÍA LAPAROSCÓPICA

1. IDENTIFICACIÓN Y DIAGNÓSTICO:
El paciente con historia clínica confidencial, diagnosticado con Colelitiasis sintomática recurrente, consiente la realización de una colecistectomía por vía laparoscópica bajo anestesia general.

2. PROCEDIMIENTO EXPLICADO:
Se realizará la extirpación quirúrgica de la vesícula biliar mediante incisiones mínimas asistidas por cámara de video de alta definición.

3. RIESGOS GENERALES MENCIONADOS:
Hemorragia intraoperatoria leve, infección de herida quirúrgica y dolor postoperatorio tolerable.

[NOTA DE AUDITORÍA: El presente documento NO especifica:
a) Riesgo de lesión de vía biliar principal (conducto colédoco) ni tasa de conversión a laparotomía abierta.
b) Alternativas de manejo médico expectante o farmacológico.
c) Consentimiento explícito de técnica anestésica por separado.
d) Pronóstico en caso de rechazo del procedimiento quirúrgico.]

Firma del Paciente: [Registrada]
Firma del Facultativo Responsable: Dr. R. Valdés (Col. 48102)`;

export default function DocumentUploader({ onAudit, loading, lang = "en", documentText, setDocumentText }) {
  const t = translations[lang];
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [docType, setDocType] = useState("surgical");
  const [rigor, setRigor] = useState("extreme");
  const [detectAlternatives, setDetectAlternatives] = useState(true);

  useEffect(() => {
    const text = documentText.trim();
    const chars = documentText.length;
    const words = text ? text.split(/\s+/).length : 0;
    setCharCount(chars);
    setWordCount(words);
  }, [documentText]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!documentText.trim() || loading || isExtracting) return;
    onAudit(documentText);
  };

  const loadSample = () => {
    setLoadingDemo(true);
    setTimeout(() => {
      setDocumentText(lang === "es" ? SAMPLE_TEXT_ES : SAMPLE_TEXT_EN);
      setLoadingDemo(false);
    }, 450);
  };

  const clearText = () => {
    setDocumentText("");
  };

  const pasteText = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        setDocumentText(clipText);
      }
    } catch (err) {
      console.error("Failed to paste:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset value so user can upload the same file again if wanted
    e.target.value = "";

    const fileName = (file.name || "").toLowerCase();
    const isTxt = fileName.endsWith(".txt") || file.type === "text/plain";
    const isPdf = fileName.endsWith(".pdf") || file.type === "application/pdf";

    if (!isTxt && !isPdf) {
      alert(
        lang === "es"
          ? "Por favor sube un archivo de texto (.txt) o PDF (.pdf)"
          : "Please upload a text (.txt) or PDF (.pdf) file"
      );
      return;
    }

    try {
      setIsExtracting(true);
      if (isTxt) {
        const text = await file.text();
        setDocumentText(text);
      } else {
        const response = await extractDocumentFile(file, lang);
        if (response && response.text) {
          setDocumentText(response.text);
        } else {
          alert(
            lang === "es"
              ? "El documento no contiene texto extraíble."
              : "The document does not contain extractable text."
          );
        }
      }
    } catch (err) {
      console.error("Error al leer el archivo:", err);
      alert(
        err.message ||
          (lang === "es"
            ? "Error al leer el archivo. Asegúrate de que sea un archivo válido."
            : "Error reading file. Please ensure it is a valid document.")
      );
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="flex flex-col gap-space-md pb-8">
      {/* Hidden file input for document upload */}
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept=".txt,.pdf"
        onChange={handleFileUpload}
      />
      {/* Compliance & Telemetry Badges Strip */}
      <div className="flex flex-col gap-space-xs pt-1">
        <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-primary shadow-sm whitespace-nowrap">
            <span className="material-symbols-outlined text-[14px]">bolt</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">{t.poweredByAmd}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-secondary-fixed whitespace-nowrap">
            <span className="material-symbols-outlined text-[14px]">psychology</span>
            <span className="font-label-sm text-label-sm">{t.poweredByEvolus}</span>
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-primary">verified_user</span>
            <span className="font-label-sm text-label-sm">{t.hipaaGdpr}</span>
          </div>
          <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
          <span className="font-label-sm text-label-sm text-outline">{t.endToEnd}</span>
        </div>
      </div>

      {/* Header Section */}
      <div className="space-y-1">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight">
          {t.newAnalysis}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {t.newAnalysisSubtitle}
        </p>
      </div>

      {/* Demo Pitch Quick Action Card */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-high p-space-md space-y-space-sm shadow-md">
        <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold uppercase tracking-wide">
                {t.oneTapEval}
              </span>
              <span className="text-on-surface-variant font-label-sm text-label-sm">{t.clinicalSimulator}</span>
            </div>
            <span className="flex items-center gap-1 font-label-sm text-label-sm text-primary font-medium">
              <span className="material-symbols-outlined text-[14px]">timer</span> {t.latency}
            </span>
          </div>
          <button
            type="button"
            onClick={loadSample}
            disabled={loadingDemo || loading}
            className="w-full text-left bg-gradient-to-r from-primary-container via-primary-container to-primary text-on-primary-container font-headline-sm text-headline-sm py-3 px-3.5 rounded-lg flex items-center justify-between active:scale-[0.98] transition-transform shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">{loadingDemo ? "sync" : "play_circle"}</span>
              <span>{t.loadSampleBtn}</span>
            </div>
            <span className="text-label-sm font-label-sm px-2 py-0.5 rounded-full bg-on-primary-container/15 font-semibold">{t.demo5s}</span>
          </button>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            {t.demoDesc}
          </p>
          {/* Alternate Ingestion Methods */}
          <div className="grid grid-cols-2 gap-space-xs pt-1">
            <label className="flex cursor-pointer items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-bright active:scale-[0.98] transition-all">
              <input
                type="file"
                className="hidden"
                accept=".txt,.pdf"
                onChange={handleFileUpload}
              />
              <span className="material-symbols-outlined text-[17px] text-primary">upload_file</span>
              <span className="font-label-md text-label-md">{t.uploadFile}</span>
            </label>
            <button type="button" className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-bright active:scale-[0.98] transition-all">
              <span className="material-symbols-outlined text-[17px] text-primary">document_scanner</span>
              <span className="font-label-md text-label-md">{t.scanOcr}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Medical Document Type Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-label-md text-label-md text-on-surface-variant">{t.protocolType}</span>
          <span className="font-label-sm text-label-sm text-primary">
            {docType === "surgical" ? t.surgicalConsent : docType === "invasive" ? t.invasiveProcedure : t.clinicalTrial}
          </span>
        </div>
        <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setDocType("surgical")}
            className={`px-3 py-1.5 rounded-full font-label-md text-label-md whitespace-nowrap shadow-sm transition-all ${
              docType === "surgical"
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {t.surgicalConsent}
          </button>
          <button
            type="button"
            onClick={() => setDocType("invasive")}
            className={`px-3 py-1.5 rounded-full font-label-md text-label-md whitespace-nowrap shadow-sm transition-all ${
              docType === "invasive"
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {t.invasiveProcedure}
          </button>
          <button
            type="button"
            onClick={() => setDocType("trial")}
            className={`px-3 py-1.5 rounded-full font-label-md text-label-md whitespace-nowrap shadow-sm transition-all ${
              docType === "trial"
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {t.clinicalTrial}
          </button>
        </div>
      </div>

      {/* Main High-Capacity Clinical Editor */}
      <div className="flex flex-col rounded-xl bg-surface-container-high overflow-hidden shadow-md">
        {/* Editor Header Metarail */}
        <div className="flex items-center justify-between px-space-md py-2.5 bg-surface-container">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold">{t.clinicalBuffer}</span>
          </div>
          <div className="flex items-center gap-3 text-on-surface-variant font-label-sm text-label-sm">
            <span>{wordCount.toLocaleString()} {t.words}</span>
            <span className="text-outline-variant">|</span>
            <span>{charCount.toLocaleString()} {t.characters}</span>
          </div>
        </div>
        {/* Textarea Input Area */}
        <div className="relative p-space-md bg-surface-container-low">
          <textarea
            className="w-full bg-transparent text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none resize-none leading-relaxed"
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder={t.pasteText}
            rows={8}
          />
          {/* Visual Scanning Pulse */}
          {(loadingDemo || isExtracting) && (
            <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-primary text-[28px] animate-spin">sync</span>
              <span className="font-label-lg text-label-lg text-primary font-bold">
                {isExtracting
                  ? (lang === "es" ? "Extrayendo texto del PDF con el motor de MedGuard..." : "Extracting PDF text with MedGuard engine...")
                  : (lang === "es" ? "Cargando protocolo de prueba..." : "Loading sample protocol...")}
              </span>
            </div>
          )}
        </div>
        {/* Editor Action Footer Bar */}
        <div className="flex items-center justify-between px-space-md py-2.5 bg-surface-container">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={pasteText}
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-surface-container-high text-on-surface hover:text-primary active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">content_paste</span>
              <span className="font-label-md text-label-md">{t.paste}</span>
            </button>
            <button
              type="button"
              onClick={clearText}
              className="flex items-center gap-1 py-1 px-2 rounded-lg text-on-surface-variant hover:text-error active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              <span className="font-label-md text-label-md">{t.clear}</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-primary">security</span>
            <span className="font-label-sm text-label-sm">{t.volatileMemory}</span>
          </div>
        </div>
      </div>

      {/* Audit Rigor & Analysis Parameters */}
      <div className="rounded-xl bg-surface-container-high p-space-md space-y-space-md shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-headline-sm text-headline-sm text-on-surface">{t.rigorLevel}</span>
            <span className="material-symbols-outlined text-[18px] text-primary">tune</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {t.rigorDesc}
          </p>
        </div>
        {/* Segmented Rigor Selector */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-surface-container-lowest rounded-lg">
          <button
            type="button"
            onClick={() => setRigor("std")}
            className={`py-2 px-1 rounded-md text-center font-label-md text-label-md transition-all ${
              rigor === "std"
                ? "bg-primary-container text-on-primary font-bold shadow-sm"
                : "text-on-surface-variant"
            }`}
          >
            {t.standard}
          </button>
          <button
            type="button"
            onClick={() => setRigor("extreme")}
            className={`py-2 px-1 rounded-md text-center font-label-md text-label-md transition-all ${
              rigor === "extreme"
                ? "bg-primary-container text-on-primary font-bold shadow-sm"
                : "text-on-surface-variant"
            }`}
          >
            {t.extreme}
          </button>
          <button
            type="button"
            onClick={() => setRigor("legal")}
            className={`py-2 px-1 rounded-md text-center font-label-md text-label-md transition-all ${
              rigor === "legal"
                ? "bg-primary-container text-on-primary font-bold shadow-sm"
                : "text-on-surface-variant"
            }`}
          >
            {t.legalExt}
          </button>
        </div>
        {/* Active Rigor Clarification Pill */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-low text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] text-primary">flag</span>
          <span className="font-body-sm text-body-sm">
            <strong className="text-on-surface font-label-md">{t.extremeRecommended}</strong> {t.extremeDesc}
          </span>
        </div>
        {/* Checkbox Critical Parameter */}
        <label className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-container cursor-pointer select-none">
          <input
            type="checkbox"
            checked={detectAlternatives}
            onChange={(e) => setDetectAlternatives(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-primary bg-surface-container-lowest accent-primary focus:ring-0"
          />
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-on-surface font-semibold">{t.detectAlternatives}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
              {t.detectAlternativesDesc}
            </span>
          </div>
        </label>
      </div>

      {/* Primary Main Call to Action */}
      <div className="space-y-space-sm pt-1">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={!documentText.trim() || loading}
          className="w-full bg-primary-container text-on-primary font-headline-md text-headline-md py-3.5 px-space-md rounded-xl shadow-lg shadow-primary-container/20 flex flex-col items-center justify-center active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[24px]">{loading ? "progress_activity" : "verified"}</span>
            <span>{loading ? t.analyzingGpu : t.auditBtn}</span>
          </div>
          <span className="font-label-sm text-label-sm text-on-primary/80 mt-0.5">
            {loading ? t.calculatingRisks : t.auditBtnSubtitle}
          </span>
        </button>
        {/* Bottom Reassurance Microcard */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-secondary">flash_on</span>
            <span className="font-body-sm text-body-sm">Procesamiento paralelo: <strong className="text-on-surface">AMD Instinct™ MI300X</strong></span>
          </div>
          <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-primary">Zero-Data Retention</span>
        </div>
      </div>
    </div>
  );
}
