import { useState } from "react";
import Header from "./components/Header";
import DocumentUploader from "./components/DocumentUploader";
import AuditResults from "./components/AuditResults";
import AnalysisPanel from "./components/AnalysisPanel";
import { auditDocument } from "./services/api";
import { translations } from "./i18n";

export default function App() {
  const [lang, setLang] = useState("en");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [documentText, setDocumentText] = useState("");
  const [stage, setStage] = useState("input"); // input | analyzing
  const t = translations[lang];

  const handleAudit = async (text) => {
    const payload = text ?? documentText;
    setDocumentText(payload);
    setLoading(true);
    setError(null);
    setResults(null);
    setStage("analyzing");
    try {
      const data = await auditDocument(payload, lang);
      setResults(data);
    } catch (err) {
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface dark">
      <Header lang={lang} setLang={setLang} t={t} />
      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stage === "input" && (
            <section className="col-span-1 lg:col-span-2">
              <DocumentUploader
                onAudit={handleAudit}
                loading={loading}
                lang={lang}
                documentText={documentText}
                setDocumentText={setDocumentText}
              />
              {error && <div className="error-banner mt-4 p-4 bg-error-container text-on-error-container rounded-xl">{error}</div>}
            </section>
          )}
          {stage === "analyzing" && (
            <>
              <section className="col-span-1">
                <AnalysisPanel loading={loading} results={results} lang={lang} />
              </section>
              <section className="col-span-1">
                <AuditResults results={results} lang={lang} />
                {!loading && results && (
                  <button
                    className="mt-4 w-full py-3 px-4 rounded-xl bg-surface-container-high text-on-surface font-label-lg hover:bg-surface-bright border border-outline/10 shadow-sm transition-all"
                    onClick={() => { setStage("input"); setResults(null); setError(null); }}
                  >
                    {lang === "en" ? "New Audit" : "Nueva Auditoría"}
                  </button>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
