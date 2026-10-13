import { translations } from "../i18n";

const SEVERITY_STYLES = {
  HIGH: "severity-high",
  MEDIUM: "severity-medium",
  LOW: "severity-low",
};

function SeverityBadge({ level }) {
  const key = (level || "").toUpperCase();
  return <span className={`severity-badge ${SEVERITY_STYLES[key] || "severity-low"}`}>{key}</span>;
}

export default function AuditResults({ results, lang = "en" }) {
  const t = translations[lang];
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

  return (
    <div className="audit-results">
      <h2>{t.resultsTitle}</h2>

      <div className="cards">
        <div className="card">
          <h3>{t.generalInfo}</h3>
          <p><strong>{t.procedure}:</strong> {procedure_name || "UNKNOWN"}</p>
          <p><strong>{t.patientIdMasked}:</strong> {patient_id_masked || "[REDACTED]"}</p>
          <p><strong>{t.status}:</strong> {status || "completed"}</p>
          <p><strong>{t.confidence}:</strong> {(audit_confidence_score ?? 0).toFixed(2)}</p>
        </div>

        <div className="card">
          <h3>{t.missingFields}</h3>
          {missing_fields.length === 0 ? (
            <p>{t.noMissing}</p>
          ) : (
            <ul className="missing-list">
              {missing_fields.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {requires_human_override && (
        <div className="override-banner">
          <strong>{t.overrideTitle}</strong>
          <p>{t.overrideMsg}</p>
        </div>
      )}

      <div className="card full">
        <h3>{t.risksTitle}</h3>
        {clinical_risks.length === 0 ? (
          <p>{t.noRisks}</p>
        ) : (
          <div className="risk-table">
            <div className="risk-header">
              <span>{t.category}</span>
              <span>{t.severity}</span>
              <span>{t.description}</span>
            </div>
            {clinical_risks.map((r, i) => (
              <div className="risk-row" key={i}>
                <span>{r.risk_category}</span>
                <span><SeverityBadge level={r.severity} /></span>
                <span>{r.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
