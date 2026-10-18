import { useEffect, useMemo, useRef, useState } from "react";
import { translations } from "../i18n";

/* Copy específico del reporte pericial (cuerpo del diseño, sin header/nav/footer) */
const COPY = {
  es: {
    crumbAudits: "Auditorías",
    crumbCat: "Cirugía General",
    hashOk: "HASH_OK",
    verdictObserved: "Dictamen Observado",
    verdictApt: "Dictamen Apto",
    pillInference: "Inferencia GPU",
    pillEngine: "Motor Pericial",
    pillCrypto: "Cripto Forense",
    engineValue: "Evolus v4.2 Pro",
    exportPdf: "Exportar PDF",
    share: "Comisión Médica",
    approveSalvedades: "Aprobar con Salvedades",
    hitlTitle: "Intervención Humana Requerida (Human-in-the-Loop)",
    hitlScore: "Score",
    hitlMin: "Umbral Min: 85%",
    hitlMsg:
      "Se detectaron omisiones críticas y riesgos severos en el protocolo de consentimiento. Requiere subsanación inmediata y firma digital cualificada por el responsable previo al archivo médico definitivo.",
    okTitle: "Sin Intervención Humana Requerida",
    okMsg:
      "El expediente supera el umbral pericial mínimo. El dictamen puede archivarse con firma digital cualificada.",
    btnSubsanate: "Subsanar Cláusulas Ahora",
    dossier: "Ficha Clínica",
    identLabel: "Identificador Anonimizado",
    identMeta: "Expediente anonimizado bajo Safe Harbor",
    procedureLabel: "Procedimiento Quirúrgico",
    respLabel: "Responsable / Estado",
    dateLabel: "Fecha del Informe",
    sealLabel: "Sello Forense Inmutable",
    onChain: "ON-CHAIN",
    timestamp: "Timestamp UTC:",
    idxTitle: "Índice Pericial",
    noApto: "NO APTO",
    apto: "APTO",
    scoreLabel: "Score Pericial",
    belowThreshold: "< 85% Umbral Mínimo",
    aboveThreshold: "≥ 85% Umbral Mínimo",
    mCoverage: "Cobertura Documental",
    mRisks: "Carga de Riesgos Detectados",
    mHuman: "Validación Humana",
    mNorm: "Conformidad Normativa",
    exposure: "Exposición Médico-Legal",
    exposureHigh: "ALTA",
    exposureLow: "BAJA",
    exposureMsgHigh: "Vulnerable a nulidad de consentimiento en juicio oral.",
    exposureMsgLow: "Sin vulnerabilidades críticas detectadas en el expediente.",
    reqTitle: "Requisitos Obligatorios Faltantes",
    nInfractions: (n) => `${n} ${n === 1 ? "Infracción" : "Infracciones"}`,
    folio: (i) => `Folio ${String(i).padStart(2, "0")}`,
    noInfractions: "Sin omisiones",
    missingSub: "Campo obligatorio ausente en el expediente clínico",
    critical: "Crítico",
    reqTag: "Requisito obligatorio NOM-004-SSA3",
    reviewClause: "Revisar cláusula",
    matrixTitle: "Matriz de Riesgos Clínico-Legales",
    insertClause: "Insertar Cláusula Estándar",
    completeReg: "Completar Registro",
    acceptFix: "Aceptar Corrección",
    visorTitle: "Visor de Evidencia OCR",
    folioOf: (p) => `Folio ${p}`,
    dictamenTitle: "Dictamen del Auditor Forense",
    obsLabel: "Observaciones Legales y Conclusiones Periciales",
    obsPlaceholder:
      "Ingrese comentarios periciales para el expediente judicial o comité de bioética...",
    certLabel: "Certificado Pericial Activo",
    certName: "Firma e.Firma Médica SAT/SS",
    certMeta: "Válido hasta: 12/2026 • OCSP Online",
    finalApprove: "Aprobar y Archivar con Salvedades",
    exportDict: "Exportar Dictamen",
    auditNew: "Auditar Nuevo Doc",
    drawerTitle: "Subsanación Rápida Forense",
    drawerDesc:
      "Complete o verifique los datos omitidos. Las modificaciones generan una transacción de actualización sellada con hardware AMD TrustZone.",
    f1: "1. Fecha y Hora Efectiva de Firma",
    f2: "2. Testigo Presencial / Familiar Responsable",
    f3: "3. Cláusula Adicional de Laparotomía",
    f3label:
      "El paciente fue informado y consiente expresamente la eventual conversión a cirugía abierta.",
    f4: "4. Cédula del Primer Ayudante",
    phWitness: "Nombre completo del testigo",
    phId: "Identificación Oficial / INE / Pasaporte",
    phCedula: "Cédula profesional",
    cancel: "Cancelar",
    save: "Guardar y Re-auditar",
    toastSaved: "Cláusulas subsanadas. Procesando nueva inferencia en AMD GPU...",
    toastApproved: "Expediente firmado pericialmente y archivado en Blockchain Médica.",
    toastExport: "Compilando dictamen forense con sello de 300 DPI...",
    toastShare: "Dictamen enviado a la Comisión Médica correspondiente.",
    toastClause: "Cláusula estándar lista para insertar en el expediente.",
    toastRecord: "Registro completado. Requiere re-auditoría para validar.",
    toastFix: "Corrección de formato aceptada en el buffer clínico.",
    volatilNote:
      "Vista previa local en memoria volátil • el original nunca se almacena en el servidor",
    textBuffer: "Buffer de Texto",
    kb: "KB",
  },
  en: {
    crumbAudits: "Audits",
    crumbCat: "General Surgery",
    hashOk: "HASH_OK",
    verdictObserved: "Observed Verdict",
    verdictApt: "Fit Verdict",
    pillInference: "GPU Inference",
    pillEngine: "Forensic Engine",
    pillCrypto: "Forensic Crypto",
    engineValue: "Evolus v4.2 Pro",
    exportPdf: "Export PDF",
    share: "Medical Commission",
    approveSalvedades: "Approve with Caveats",
    hitlTitle: "Human Intervention Required (Human-in-the-Loop)",
    hitlScore: "Score",
    hitlMin: "Min Threshold: 85%",
    hitlMsg:
      "Critical omissions and severe risks were detected in the surgical consent protocol. Immediate remediation and a qualified digital signature by the responsible surgeon are required before final filing.",
    okTitle: "No Human Intervention Required",
    okMsg:
      "The record exceeds the minimum forensic threshold. The verdict can be archived with a qualified digital signature.",
    btnSubsanate: "Remediate Clauses Now",
    dossier: "Clinical Record",
    identLabel: "Anonymized Identifier",
    identMeta: "Record anonymized under Safe Harbor",
    procedureLabel: "Surgical Procedure",
    respLabel: "Responsible / Status",
    dateLabel: "Report Date",
    sealLabel: "Immutable Forensic Seal",
    onChain: "ON-CHAIN",
    timestamp: "UTC Timestamp:",
    idxTitle: "Forensic Index",
    noApto: "UNFIT",
    apto: "FIT",
    scoreLabel: "Forensic Score",
    belowThreshold: "< 85% Minimum Threshold",
    aboveThreshold: "≥ 85% Minimum Threshold",
    mCoverage: "Documentary Coverage",
    mRisks: "Detected Risk Load",
    mHuman: "Human Validation",
    mNorm: "Regulatory Compliance",
    exposure: "Medical-Legal Exposure",
    exposureHigh: "HIGH",
    exposureLow: "LOW",
    exposureMsgHigh: "Vulnerable to annulment of consent during oral trial.",
    exposureMsgLow: "No critical vulnerabilities detected in the record.",
    reqTitle: "Missing Mandatory Requirements",
    nInfractions: (n) => `${n} ${n === 1 ? "Infraction" : "Infractions"}`,
    folio: (i) => `Folio ${String(i).padStart(2, "0")}`,
    noInfractions: "No omissions",
    missingSub: "Mandatory field missing from the clinical record",
    critical: "Critical",
    reqTag: "Mandatory requirement NOM-004-SSA3",
    reviewClause: "Review clause",
    matrixTitle: "Clinical-Legal Risk Matrix",
    insertClause: "Insert Standard Clause",
    completeReg: "Complete Record",
    acceptFix: "Accept Fix",
    visorTitle: "OCR Evidence Viewer",
    folioOf: (p) => `Folio ${p}`,
    dictamenTitle: "Forensic Auditor Verdict",
    obsLabel: "Legal Observations and Forensic Conclusions",
    obsPlaceholder:
      "Enter pericial comments for the judicial record or bioethics committee...",
    certLabel: "Active Forensic Certificate",
    certName: "SAT/SS Medical e.Signature",
    certMeta: "Valid until: 12/2026 • OCSP Online",
    finalApprove: "Approve & Archive with Caveats",
    exportDict: "Export Verdict",
    auditNew: "Audit New Doc",
    drawerTitle: "Fast Forensic Remediation",
    drawerDesc:
      "Complete or verify the omitted data. Changes generate an update transaction sealed with AMD TrustZone hardware.",
    f1: "1. Effective Signing Date and Time",
    f2: "2. Direct Witness / Responsible Family Member",
    f3: "3. Additional Laparotomy Clause",
    f3label:
      "The patient was informed and expressly consents to the possible conversion to open surgery.",
    f4: "4. Assistant Surgeon License",
    phWitness: "Full name of the witness",
    phId: "Official ID / Passport",
    phCedula: "Professional license",
    cancel: "Cancel",
    save: "Save & Re-audit",
    toastSaved: "Clauses remediated. Running new inference on AMD GPU...",
    toastApproved: "Record forensically signed and archived on Medical Blockchain.",
    toastExport: "Compiling forensic verdict with 300 DPI seal...",
    toastShare: "Verdict sent to the corresponding Medical Commission.",
    toastClause: "Standard clause ready to insert into the record.",
    toastRecord: "Record completed. Re-audit required to validate.",
    toastFix: "Format fix accepted in the clinical buffer.",
    volatilNote:
      "Local preview in volatile memory • the original is never stored server-side",
    textBuffer: "Text Buffer",
    kb: "KB",
  },
};

const SEVERITY_STYLES = {
  HIGH: "bg-error-container text-on-error-container",
  MEDIUM: "bg-tertiary-container/30 text-tertiary",
  LOW: "bg-surface-container-high text-on-surface-variant",
};

const SEVERITY_DOT = {
  HIGH: "bg-error",
  MEDIUM: "bg-tertiary-container",
  LOW: "bg-outline",
};

function SeverityBadge({ level }) {
  const key = (level || "").toUpperCase();
  return (
    <span
      className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-bold uppercase tracking-wider ${
        SEVERITY_STYLES[key] || SEVERITY_STYLES.LOW
      }`}
    >
      {key}
    </span>
  );
}

function MetricBar({ label, value }) {
  const color =
    value >= 85 ? "text-primary" : value >= 60 ? "text-tertiary" : "text-error";
  const bar =
    value >= 85 ? "bg-primary-container" : value >= 60 ? "bg-tertiary-container" : "bg-error";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between font-label-sm text-label-sm">
        <span className="text-on-surface">{label}</span>
        <span className={`font-bold font-mono ${color}`}>{value}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function AuditReportDetails({
  results,
  lang = "en",
  onNewAudit,
  sourceFile = null,
  documentText = "",
}) {
  const t = translations[lang] || translations.es;
  const c = COPY[lang] || COPY.es;

  const [filter, setFilter] = useState("all");
  const [toasts, setToasts] = useState([]);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const [notes, setNotes] = useState("");
  const [form, setForm] = useState({
    datetime: "2024-10-24T08:30",
    witness: "",
    witnessId: "",
    laparotomy: true,
    assistant: "",
  });
  const canvasRef = useRef(null);
  const [reportDate] = useState(() => new Date());
  const sealId = useMemo(() => `#AUD-${Date.now().toString().slice(-6)}`, []);

  const isPdfFile =
    !!sourceFile &&
    (sourceFile.type === "application/pdf" || (sourceFile.name || "").toLowerCase().endsWith(".pdf"));

  // URL de blob en memoria para previsualizar el PDF original (se revoca al cambiar/desmontar)
  const [previewUrl, setPreviewUrl] = useState(null);
  useEffect(() => {
    if (!isPdfFile || !sourceFile) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(sourceFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sourceFile, isPdfFile]);

  if (!results) return null;

  const {
    procedure_name,
    patient_id_masked,
    missing_fields = [],
    clinical_risks = [],
    requires_human_override,
    audit_confidence_score,
    status,
  } = results;

  const highCount = clinical_risks.filter((r) => (r.severity || "").toUpperCase() === "HIGH").length;
  const medCount = clinical_risks.filter((r) => (r.severity || "").toUpperCase() === "MEDIUM").length;
  const lowCount = clinical_risks.filter((r) => (r.severity || "").toUpperCase() === "LOW").length;
  const total = clinical_risks.length;

  const filtered = clinical_risks.filter(
    (r) => filter === "all" || (r.severity || "").toUpperCase() === filter.toUpperCase()
  );

  const rawScore = audit_confidence_score ?? 0;
  const score = rawScore <= 1.0 ? Math.round(rawScore * 100) : Math.round(rawScore);
  const RING = 301.59; // 2 * PI * 48
  const scoreColor = score < 85 ? "#ff6a79" : score < 95 ? "#f59e0b" : "#22c55e";
  const belowThreshold = score < 85;

  // Métricas derivadas reales para las barras del Índice Pericial
  const coverage = Math.max(0, Math.min(100, 100 - missing_fields.length * 15));
  const riskLoad = Math.max(
    0,
    Math.min(100, 100 - (highCount * 20 + medCount * 10 + lowCount * 4))
  );
  const humanScore = requires_human_override ? 40 : 100;
  const exposureHigh = requires_human_override || belowThreshold;

  const pushToast = (message, type = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
  };

  const openDrawer = () => {
    setDrawerMounted(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setDrawerOpen(true);
      })
    );
  };
  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setDrawerMounted(false), 300);
  };

  const zoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
  const zoomFit = () => {
    setZoom(1);
    setPage(1);
  };
  const toggleFullscreen = () => {
    const el = canvasRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  };

  const pdfSrc = previewUrl
    ? `${previewUrl}#page=${page}&view=FitH&zoom=${Math.round(zoom * 100)}`
    : null;

  return (
    <div className="flex flex-col w-full">
      {/* ============ Top Command & Breadcrumb Strip ============ */}
      <section className="w-full bg-surface-container-lowest px-space-md py-space-sm rounded-xl shadow-md border border-outline/10">
        <div className="w-full flex flex-col xl:flex-row items-start xl:items-center justify-between gap-space-md">
          {/* Breadcrumbs & Document Title Group */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider flex-wrap">
              <span className="hover:text-primary cursor-pointer transition-colors">
                {c.crumbAudits}
              </span>
              <span className="text-outline">/</span>
              <span className="hover:text-primary cursor-pointer transition-colors">
                {c.crumbCat}
              </span>
              <span className="text-outline">/</span>
              <span className="text-primary font-bold">{patient_id_masked || "[REDACTED]"}</span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary font-mono">
                {c.hashOk}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-space-sm">
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-bold tracking-tight">
                {t.reportTitle}
              </h1>
              <span
                className={`px-2.5 py-1 rounded font-label-sm text-label-sm font-bold uppercase tracking-wider ${
                  requires_human_override || belowThreshold
                    ? "bg-error-container text-on-error-container"
                    : "bg-primary-container text-on-primary"
                }`}
              >
                {requires_human_override || belowThreshold ? c.verdictObserved : c.verdictApt}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {t.reportSubtitle}
            </p>
          </div>

          {/* Telemetry Hardware Pills & Top Actions */}
          <div className="flex flex-wrap items-center gap-space-sm justify-start xl:justify-end shrink-0">
            <div className="flex items-center gap-space-xs px-3 py-1.5 rounded-lg bg-surface-container">
              <span className="material-symbols-outlined text-primary text-[18px]">memory</span>
              <div className="flex flex-col leading-none">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  AMD Instinct MI300X
                </span>
                <span className="font-label-sm text-label-sm text-primary font-bold mt-0.5">
                  {c.pillInference}
                </span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-space-xs px-3 py-1.5 rounded-lg bg-surface-container">
              <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
              <div className="flex flex-col leading-none">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {c.pillEngine}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface font-semibold mt-0.5">
                  {c.engineValue}
                </span>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-space-xs px-3 py-1.5 rounded-lg bg-surface-container">
              <span className="material-symbols-outlined text-surface-tint text-[18px]">lock</span>
              <div className="flex flex-col leading-none">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {c.pillCrypto}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface font-mono font-bold mt-0.5">
                  {t.shaValidated}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-space-xs flex-wrap">
              <button
                type="button"
                onClick={() => {
                  pushToast(c.toastExport, "info");
                  setTimeout(() => window.print(), 400);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                <span>{c.exportPdf}</span>
              </button>
              <button
                type="button"
                onClick={() => pushToast(c.toastShare, "info")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                <span>{c.share}</span>
              </button>
              <button
                type="button"
                onClick={() => pushToast(c.toastApproved, "success")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg font-bold shadow-md hover:bg-primary transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                <span>{c.approveSalvedades}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HITL Banner: Critical Legal Requirement ============ */}
      <section className="w-full mt-space-md">
        <div
          className={`w-full rounded-xl p-space-md shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md ${
            requires_human_override || belowThreshold ? "bg-error-container" : "bg-primary-container"
          }`}
        >
          <div className="flex items-start md:items-center gap-space-md min-w-0">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                requires_human_override || belowThreshold
                  ? "bg-error text-on-error"
                  : "bg-surface text-on-surface"
              }`}
            >
              <span
                className="material-symbols-outlined text-[30px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {requires_human_override || belowThreshold ? "warning" : "task_alt"}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-space-sm flex-wrap">
                <span
                  className={`font-headline-sm text-headline-sm font-bold ${
                    requires_human_override || belowThreshold
                      ? "text-on-error-container"
                      : "text-on-primary"
                  }`}
                >
                  {requires_human_override || belowThreshold ? c.hitlTitle : c.okTitle}
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-bold ${
                    requires_human_override || belowThreshold
                      ? "bg-error text-on-error"
                      : "bg-surface text-on-surface"
                  }`}
                >
                  {c.hitlScore}: {score}% / {c.hitlMin}
                </span>
              </div>
              <p
                className={`font-body-md text-body-md mt-1 ${
                  requires_human_override || belowThreshold
                    ? "text-on-error-container"
                    : "text-on-primary"
                }`}
              >
                {requires_human_override || belowThreshold
                  ? results.safety_notice || c.hitlMsg
                  : c.okMsg}
              </p>
              {results.safety_notice && (requires_human_override || belowThreshold) && (
                <p className="font-label-sm text-label-sm text-on-error-container/90 mt-1 uppercase tracking-wider">
                  {t.safetyNotice}: {results.safety_notice}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-space-xs shrink-0 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={openDrawer}
              className={`w-full md:w-auto flex items-center justify-center gap-1.5 px-space-md py-2.5 rounded-lg font-label-lg text-label-lg font-bold shadow hover:brightness-110 transition-all ${
                requires_human_override || belowThreshold
                  ? "bg-surface text-on-surface hover:bg-surface-container-high"
                  : "bg-surface-container-lowest text-on-surface hover:bg-surface-container"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${
                  requires_human_override || belowThreshold ? "text-error" : "text-primary"
                }`}
              >
                edit_document
              </span>
              <span>{c.btnSubsanate}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ============ 3-Column Forensic Inspection Deck ============ */}
      <div className="w-full mt-space-md grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* LEFT COLUMN: Dossier Summary & Forensic Telemetry Metrics (3 cols) */}
        <aside className="lg:col-span-3 flex flex-col gap-space-md">
          {/* Clinical Dossier Card */}
          <div className="rounded-xl bg-surface-container p-space-md shadow-md flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  folder_shared
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {c.dossier}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm uppercase font-mono">
                Safe Harbor
              </span>
            </div>

            <div className="flex flex-col gap-space-xs">
              <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  {c.identLabel}
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold font-mono break-all">
                  {patient_id_masked || "[REDACTED]"}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {c.identMeta}
                </span>
              </div>

              <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  {c.procedureLabel}
                </span>
                <span className="font-body-md text-body-md text-on-surface font-bold break-words">
                  {procedure_name || "UNKNOWN"}
                </span>
              </div>

              <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  {c.respLabel}
                </span>
                <span className="font-body-md text-body-md text-on-surface font-bold">
                  {status || "completed"}
                </span>
                <span className="font-label-sm text-label-sm text-secondary font-mono">
                  {t.forensicSeal} {sealId}
                </span>
              </div>

              <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  {c.dateLabel}
                </span>
                <span className="font-body-md text-body-md text-on-surface font-bold">
                  {reportDate.toLocaleDateString(lang === "es" ? "es-MX" : "en-US", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="font-label-sm text-label-sm text-secondary font-mono mt-0.5">
                  {reportDate.toISOString().slice(0, 16).replace("T", " ")} UTC
                </span>
              </div>
            </div>

            {/* Cryptographic Seal */}
            <div className="rounded-lg bg-surface-container-lowest p-space-sm flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-[14px]">
                    fingerprint
                  </span>
                  {c.sealLabel}
                </span>
                <span className="font-label-sm text-label-sm text-primary font-bold">
                  {c.onChain}
                </span>
              </div>
              <span className="font-mono text-label-sm text-primary break-all select-all">
                0x8F9B27CA0E91FFD41289BB310AC8249827B49F
              </span>
              <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm mt-1">
                <span>{c.timestamp}</span>
                <span className="font-mono text-on-surface">
                  {reportDate.toISOString().slice(0, 19).replace("T", " ")}
                </span>
              </div>
            </div>
          </div>

          {/* Trust Score Ring Card */}
          <div className="rounded-xl bg-surface-container p-space-md shadow-md flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                {c.idxTitle}
              </span>
              <span
                className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-bold ${
                  belowThreshold
                    ? "bg-error-container text-on-error-container"
                    : "bg-primary-container text-on-primary"
                }`}
              >
                {belowThreshold ? c.noApto : c.apto}
              </span>
            </div>

            {/* SVG Circular Progress Indicator */}
            <div className="flex flex-col items-center justify-center relative py-space-sm">
              <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  className="text-surface-container-high"
                  cx="60"
                  cy="60"
                  fill="transparent"
                  r="48"
                  stroke="currentColor"
                  strokeWidth="10"
                />
                <circle
                  cx="60"
                  cy="60"
                  fill="transparent"
                  r="48"
                  stroke={scoreColor}
                  strokeDasharray={RING}
                  strokeDashoffset={RING * (1 - score / 100)}
                  strokeLinecap="round"
                  strokeWidth="10"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-display-lg text-display-lg text-on-surface font-extrabold leading-none">
                  {score}
                  <span className="text-headline-md text-tertiary font-bold">%</span>
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase mt-1 tracking-wider">
                  {c.scoreLabel}
                </span>
                <span
                  className={`font-label-sm text-label-sm font-bold mt-0.5 ${
                    belowThreshold ? "text-error" : "text-primary"
                  }`}
                >
                  {belowThreshold ? c.belowThreshold : c.aboveThreshold}
                </span>
              </div>
            </div>

            {/* Breakdown Metrics Bars */}
            <div className="flex flex-col gap-space-sm">
              <MetricBar label={c.mCoverage} value={coverage} />
              <MetricBar label={c.mRisks} value={riskLoad} />
              <MetricBar label={c.mHuman} value={humanScore} />
              <MetricBar label={c.mNorm} value={score} />
            </div>

            <div className="bg-surface-container-lowest p-space-sm rounded-lg flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                shield_with_heart
              </span>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                  {c.exposure}: {exposureHigh ? c.exposureHigh : c.exposureLow}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {exposureHigh ? c.exposureMsgHigh : c.exposureMsgLow}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTRAL COLUMN: Missing Prerequisites & Interactive Risk Matrix (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-space-md">
          {/* Mandatory Missing Requirements Box */}
          <div className="rounded-xl bg-surface-container p-space-md shadow-md flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-error text-[22px]">error</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {t.missingFields}
                </h2>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${
                  missing_fields.length
                    ? "bg-error text-on-error"
                    : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {missing_fields.length ? c.nInfractions(missing_fields.length) : c.noInfractions}
              </span>
            </div>

            <div className="flex flex-col gap-space-sm">
              {missing_fields.length === 0 ? (
                <div className="rounded-lg bg-surface-container-low p-space-sm flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check_circle
                  </span>
                  <span className="font-body-md text-body-md text-on-surface">{t.noMissing}</span>
                </div>
              ) : (
                missing_fields.map((f, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-surface-container-low p-space-sm flex flex-col gap-space-xs hover:bg-surface-container-high transition-colors"
                  >
                    <div className="flex items-start justify-between gap-space-xs">
                      <div className="flex items-start gap-space-xs min-w-0">
                        <span className="material-symbols-outlined text-error text-[20px] flex-shrink-0 mt-0.5">
                          cancel
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-body-md text-body-md text-on-surface font-bold break-words">
                            {f}
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                            {c.folio(i + 1)} • {c.missingSub}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm font-bold uppercase shrink-0">
                        {c.critical}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-outline/10 gap-space-xs">
                      <span className="font-label-sm text-label-sm text-secondary">{c.reqTag}</span>
                      <button
                        type="button"
                        onClick={openDrawer}
                        className="px-2.5 py-1 rounded bg-surface-container-high hover:bg-primary-container hover:text-on-primary-container text-primary font-label-sm text-label-sm font-bold flex items-center gap-1 transition-all shrink-0"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit_square</span>
                        <span>{c.reviewClause}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Clinical & Legal Risk Matrix */}
          <div className="rounded-xl bg-surface-container p-space-md shadow-md flex flex-col gap-space-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[22px]">gavel</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {t.risksTitle}
                </h2>
              </div>
              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg overflow-x-auto no-scrollbar">
                {[
                  { k: "all", label: `${t.all} (${total})` },
                  { k: "HIGH", label: `${t.high} (${highCount})` },
                  { k: "MEDIUM", label: `${t.medium} (${medCount})` },
                  { k: "LOW", label: `${t.low} (${lowCount})` },
                ].map((b) => (
                  <button
                    key={b.k}
                    type="button"
                    onClick={() => setFilter(b.k)}
                    className={`px-2.5 py-1 rounded font-label-sm text-label-sm whitespace-nowrap transition-colors ${
                      filter === b.k
                        ? "bg-surface-container-high text-primary font-bold"
                        : "text-on-surface-variant hover:text-on-surface font-semibold"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Risk Cards Stack */}
            <div className="flex flex-col gap-space-sm">
              {filtered.length === 0 ? (
                <div className="rounded-lg bg-surface-container-low p-space-sm text-on-surface-variant font-body-sm text-body-sm">
                  {t.noRisks}
                </div>
              ) : (
                filtered.map((r, i) => {
                  const sev = (r.severity || "").toUpperCase();
                  const action =
                    sev === "HIGH"
                      ? { label: c.insertClause, icon: "add_circle", toast: c.toastClause, primary: true }
                      : sev === "MEDIUM"
                      ? { label: c.completeReg, icon: "badge", toast: c.toastRecord, primary: false }
                      : { label: c.acceptFix, icon: "check", toast: c.toastFix, primary: false };
                  return (
                    <div
                      key={i}
                      className="rounded-lg bg-surface-container-low p-space-md flex flex-col gap-space-xs shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-space-sm">
                        <div className="flex items-center gap-space-xs min-w-0">
                          <span
                            className={`w-3 h-3 rounded-full shrink-0 ${
                              SEVERITY_DOT[sev] || SEVERITY_DOT.LOW
                            } ${sev === "HIGH" ? "animate-pulse" : ""}`}
                          />
                          <span className="font-body-md text-body-md text-on-surface font-bold break-words">
                            {r.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <SeverityBadge level={r.severity} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-space-xs flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-label-sm text-secondary uppercase">
                          {r.risk_category}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-space-xs mt-2 pt-2 border-t border-outline/10">
                        <button
                          type="button"
                          onClick={() => pushToast(action.toast, sev === "HIGH" ? "warn" : "success")}
                          className={`px-3 py-1.5 rounded font-label-sm text-label-sm flex items-center gap-1 transition-all ${
                            action.primary
                              ? "bg-primary-container hover:bg-primary text-on-primary font-bold"
                              : "bg-surface-container-high hover:bg-surface-bright text-on-surface"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {action.icon}
                          </span>
                          <span>{action.label}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: OCR Document Evidence & Qualified Forensic Signature (4 cols) */}
        <section className="lg:col-span-4 flex flex-col gap-space-md">
          {/* Scanned PDF Inspection Viewport */}
          <div className="rounded-xl bg-surface-container p-space-md shadow-md flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  document_scanner
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {c.visorTitle}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-mono text-label-sm">
                  {isPdfFile ? "300 DPI" : c.textBuffer}
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary font-mono text-label-sm">
                  {isPdfFile ? c.folioOf(page) : "TXT"}
                </span>
              </div>
            </div>

            {/* Document Controls Bar */}
            <div className="flex items-center justify-between bg-surface-container-lowest px-space-sm py-1.5 rounded-lg gap-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={zoomIn}
                  className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                  title="Zoom In"
                >
                  <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                </button>
                <button
                  type="button"
                  onClick={zoomOut}
                  className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                  title="Zoom Out"
                >
                  <span className="material-symbols-outlined text-[18px]">zoom_out</span>
                </button>
                <button
                  type="button"
                  onClick={zoomFit}
                  className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                  title="Fit"
                >
                  <span className="material-symbols-outlined text-[18px]">fit_screen</span>
                </button>
                <span className="font-mono text-label-sm text-on-surface-variant pl-1">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <span className="font-mono text-label-sm text-on-surface-variant truncate max-w-[140px]">
                {sourceFile?.name || "consentimiento_quirurgico.pdf"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!isPdfFile || page <= 1}
                  className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!isPdfFile}
                  className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                  title="Fullscreen"
                >
                  <span className="material-symbols-outlined text-[18px]">fullscreen</span>
                </button>
              </div>
            </div>

            {/* Document Rendering Canvas */}
            <div
              ref={canvasRef}
              className="relative w-full h-[380px] rounded-lg bg-surface-container-lowest overflow-hidden shadow-inner select-none"
            >
              {pdfSrc ? (
                <iframe
                  src={pdfSrc}
                  title={sourceFile?.name || "PDF preview"}
                  className="w-full h-full border-0 bg-surface-container-lowest"
                />
              ) : documentText.trim() ? (
                <div className="w-full h-full overflow-auto p-space-sm">
                  <pre
                    className="font-body-sm text-body-sm text-on-surface whitespace-pre-wrap leading-relaxed select-text m-0"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: "top left",
                      width: `${100 / zoom}%`,
                    }}
                  >
                    {documentText}
                  </pre>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center p-space-md">
                  <div className="flex flex-col gap-1 text-center items-center">
                    <span className="material-symbols-outlined text-[32px] text-primary">
                      description
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface font-mono break-words">
                      {procedure_name || "consentimiento_quirurgico.pdf"}
                    </span>
                  </div>
                </div>
              )}

              {/* Watermark Overlay Badge */}
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-surface-container-lowest text-on-surface-variant font-mono text-[10px] flex items-center gap-1 pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
                {lang === "es"
                  ? "Auditado por Evolus AI Vision Core v4.2"
                  : "Audited by Evolus AI Vision Core v4.2"}
              </div>
            </div>

            <div className="flex items-center justify-between gap-space-sm px-1 pt-0.5">
              <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-secondary">lock</span>
                {c.volatilNote}
              </span>
              {sourceFile && (
                <span className="font-label-sm text-label-sm text-outline shrink-0">
                  {(sourceFile.size / 1024).toFixed(1)} {c.kb}
                </span>
              )}
            </div>
          </div>

          {/* Pericial Verdict & Signoff Drawer */}
          <div className="rounded-xl bg-surface-container p-space-md shadow-md flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  rate_review
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {c.dictamenTitle}
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                {patient_id_masked || "[REDACTED]"}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                {c.obsLabel}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg bg-surface-container-lowest p-space-sm font-body-sm text-body-sm text-on-surface placeholder:text-outline outline-none focus:ring-1 focus:ring-primary transition-all resize-none"
                placeholder={c.obsPlaceholder}
                rows="3"
              />
            </div>

            {/* Digital Certificate Selection */}
            <div className="flex flex-col gap-space-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                {c.certLabel}
              </span>
              <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low">
                <div className="flex items-center gap-space-xs min-w-0">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    workspace_premium
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-body-md text-body-md text-on-surface font-bold leading-tight">
                      {c.certName}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                      {c.certMeta}
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary text-[20px]">
                  check_circle
                </span>
              </div>
            </div>

            {/* Action CTA Deck */}
            <div className="flex flex-col gap-space-xs pt-1">
              <button
                type="button"
                onClick={() => pushToast(c.toastApproved, "success")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg font-bold shadow-md transition-all active:scale-[0.99]"
              >
                <span className="material-symbols-outlined text-[20px]">draw</span>
                <span>{c.finalApprove}</span>
              </button>
              <div className="grid grid-cols-2 gap-space-xs">
                <button
                  type="button"
                  onClick={() => {
                    pushToast(c.toastExport, "info");
                    setTimeout(() => window.print(), 400);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">file_download</span>
                  <span>{c.exportDict}</span>
                </button>
                <button
                  type="button"
                  onClick={onNewAudit}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                  <span>{c.auditNew}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ============ Interactive Modal / Subsanación Floating Drawer ============ */}
      {drawerMounted && (
        <>
          <div
            className={`fixed inset-0 z-[55] bg-black/50 transition-opacity duration-300 ${
              drawerOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeDrawer}
          />
          <aside
            className={`fixed inset-y-0 right-0 w-full max-w-lg bg-surface-container-lowest shadow-2xl z-[60] flex flex-col justify-between transition-transform duration-300 ease-in-out ${
              drawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="p-space-lg flex flex-col gap-space-md overflow-y-auto">
              <div className="flex items-center justify-between pb-space-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[24px]">
                    fact_check
                  </span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    {c.drawerTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{c.drawerDesc}</p>

              <form
                className="flex flex-col gap-space-md"
                onSubmit={(e) => {
                  e.preventDefault();
                  closeDrawer();
                  pushToast(c.toastSaved, "success");
                }}
              >
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface font-semibold">
                    {c.f1}
                  </label>
                  <input
                    className="w-full bg-surface-container px-3 py-2 rounded-lg text-on-surface font-body-sm text-body-sm outline-none focus:ring-1 focus:ring-primary"
                    type="datetime-local"
                    value={form.datetime}
                    onChange={(e) => setForm({ ...form, datetime: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface font-semibold">
                    {c.f2}
                  </label>
                  <input
                    className="w-full bg-surface-container px-3 py-2 rounded-lg text-on-surface font-body-sm text-body-sm outline-none focus:ring-1 focus:ring-primary"
                    placeholder={c.phWitness}
                    type="text"
                    value={form.witness}
                    onChange={(e) => setForm({ ...form, witness: e.target.value })}
                  />
                  <input
                    className="w-full bg-surface-container px-3 py-2 mt-1 rounded-lg text-on-surface font-body-sm text-body-sm outline-none focus:ring-1 focus:ring-primary"
                    placeholder={c.phId}
                    type="text"
                    value={form.witnessId}
                    onChange={(e) => setForm({ ...form, witnessId: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface font-semibold">
                    {c.f3}
                  </label>
                  <div className="flex items-center gap-2 p-2 rounded bg-surface-container">
                    <input
                      className="w-4 h-4 rounded text-primary focus:ring-0 bg-surface-container-low"
                      id="chkLaparotomia"
                      type="checkbox"
                      checked={form.laparotomy}
                      onChange={(e) => setForm({ ...form, laparotomy: e.target.checked })}
                    />
                    <label
                      className="font-body-sm text-body-sm text-on-surface cursor-pointer"
                      htmlFor="chkLaparotomia"
                    >
                      {c.f3label}
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface font-semibold">
                    {c.f4}
                  </label>
                  <input
                    className="w-full bg-surface-container px-3 py-2 rounded-lg text-on-surface font-body-sm text-body-sm outline-none focus:ring-1 focus:ring-primary"
                    placeholder={c.phCedula}
                    type="text"
                    value={form.assistant}
                    onChange={(e) => setForm({ ...form, assistant: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-end gap-space-sm pt-space-sm">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg transition-all"
                  >
                    {c.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg font-bold transition-all"
                  >
                    {c.save}
                  </button>
                </div>
              </form>
            </div>
          </aside>
        </>
      )}

      {/* ============ Notification Toast Container ============ */}
      <div className="fixed bottom-24 right-4 md:right-6 md:bottom-6 z-[70] flex flex-col gap-2 pointer-events-none">
        {toasts.map((x) => (
          <div
            key={x.id}
            className="pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg text-on-surface bg-surface-container-high shadow-xl font-label-md text-label-md animate-[fadeIn_0.3s_ease-out] max-w-[320px]"
          >
            <span
              className={`material-symbols-outlined text-[20px] ${
                x.type === "success" ? "text-primary" : x.type === "warn" ? "text-error" : "text-secondary"
              }`}
            >
              {x.type === "success" ? "verified" : x.type === "warn" ? "warning" : "info"}
            </span>
            <span>{x.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
