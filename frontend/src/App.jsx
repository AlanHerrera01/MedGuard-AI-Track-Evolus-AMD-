import { useState } from "react";
import Header from "./components/Header";
import DocumentUploader from "./components/DocumentUploader";
import AuditReportDetails from "./components/AuditReportDetails";
import AnalysisPanel from "./components/AnalysisPanel";
import { auditDocument } from "./services/api";
import { translations } from "./i18n";

export default function App() {
  const [lang, setLang] = useState("es");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [documentText, setDocumentText] = useState("");
  const [sourceFile, setSourceFile] = useState(null); // File original en memoria volátil (no persistido)
  const [activeTab, setActiveTab] = useState("input"); // "input" | "process" | "results"
  const t = translations[lang] || translations.es;

  const handleAudit = async (text) => {
    const payload = text ?? documentText;
    setDocumentText(payload);
    setLoading(true);
    setError(null);
    setResults(null);
    // Cambiar a la pestaña de carga de todo el proceso
    setActiveTab("process");

    try {
      const data = await auditDocument(payload, lang);
      setResults(data);
      // Al terminar la carga, pasar automáticamente a la pestaña del Resumen del Examen
      setActiveTab("results");
    } catch (err) {
      setError(err.message || "Error al procesar la auditoría");
    } finally {
      setLoading(false);
    }
  };

  const handleNewAudit = () => {
    setActiveTab("input");
    setResults(null);
    setError(null);
    setSourceFile(null);
  };

  return (
    <div className="min-h-screen bg-surface dark flex flex-col text-on-surface pb-20 overflow-x-hidden">
      <Header lang={lang} setLang={setLang} t={t} />

      {/* Barra de Pestañas Superior */}
      <div className="max-w-4xl mx-auto w-full px-4 pt-4 pb-2">
        <div className="flex items-center justify-between p-1 rounded-xl bg-surface-container-low border border-outline/10 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2 px-2.5 rounded-lg font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "input"
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">edit_document</span>
            <span>{lang === "es" ? "1. Documento" : "1. Document"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("process")}
            className={`flex-1 py-2 px-2.5 rounded-lg font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "process"
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin text-primary" : ""}`}>
              {loading ? "sync" : "memory"}
            </span>
            <span>{lang === "es" ? "2. Carga del Proceso" : "2. Process Loading"}</span>
            {loading && <span className="w-2 h-2 rounded-full bg-primary animate-ping ml-1" />}
          </button>

          <button
            type="button"
            onClick={() => results && setActiveTab("results")}
            disabled={!results && !loading}
            className={`flex-1 py-2 px-2.5 rounded-lg font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "results"
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : results
                ? "text-on-surface-variant hover:text-on-surface cursor-pointer"
                : "text-outline/40 cursor-not-allowed opacity-50"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">fact_check</span>
            <span>{lang === "es" ? "3. Resumen del Examen" : "3. Exam Summary"}</span>
            {results && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />}
          </button>
        </div>
      </div>

      <main
        className={`mx-auto w-full px-4 py-2 flex-1 ${
          activeTab === "results" && results ? "max-w-7xl" : "max-w-4xl"
        }`}
      >
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-error-container text-on-error-container flex items-center justify-between border border-error/30 shadow-md">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-[20px]">error</span>
              <span className="font-body-md text-body-md">{error}</span>
            </div>
            <button
              onClick={() => setActiveTab("input")}
              className="px-3 py-1 rounded-lg bg-surface-container-high text-on-surface font-label-sm text-label-sm hover:bg-surface-bright"
            >
              {lang === "es" ? "Reintentar" : "Retry"}
            </button>
          </div>
        )}

        {/* Pestaña 1: Carga y Edición del Documento Clínico */}
        {activeTab === "input" && (
          <section className="w-full">
            <DocumentUploader
              onAudit={handleAudit}
              loading={loading}
              lang={lang}
              documentText={documentText}
              setDocumentText={setDocumentText}
              setSourceFile={setSourceFile}
            />
          </section>
        )}

        {/* Pestaña 2: Carga de todo el Proceso en tiempo real (Telemetría AMD + Evolus) */}
        {activeTab === "process" && (
          <section className="w-full">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                {lang === "es" ? "Telemetría y Estado de Carga del Proceso" : "Process Telemetry & Ingestion State"}
              </span>
              {results && !loading && (
                <button
                  onClick={() => setActiveTab("results")}
                  className="px-3 py-1 rounded-lg bg-primary/20 text-primary font-label-sm text-label-sm flex items-center gap-1 hover:bg-primary/30 transition-colors"
                >
                  <span>{lang === "es" ? "Ver Resumen del Examen" : "View Exam Summary"}</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              )}
            </div>
            <AnalysisPanel loading={loading} results={results} lang={lang} />
          </section>
        )}

        {/* Pestaña 3: Resumen del Examen (Reporte Pericial de Auditoría) */}
        {activeTab === "results" && (
          <section className="w-full">
            {results ? (
              <AuditReportDetails
                results={results}
                lang={lang}
                onNewAudit={handleNewAudit}
                sourceFile={sourceFile}
                documentText={documentText}
              />
            ) : (
              <div className="text-center py-12 p-6 rounded-xl bg-surface-container-low border border-outline/10">
                <span className="material-symbols-outlined text-[48px] text-outline mb-2">pending_actions</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">
                  {lang === "es" ? "No hay reporte generado aún" : "No audit report generated yet"}
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
                  {lang === "es"
                    ? "Primero carga o audita un documento para generar el informe pericial."
                    : "Upload or audit a document first to generate the report."}
                </p>
                <button
                  onClick={() => setActiveTab("input")}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md"
                >
                  {lang === "es" ? "Ir a Cargar Documento" : "Go to Upload Document"}
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Barra de Navegación Inferior (Mobile Friendly) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe bg-surface-container-lowest/90 backdrop-blur-xl border-t border-outline/10 shadow-[0_-2px_12px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-space-xs">
          <button
            type="button"
            onClick={() => setActiveTab("input")}
            className={`flex flex-col items-center justify-center w-20 h-12 gap-0.5 transition-colors ${
              activeTab === "input" ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">upload_file</span>
            <span className="font-label-sm text-label-sm">{lang === "es" ? "Carga" : "Upload"}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("process")}
            className={`flex flex-col items-center justify-center w-20 h-12 gap-0.5 transition-colors ${
              activeTab === "process" ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className={`material-symbols-outlined text-[22px] ${loading ? "animate-spin text-primary" : ""}`}>
              {loading ? "progress_activity" : "memory"}
            </span>
            <span className="font-label-sm text-label-sm">{lang === "es" ? "Proceso" : "Process"}</span>
          </button>
          <button
            type="button"
            onClick={() => results && setActiveTab("results")}
            disabled={!results && !loading}
            className={`flex flex-col items-center justify-center w-20 h-12 gap-0.5 transition-colors ${
              activeTab === "results"
                ? "text-primary"
                : results
                ? "text-on-surface-variant hover:text-on-surface"
                : "opacity-40 cursor-not-allowed text-outline"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">fact_check</span>
            <span className="font-label-sm text-label-sm">{lang === "es" ? "Resumen" : "Results"}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
