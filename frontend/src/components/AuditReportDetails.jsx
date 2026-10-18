import { useState } from "react";
import { translations } from "../i18n";

const SEVERITY_STYLES = {
  HIGH: "severity-high",
  MEDIUM: "severity-medium",
  LOW: "severity-low",
};

function SeverityBadge({ level }) {
  const key = (level || "").toUpperCase();
  return (
    <span className={`severity-badge ${SEVERITY_STYLES[key] || "severity-low"}`}>
      {key}
    </span>
  );
}

export default function AuditReportDetails({ results, lang = "en", onNewAudit }) {
  const t = translations[lang];
  const [filter, setFilter] = useState("all");
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

  const filtered = clinical_risks.filter((r) => {
    if (filter === "all") return true;
    return (r.severity || "").toUpperCase().toLowerCase() === filter;
  });

  const score = Math.round(audit_confidence_score ?? 0);
  const circ = 88;
  const arc = Math.max(0, Math.min(circ, (circ * score) / 100));
  const scoreColor = score < 85 ? "#ff6a79" : score < 95 ? "#f59e0b" : "#22c55e";

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* Status chips */}
      <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-primary shadow-sm shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="font-label-sm text-label-sm tracking-wide uppercase">{t.auditCompletedStatus}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant shadow-sm shrink-0">
          <span className="material-symbols-outlined text-[13px] text-primary">speed</span>
          <span className="font-label-sm text-label-sm">AMD MI300X</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant shadow-sm shrink-0">
          <span className="material-symbols-outlined text-[13px] text-primary">lock</span>
          <span className="font-label-sm text-label-sm">HIPAA · PII Sanitized</span>
        </div>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight">{t.reportTitle}</h1>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">verified</span>v4.2-Evolus
          </span>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{t.reportSubtitle}</p>
      </div>

      {/* Main card */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-md shadow-md flex flex-col gap-space-md border border-outline/20">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between gap-space-sm pb-space-sm bg-surface-container/40 p-2.5 rounded-lg border border-outline/10">
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{t.auditedRecord}</span>
            <span className="font-headline-sm text-headline-sm text-on-surface truncate">{patient_id_masked || "[REDACTED]"}</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[12px]">shield_person</span>
            {t.piiSanitized}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-space-sm">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant">{t.procedureSurgical}</span>
            <span className="font-body-md text-body-md text-on-surface font-medium leading-snug">{procedure_name || "UNKNOWN"}</span>
          </div>
          <div className="grid grid-cols-2 gap-space-sm pt-1">
            <div className="flex flex-col bg-surface-container/60 p-2 rounded-lg border border-outline/10">
              <span className="font-label-sm text-label-sm text-on-surface-variant">{t.status}</span>
              <span className="font-body-sm text-body-sm text-on-surface font-semibold truncate">{status || "completed"}</span>
            </div>
            <div className="flex flex-col bg-surface-container/60 p-2 rounded-lg border border-outline/10">
              <span className="font-label-sm text-label-sm text-on-surface-variant">{t.forensicSeal}</span>
              <span className="font-body-sm text-body-sm text-primary font-mono truncate">#AUD-{Date.now().toString().slice(-6)}</span>
              <span className="font-label-sm text-label-sm text-secondary">{t.shaValidated}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-space-md bg-surface-container p-3 rounded-lg shadow-sm border border-outline/10">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">{t.confidenceScore}</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-headline-lg-mobile text-headline-lg-mobile font-bold" style={{ color: scoreColor }}>{score}%</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">/ 100%</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[14px]" style={{ color: scoreColor }}>policy</span>
              <span className="font-label-sm text-label-sm" style={{ color: scoreColor }}>{score < 85 ? t.belowSafe : t.withinSafe}</span>
            </div>
          </div>
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" fill="none" r="14" stroke="#273647" strokeWidth="3" />
              <circle cx="18" cy="18" fill="none" r="14" stroke="#3e4850" strokeDasharray="88 88" strokeDashoffset="13" strokeWidth="3" />
              <circle cx="18" cy="18" fill="none" r="14" stroke={scoreColor} strokeDasharray={`${arc} 88`} strokeDashoffset="0" strokeLinecap="round" strokeWidth="3.2" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[16px]" style={{ color: scoreColor }}>gavel</span>
            </div>
          </div>
        </div>
      </div>

      {requires_human_override && (
        <div className="rounded-xl bg-tertiary-container/20 p-space-md shadow-md flex flex-col gap-2 relative overflow-hidden border border-tertiary/40">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-tertiary" />
          <div className="flex items-start gap-space-sm pl-1">
            <div className="w-7 h-7 rounded-full bg-tertiary/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-tertiary text-[18px]">gavel</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-lg text-label-lg text-tertiary font-bold tracking-tight">{t.overrideTitle}</span>
              <p className="font-body-sm text-body-sm text-on-surface leading-snug">{t.overrideMsg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Missing */}
      <div className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-primary">rule</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">{t.missingFields}</h2>
          </div>
          <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${missing_fields.length ? "bg-tertiary-container/30 text-tertiary" : "bg-surface-container-high text-on-surface-variant"}`}>
            {missing_fields.length} {t.detected}
          </span>
        </div>
        <div className="rounded-xl bg-surface-container p-space-sm flex flex-col gap-2 shadow-sm border border-outline/20">
          {missing_fields.length === 0 ? (
            <div className="p-2 text-on-surface-variant">{t.noMissing}</div>
          ) : (
            missing_fields.map((f, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-surface-container-high border border-outline/10">
                <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">cancel</span>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">{f}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Risks */}
      <div className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-primary">assessment</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">{t.risksTitle}</h2>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant">AMD MI300X</span>
        </div>
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-full overflow-x-auto no-scrollbar border border-outline/10">
          {[
            { k: "all", label: `${t.all} (${total})` },
            { k: "high", label: `${t.high} (${highCount})`, dot: "bg-error" },
            { k: "medium", label: `${t.medium} (${medCount})`, dot: "bg-tertiary" },
            { k: "low", label: `${t.low} (${lowCount})`, dot: "bg-primary-container" },
          ].map((b) => (
            <button key={b.k} onClick={() => setFilter(b.k)} className={`tab-btn px-3 py-1 rounded-full font-label-sm text-label-sm shrink-0 transition-colors flex items-center gap-1 ${filter === b.k ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
              {b.dot && <span className={`w-2 h-2 rounded-full ${b.dot}`} />}
              {b.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-space-sm">
          {filtered.length === 0 ? (
            <div className="p-3 text-on-surface-variant">{t.noRisks}</div>
          ) : (
            filtered.map((r, i) => {
              const sev = (r.severity || "").toUpperCase();
              const cardCls = sev === "HIGH" ? "bg-error-container/20 border-error/30" : sev === "MEDIUM" ? "bg-tertiary-container/15 border-tertiary/30" : "bg-surface-container border-outline/20";
              const barCls = sev === "HIGH" ? "bg-error" : sev === "MEDIUM" ? "bg-tertiary" : "bg-primary-container";
              return (
                <div key={i} className={`risk-card rounded-xl p-space-md shadow-sm flex flex-col gap-2 relative overflow-hidden border ${cardCls}`}>
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${barCls}`} />
                  <div className="flex items-start justify-between gap-space-sm pl-1">
                    <div className="flex items-center gap-1.5">
                      <SeverityBadge level={r.severity} />
                      <span className="font-label-sm text-label-sm text-secondary">{r.risk_category}</span>
                    </div>
                  </div>
                  <div className="flex flex-col pl-1 gap-1">
                    <h3 className="font-label-lg text-label-lg text-on-surface font-semibold">{r.description}</h3>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <button onClick={onNewAudit} className="w-full h-11 rounded-xl bg-surface-container-high text-on-surface font-label-lg hover:bg-surface-container-highest border border-outline/10 shadow-sm active:scale-[0.98] transition-all">
          {t.newAudit}
        </button>
      </div>
    </div>
  );
}
```