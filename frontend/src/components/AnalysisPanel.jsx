import { useEffect, useState, useRef } from "react";
import { translations } from "../i18n";

export default function AnalysisPanel({ loading, results, lang = "en", durationMs = 1800 }) {
  const t = translations[lang];
  const [seconds, setSeconds] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!loading) {
      clearInterval(timerRef.current);
      return;
    }
    setSeconds(0);
    setProgress(0);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 0.04;
        const p = Math.min(95, Math.round((next / (durationMs / 1000)) * 95));
        setProgress(p);
        return next;
      });
    }, 40);
    return () => clearInterval(timerRef.current);
  }, [loading, durationMs]);

  const formatted = loading ? `0${seconds.toFixed(2)}s` : "00.00s";
  const circ = 314.159;
  const offset = (circ - (circ * progress) / 100).toFixed(2);

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
            <span className="text-on-surface-variant font-normal">/ ~{(durationMs/1000).toFixed(2)}s {t.est}</span>
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

      {/* Gauge */}
      <div className="w-full bg-surface-container rounded-xl p-space-lg shadow-lg flex flex-col items-center justify-center relative overflow-hidden border border-outline/20">
        <div className="absolute -top-16 -left-16 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle className="text-surface-container-highest" cx="60" cy="60" fill="transparent" r="50" stroke="currentColor" strokeWidth="7" />
            <circle className="text-primary transition-[stroke-dashoffset] duration-300 ease-out" cx="60" cy="60" fill="transparent" r="50" stroke="currentColor" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" strokeWidth="8" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-widest">{t.clinicalAudit}</span>
            <span className="font-display-lg-mobile text-display-lg-mobile text-primary tracking-tight font-bold">{progress}%</span>
            <span className="font-label-sm text-label-sm text-on-surface flex items-center gap-1 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full bg-primary ${loading ? "animate-pulse" : ""}`} />
              {loading ? t.processingState : t.readyState}
            </span>
          </div>
          <div className={`absolute inset-0 rounded-full border border-primary/20 ${loading ? "animate-ping" : ""} pointer-events-none opacity-20`} />
        </div>
        <div className="grid grid-cols-2 gap-space-sm w-full mt-space-md pt-space-sm">
          <div className="flex items-center gap-space-xs p-2.5 rounded-lg bg-surface-container-high border border-outline/10">
            <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">speed</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-on-surface-variant">{t.throughput}</span>
              <span className="font-headline-sm text-headline-sm text-on-surface truncate">{loading ? "186 tok/s" : "—"}</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs p-2.5 rounded-lg bg-surface-container-high border border-outline/10">
            <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[18px]">memory_alt</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-on-surface-variant">{t.vram}</span>
              <span className="font-headline-sm text-headline-sm text-on-surface truncate">{loading ? "12.4 / 192 GB" : "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="w-full bg-surface-container rounded-xl p-space-md shadow-md flex flex-col gap-space-sm border border-outline/20">
        <div className="flex items-center justify-between">
          <span className="font-label-lg text-label-lg text-on-surface">{t.agenticPipeline}</span>
          <span className="font-label-sm text-label-sm text-primary">{loading ? t.phase2of3 : t.completed}</span>
        </div>

        {/* Step 1 */}
        <div className="flex items-start gap-space-sm p-3 rounded-lg bg-surface-container-low border border-outline/10">
          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="font-headline-sm text-headline-sm text-on-surface">{t.step1Title}</span>
              <span className="font-label-sm text-label-sm text-primary bg-primary/10 px-1.5 py-0.5 rounded">280ms</span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{t.step1Desc}</span>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-space-sm p-3 rounded-lg bg-surface-container-high shadow-sm relative overflow-hidden border border-outline/10">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
          <div className={`w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 mt-0.5 ${loading ? "animate-spin" : ""}`}>
            <span className="material-symbols-outlined text-[16px]">{loading ? "progress_activity" : "check_circle"}</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="font-headline-sm text-headline-sm text-primary">{t.step2Title}</span>
              <span className={`font-label-sm text-label-sm text-primary-fixed bg-surface-container-lowest px-1.5 py-0.5 rounded ${loading ? "animate-pulse" : ""}`}>{loading ? t.active : t.done}</span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface mt-0.5">{t.step2Desc}</span>
            <div className="w-full bg-surface-container-lowest h-1 rounded-full overflow-hidden mt-2 border border-outline/20">
              <div className={`bg-primary h-full ${loading ? "w-3/4 animate-pulse" : "w-full"} transition-all duration-500`} />
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className={`flex items-start gap-space-sm p-3 rounded-lg bg-surface-container-low border border-outline/10 ${loading ? "opacity-60" : ""}`}>
          <div className="w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[16px]">{results ? "check_circle" : "schedule"}</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-headline-sm text-headline-sm text-on-surface">{t.step3Title}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{t.step3Desc}</span>
          </div>
        </div>
      </div>

      {/* Terminal */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-md flex flex-col gap-space-xs font-mono border border-outline/20">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-high/40">
          <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>TELEMETRY_CLINICAL_RAW</span>
          </div>
          <span className="font-label-sm text-label-sm text-primary">ROCm 6.1 • IPC 1.82</span>
        </div>
        <div className="flex flex-col gap-1 text-[11px] leading-[16px] text-on-surface-variant pt-1 max-h-24 overflow-hidden">
          <div className="truncate text-primary/80">&gt; [Evolus:PII] 0 identifiers retained (Zero-Retention Mode)</div>
          <div className="truncate text-secondary">&gt; [ROCm:Kernel] FlashAttention-2 optimized for MI300X</div>
          <div className="truncate text-primary">&gt; [Agent:LegalRisk] Clause scan in progress...</div>
          <div className={`truncate text-on-surface ${loading ? "animate-pulse" : ""}`}>&gt; [vLLM:Decode] KV-Cache distributed • {loading ? "99.8% hit rate [block #421]" : "inference complete"}</div>
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