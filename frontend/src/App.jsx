import { useState } from "react";
import DocumentUploader from "./components/DocumentUploader";
import AuditResults from "./components/AuditResults";
import { auditDocument } from "./services/api";
import { translations } from "./i18n";

function Header({ lang, setLang, t }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo">🧬</div>
        <h1>{t.title}</h1>
        <span className="subtitle">{t.subtitle}</span>
      </div>
      <div className="header-right">
        <span className="badge">{t.poweredByAmd}</span>
        <span className="badge">{t.poweredByEvolus}</span>
        <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t.language} className="lang-select">
          <option value="en">EN</option>
          <option value="es">ES</option>
        </select>
      </div>
    </header>
  );
}

export default function App() {
  const [lang, setLang] = useState("en");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const t = translations[lang];

  const handleAudit = async (documentText) => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const data = await auditDocument(documentText, lang);
      setResults(data);
    } catch (err) {
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Header lang={lang} setLang={setLang} t={t} />
      <main className="app-main">
        <section className="left-panel">
          <DocumentUploader onAudit={handleAudit} loading={loading} lang={lang} />
          {error && <div className="error-banner">{error}</div>}
        </section>
        <section className="right-panel">
          <AuditResults results={results} lang={lang} />
        </section>
      </main>
    </div>
  );
}
