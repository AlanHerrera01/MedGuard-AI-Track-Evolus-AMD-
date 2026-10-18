import { useEffect, useState, useRef } from "react";
import { translations } from "../i18n";

/**
 * Fases del pipeline (duraciones estimadas en segundos).
 *
 * El avance real lo manda la respuesta del backend; aquí se modela el ritmo
 * de cada etapa con un acercamiento asintótico al techo de la fase, de modo
 * que la barra NUNCA se congela: siempre se mueve (incluso si el modelo tarda
 * más de lo estimado, trepa suavemente hacia 99.9%).
 */
const PHASES = [
  { key: "phaseIngest", est: 2.5, to: 12 },
  { key: "phaseExtract", est: 4.5, to: 40 },
  { key: "phaseGpu", est: 9.0, to: 92 },
  { key: "phaseValidate", est: 3.0, to: 99 },
];
const TOTAL_EST = PHASES.reduce((acc, p) => acc + p.est, 0); // ~19s

/** Líneas de consola de telemetría (fake) sincronizadas con el reloj. */
const LOG_LINES = [
  { at: 0.4, tone: "text-on-surface-variant", es: "[Ingest] documento en memoria volátil • SHA-256 local • zero-retention", en: "[Ingest] document in volatile memory • local SHA-256 • zero-retention" },
  { at: 1.8, tone: "text-primary", es: "[Evolus] POST /api/v1/ai-tools/doc-structure/run", en: "[Evolus] POST /api/v1/ai-tools/doc-structure/run" },
  { at: 3.6, tone: "text-secondary", es: "[Evolus] 7 claves estructuradas • PII anonimizada (Safe Harbor)", en: "[Evolus] 7 structured keys • PII anonymized (Safe Harbor)" },
  { at: 5.4, tone: "text-primary", es: "[ROCm] MI300X CDNA3 • 304 CUs online • kernel gfx942 cargado", en: "[ROCm] MI300X CDNA3 • 304 CUs online • gfx942 kernel loaded" },
  { at: 6.8, tone: "text-on-surface", es: "[vLLM] prompt tokenizado • batch=1 • FlashAttention-2 (fp8)", en: "[vLLM] prompt tokenized • batch=1 • FlashAttention-2 (fp8)" },
  { at: 9.2, tone: "text-primary", es: "[vLLM] decode en curso • KV-Cache distribuida en HBM3e", en: "[vLLM] decoding • distributed KV-Cache on HBM3e" },
  { at: 11.5, tone: "text-secondary", es: "[Agent:LegalRisk] escaneo de cláusulas ausentes • alternativas terapéuticas", en: "[Agent:LegalRisk] scanning missing clauses • therapeutic alternatives" },
  { at: 14.0, tone: "text-primary", es: "[Pydantic] validando AuditReportResponse contra esquema clínico…", en: "[Pydantic] validating AuditReportResponse against clinical schema…" },
  { at: 16.0, tone: "text-on-surface", es: "[Safety] umbral de confianza 0.85 • human-in-the-loop condicional", en: "[Safety] confidence threshold 0.85 • conditional human-in-the-loop" },
  { at: 17.5, tone: "text-emerald-400", es: "✓ auditoría emitida • revisión humana obligatoria", en: "✓ audit issued • mandatory human review" },
];

const CU_TOTAL = 40; // compute units visuales del "GPU die"

export default function AnalysisPanel({ loading, results, lang = "en" }) {
  const t = translations[lang];
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [tps, setTps] = useState(0);
  const [vram, setVram] = useState(4.2);
  const [tokens, setTokens] = useState(0);
  const [ipc, setIpc] = useState(1.82);
  const rafRef = useRef(null);
  const logRef = useRef(null);

  const done = !loading && !!results;

  // Bucle principal: progreso por fases con easing asintótico (sin congelarse).
  useEffect(() => {
    if (!loading) {
      if (done) {
        setProgress(100);
        setPhaseIdx(PHASES.length - 1);
        setTokens(486);
        setVram(21.8);
      }
      return;
    }

    const start = performance.now();
    let lastTelemetry = 0;

    const tick = (now) => {
      const e = (now - start) / 1000;

      // Fase activa según el reloj (estimaciones del pipeline real).
      let acc = 0;
      let idx = 0;
      for (let i = 0; i < PHASES.length; i += 1) {
        acc += PHASES[i].est;
        if (e < acc) { idx = i; break; }
        idx = i;
      }
      setPhaseIdx(idx);

      // Avance suave hacia el techo de la fase + micro-jitter: la barra se
      // mueve siempre; si el backend tarda, trepa lento hacia 99.9%.
      setProgress((p) => {
        const overdue = e > TOTAL_EST;
        const target = overdue ? 99.9 : PHASES[idx].to;
        const speed = overdue ? 0.01 : idx >= 2 ? 0.05 : 0.09; // "carga pesada" al final
        const next = p + (target - p) * speed + Math.random() * 0.14;
        return Math.min(target + 0.5, next);
      });

      // Telemetría ~4 veces por segundo (números que fluctúan con vida propia).
      if (now - lastTelemetry > 240) {
        lastTelemetry = now;
        setElapsed(e);
        setIpc(1.74 + Math.random() * 0.16);
        if (idx >= 2) {
          setTps(152 + Math.round(Math.random() * 62));
          setVram(Math.min(24, 5.1 + e * 1.15));
          setTokens(Math.max(0, Math.min(520, Math.round((e - 5.5) * 62))));
        } else {
          setTps(0);
          setVram(4.2 + e * 0.4);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loading, done]);

  // Auto-scroll de la consola de telemetría.
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [elapsed, done]);

  const visibleLogs = done ? LOG_LINES : LOG_LINES.filter((l) => l.at <= elapsed);
  const formatted = `${elapsed.toFixed(2).padStart(5, "0")}s`;
  const circ = 314.159;
  const offset = (circ - (circ * progress) / 100).toFixed(2);
  const phaseName = t[PHASES[phaseIdx].key];
  const overdue = loading && elapsed > TOTAL_EST;

  // Estado de cada paso del pipeline según la fase activa.
  const stepState = (i) => {
    if (done) return "done";
    if (i === 0) return phaseIdx >= 2 ? "done" : "active";
    if (i === 1) return phaseIdx > 2 ? "done" : phaseIdx === 2 ? "active" : "pending";
    return phaseIdx === 3 ? "active" : "pending";
  };
  const stepWidth = (i) => {
    if (done) return 100;
    if (i === 0) return Math.min(100, (progress / 40) * 100);
    if (i === 1) return Math.min(100, Math.max(0, ((progress - 40) / 52) * 100));
    return Math.min(100, Math.max(0, ((progress - 92) / 7) * 100));
  };

  // Compute units del "GPU die" ondas de actividad.
  const activeCUs = !loading && !done ? 3 : phaseIdx >= 2 ? 26 + Math.round(Math.sin(elapsed * 2.2) * 7) : 5;

  const statTile = (icon, label, value, tone) => (
    <div className="flex items-center gap-space-xs p-2.5 rounded-lg bg-surface-container-high border border-outline/10">
      <div className={`w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center ${tone}`}>
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
        <span className="font-headline-sm text-headline-sm text-on-surface truncate font-mono">{value}</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-space-md">
      {/* Live status */}
      <div className="w-full bg-surface-container-low rounded-xl p-space-md shadow-md flex flex-col gap-space-sm relative overflow-hidden border border-outline/20">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between gap-space-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 ${loading ? "" : "hidden"}`} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">
              {t.agenticLive}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[13px]">timer</span>
            <span className="font-mono">{formatted}</span>
            <span className="text-on-surface-variant font-normal">/ ~{TOTAL_EST.toFixed(1)}s {t.est}</span>
          </div>
        </div>
        <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar pt-1">
          <span className="px-2 py-1 rounded bg-surface-container-high text-on-surface text-label-sm font-label-sm whitespace-nowrap flex items-center gap-1 border border-outline/10">
            <span className="material-symbols-outlined text-[14px] text-primary">developer_board</span>
            AMD Instinct™ MI300X
          </span>
          <span className="px-2 py-1 rounded bg-surface-container-high text-on-surface-variant text-label-sm font-label-sm whitespace-nowrap flex items-center gap-1 border border-outline/10">
            <span className="material-symbols-outlined text-[14px] text-secondary">tune</span>
            ROCm 6.1
          </span>
          <span className="px-2 py-1 rounded bg-surface-container-high text-primary-fixed text-label-sm font-label-sm whitespace-nowrap flex items-center gap-1 border border-outline/10">
            <span className="material-symbols-outlined text-[14px] text-primary">bolt</span>
            vLLM Engine
          </span>
        </div>
      </div>

      {/* Gauge + GPU die */}
      <div className="w-full bg-surface-container rounded-xl p-space-lg shadow-lg flex flex-col items-center justify-center relative overflow-hidden border border-outline/20">
        <div className="absolute -top-16 -left-16 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-space-lg w-full justify-center">
          <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle className="text-surface-container-highest" cx="60" cy="60" fill="transparent" r="50" stroke="currentColor" strokeWidth="7" />
              <circle className="text-primary transition-[stroke-dashoffset] duration-200 ease-out" cx="60" cy="60" fill="transparent" r="50" stroke="currentColor" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" strokeWidth="8" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-widest">{t.clinicalAudit}</span>
              <span className="font-display-lg-mobile text-display-lg-mobile text-primary tracking-tight font-bold">{Math.floor(progress)}%</span>
              <span className="font-label-sm text-label-sm text-on-surface flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full bg-primary ${loading ? "animate-pulse" : ""}`} />
                {loading ? t.processingState : t.readyState}
              </span>
            </div>
            <div className={`absolute inset-0 rounded-full border border-primary/20 ${loading ? "animate-ping" : ""} pointer-events-none opacity-20`} />
          </div>

          {/* GPU die: compute units pulsando en oleadas */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="grid grid-cols-8 gap-1 p-2.5 rounded-xl bg-surface-container-lowest border border-outline/20 shadow-inner">
              {Array.from({ length: CU_TOTAL }).map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-[2px] transition-colors duration-300 ${
                    i < activeCUs ? "bg-primary animate-pulse" : "bg-surface-container-highest"
                  }`}
                  style={{ animationDelay: `${(i % 8) * 70 + Math.floor(i / 8) * 45}ms` }}
                />
              ))}
            </div>
            <span className="font-mono text-[11px] text-on-surface-variant">
              gfx942 • {Math.min(CU_TOTAL, Math.max(0, activeCUs))}/{CU_TOTAL} CU
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-space-sm w-full mt-space-md pt-space-sm">
          {statTile("speed", t.throughput, loading && tps ? `${tps} tok/s` : "—", "text-primary")}
          {statTile("memory_alt", t.vram, loading ? `${vram.toFixed(1)} / 192 GB` : "—", "text-secondary")}
          {statTile("data_object", t.tokensGen, loading ? String(tokens) : "—", "text-primary")}
          {statTile("memory", t.gpuLoad, loading ? `${Math.min(99, Math.max(8, Math.round((tps / 220) * 96)))}%` : "—", "text-secondary")}
        </div>
      </div>

      {/* Fase actual */}
      <div className="w-full rounded-xl p-space-sm px-space-md bg-primary/10 border border-primary/20 flex items-center justify-between gap-space-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
            {phaseIdx === 0 ? "upload_file" : phaseIdx === 1 ? "manage_search" : phaseIdx === 2 ? "memory" : "fact_check"}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-label-md text-label-md text-on-surface truncate">{phaseName}</span>
            <span className={`font-label-sm text-label-sm text-on-surface-variant truncate ${overdue ? "animate-pulse text-primary" : ""}`}>
              {done ? t.completed : overdue ? t.waitingLabel : `Fase ${phaseIdx + 1} / ${PHASES.length}`}
            </span>
          </div>
        </div>
        <span className="material-symbols-outlined text-[20px] text-primary animate-spin shrink-0">
          {done ? "check_circle" : "progress_activity"}
        </span>
      </div>

      {/* Pipeline */}
      <div className="w-full bg-surface-container rounded-xl p-space-md shadow-md flex flex-col gap-space-sm border border-outline/20">
        <div className="flex items-center justify-between">
          <span className="font-label-lg text-label-lg text-on-surface">{t.agenticPipeline}</span>
          <span className="font-label-sm text-label-sm text-primary">
            {loading ? `Fase ${phaseIdx + 1} / ${PHASES.length}` : t.completed}
          </span>
        </div>

        {/* Step 1 */}
        <div className={`flex items-start gap-space-sm p-3 rounded-lg border ${stepState(0) === "active" ? "bg-surface-container-high shadow-sm" : "bg-surface-container-low"} border-outline/10 ${stepState(0) === "pending" ? "opacity-60" : ""}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${stepState(0) === "done" ? "bg-primary/20 text-primary" : stepState(0) === "active" ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant"}`}>
            <span className="material-symbols-outlined text-[16px]">
              {stepState(0) === "done" ? "check_circle" : stepState(0) === "active" ? "progress_activity" : "schedule"}
            </span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className={`font-headline-sm text-headline-sm ${stepState(0) === "active" ? "text-primary" : "text-on-surface"}`}>{t.step1Title}</span>
              <span className="font-label-sm text-label-sm text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono">
                {stepState(0) === "done" ? "3.1s" : stepState(0) === "active" ? "…" : "—"}
              </span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{t.step1Desc}</span>
            <div className="w-full bg-surface-container-lowest h-1 rounded-full overflow-hidden mt-2 border border-outline/20">
              <div className="bg-primary h-full transition-all duration-300" style={{ width: `${stepWidth(0)}%` }} />
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className={`flex items-start gap-space-sm p-3 rounded-lg border ${stepState(1) === "active" ? "bg-surface-container-high shadow-sm" : "bg-surface-container-low"} border-outline/10 relative overflow-hidden ${stepState(1) === "pending" ? "opacity-60" : ""}`}>
          {stepState(1) === "active" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${stepState(1) === "done" ? "bg-primary/20 text-primary" : stepState(1) === "active" ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant"}`}>
            <span className={`material-symbols-outlined text-[16px] ${stepState(1) === "active" ? "animate-spin" : ""}`}>
              {stepState(1) === "done" ? "check_circle" : stepState(1) === "active" ? "progress_activity" : "schedule"}
            </span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className={`font-headline-sm text-headline-sm ${stepState(1) === "active" ? "text-primary" : "text-on-surface"}`}>{t.step2Title}</span>
              <span className={`font-label-sm text-label-sm px-1.5 py-0.5 rounded font-mono ${stepState(1) === "active" ? "text-primary-fixed bg-surface-container-lowest animate-pulse" : "text-primary bg-primary/10"}`}>
                {stepState(1) === "done" ? "9.4s" : stepState(1) === "active" ? t.active : "—"}
              </span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{t.step2Desc}</span>
            <div className="w-full bg-surface-container-lowest h-1 rounded-full overflow-hidden mt-2 border border-outline/20">
              <div className="bg-primary h-full transition-all duration-300" style={{ width: `${stepWidth(1)}%` }} />
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className={`flex items-start gap-space-sm p-3 rounded-lg border ${stepState(2) === "active" ? "bg-surface-container-high shadow-sm" : "bg-surface-container-low"} border-outline/10 ${stepState(2) === "pending" ? "opacity-60" : ""}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${stepState(2) === "done" ? "bg-primary/20 text-primary" : stepState(2) === "active" ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant"}`}>
            <span className={`material-symbols-outlined text-[16px] ${stepState(2) === "active" ? "animate-spin" : ""}`}>
              {stepState(2) === "done" ? "check_circle" : stepState(2) === "active" ? "progress_activity" : "schedule"}
            </span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className={`font-headline-sm text-headline-sm ${stepState(2) === "active" ? "text-primary" : "text-on-surface"}`}>{t.step3Title}</span>
              <span className="font-label-sm text-label-sm text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono">
                {stepState(2) === "done" ? "2.2s" : stepState(2) === "active" ? "…" : "—"}
              </span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{t.step3Desc}</span>
            <div className="w-full bg-surface-container-lowest h-1 rounded-full overflow-hidden mt-2 border border-outline/20">
              <div className="bg-primary h-full transition-all duration-300" style={{ width: `${stepWidth(2)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Terminal de telemetría (consola en vivo) */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-md flex flex-col gap-space-xs font-mono border border-outline/20">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-high/40">
          <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
            <span className={`w-2 h-2 rounded-full ${loading ? "bg-primary animate-pulse" : done ? "bg-emerald-400" : "bg-outline-variant"}`} />
            <span>{t.telemetryTitle}</span>
          </div>
          <span className="font-label-sm text-label-sm text-primary">ROCm 6.1 • IPC {ipc.toFixed(2)}</span>
        </div>
        <div ref={logRef} className="flex flex-col gap-1 text-[11px] leading-[16px] text-on-surface-variant pt-1 max-h-40 overflow-y-auto no-scrollbar">
          {visibleLogs.map((line, i) => (
            <div
              key={`${line.at}-${i}`}
              className={`truncate ${line.tone} ${loading && i === visibleLogs.length - 1 ? "animate-pulse" : ""}`}
            >
              &gt; {line[lang] || line.en}
            </div>
          ))}
          {loading && visibleLogs.length === 0 && (
            <div className="truncate text-on-surface animate-pulse">&gt; [Ingest] inicializando pipeline clínico…</div>
          )}
          {loading && (
            <div className="truncate text-primary">
              &gt; {overdue ? "…" : "▍"}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-space-sm pt-space-xs">
        <div className="flex items-center gap-space-sm">
          <button className="flex-1 py-3 px-4 rounded-xl bg-surface-container-high text-on-surface font-label-lg text-label-lg hover:bg-surface-bright active:scale-95 transition-all text-center flex items-center justify-center gap-2 shadow-sm border border-outline/10" type="button">
            <span className="material-symbols-outlined text-[18px]">visibility_off</span>
            {t.background}
          </button>
          <button className="py-3 px-4 rounded-xl bg-surface-container text-error font-label-lg text-label-lg hover:bg-error-container hover:text-on-error-container active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm border border-outline/10" type="button">
            <span className="material-symbols-outlined text-[18px]">cancel</span>
            {t.stop}
          </button>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-on-surface-variant text-center pt-1">
          <span className="material-symbols-outlined text-[14px] text-primary">lock_clock</span>
          <span className="font-label-sm text-label-sm">{t.encryption}</span>
        </div>
      </div>
    </div>
  );
}
