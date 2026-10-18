import { translations } from "../i18n";

const SEVERITY_STYLES = {
  HIGH: "bg-error/10 text-error border-error/30",
  MEDIUM: "bg-secondary/10 text-secondary border-secondary/30",
  LOW: "bg-surface-container-high text-on-surface-variant border-outline/30",
};

function SeverityBadge({ level }) {
  const key = (level || "").toUpperCase();
  return <span className={`px-2 py-1 rounded-md text-xs font-medium border ${SEVERITY_STYLES[key] || SEVERITY_STYLES.LOW}`}>{key}</span>;
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
    <div className="bg-surface-container rounded-xl p-6 shadow-lg border border-outline/20">
      <h2 className="text-2xl font-bold text-on-surface mb-4">{t.resultsTitle}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-surface-container-low rounded-lg p-4 border border-outline/10">
          <h3 className="text-lg font-semibold text-on-surface mb-2">{t.generalInfo}</h3>
          <p className="text-sm text-on-surface-variant"><strong>{t.procedure}:</strong> {procedure_name || "UNKNOWN"}</p>
          <p className="text-sm text-on-surface-variant"><strong>{t.patientIdMasked}:</strong> {patient_id_masked || "[REDACTED]"}</p>
          <p className="text-sm text-on-surface-variant"><strong>{t.status}:</strong> {status || "completed"}</p>
          <p className="text-sm text-on-surface-variant"><strong>{t.confidence}:</strong> {(audit_confidence_score ?? 0).toFixed(2)}</p>
        </div>

        <div className="bg-surface-container-low rounded-lg p-4 border border-outline/10">
          <h3 className="text-lg font-semibold text-on-surface mb-2">{t.missingFields}</h3>
          {missing_fields.length === 0 ? (
            <p className="text-sm text-on-surface-variant">{t.noMissing}</p>
          ) : (
            <ul className="list-disc list-inside text-sm text-on-surface-variant space-y-1">
              {missing_fields.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {requires_human_override && (
        <div className="bg-error-container text-on-error-container rounded-lg p-4 mb-4 border border-error/30">
          <strong className="block mb-1">{t.overrideTitle}</strong>
          <p className="text-sm">{t.overrideMsg}</p>
        </div>
      )}

      <div className="bg-surface-container-low rounded-lg p-4 border border-outline/10">
        <h3 className="text-lg font-semibold text-on-surface mb-2">{t.risksTitle}</h3>
        {clinical_risks.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{t.noRisks}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline/20">
                  <th className="text-left py-2 px-3 text-on-surface-variant font-medium">{t.category}</th>
                  <th className="text-left py-2 px-3 text-on-surface-variant font-medium">{t.severity}</th>
                  <th className="text-left py-2 px-3 text-on-surface-variant font-medium">{t.description}</th>
                </tr>
              </thead>
              <tbody>
                {clinical_risks.map((r, i) => (
                  <tr key={i} className="border-b border-outline/10 last:border-0">
                    <td className="py-2 px-3 text-on-surface">{r.risk_category}</td>
                    <td className="py-2 px-3"><SeverityBadge level={r.severity} /></td>
                    <td className="py-2 px-3 text-on-surface">{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
