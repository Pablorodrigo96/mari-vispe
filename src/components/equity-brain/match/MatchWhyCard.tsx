import { useMemo, useState } from "react";
import { Sparkles, AlertTriangle, TrendingUp, Target, BarChart3, Brain, Microscope, Languages } from "lucide-react";
import { brl } from "@/lib/dealFormatters";
import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/equity-brain/InfoHint";
import { EB_TIPS, type EBTipKey } from "@/lib/ebTooltips";
import type { MatchInboxRow } from "@/hooks/useMatchInbox";
import { humanize, summarize } from "@/lib/matchWhyHumanizer";

type Contribution = { feature: string; weight: number; value: number; contribution: number };

const FEATURE_LABELS: Record<string, string> = {
  setor: "Setor",
  geografia: "Geografia",
  densidade_local: "Densidade local",
  tamanho: "Porte",
  timing: "Timing (mandato ativo)",
  financeiro: "Financeiro",
  tese: "Tese",
  recorrencia: "Recorrência",
  contratos_longos: "Contratos longos",
  verticalizacao: "Verticalização",
  regulatorio: "Regulatório",
  semantic_fit: "Semantic fit",
  seller_intent: "Seller intent",
  wave_pressure: "Wave pressure",
  horizonte: "Horizonte",
  governanca: "Governança",
  vertical_fit: "Vertical fit",
};

// Tailwind bg-* per feature (used in bars)
const FEATURE_COLORS: Record<string, string> = {
  setor: "bg-violet-500",
  geografia: "bg-sky-500",
  densidade_local: "bg-sky-400",
  tamanho: "bg-amber-500",
  tese: "bg-fuchsia-500",
  financeiro: "bg-emerald-500",
  semantic_fit: "bg-cyan-500",
  seller_intent: "bg-rose-500",
  wave_pressure: "bg-teal-500",
  timing: "bg-yellow-500",
  horizonte: "bg-indigo-500",
  governanca: "bg-blue-500",
  recorrencia: "bg-emerald-400",
  contratos_longos: "bg-emerald-300",
  verticalizacao: "bg-lime-500",
  regulatorio: "bg-orange-500",
  vertical_fit: "bg-purple-500",
};

function colorFor(f: string) { return FEATURE_COLORS[f] ?? "bg-slate-500"; }
function labelFor(f: string) { return FEATURE_LABELS[f] ?? f; }
function tipKeyFor(f: string): EBTipKey | null {
  const k = `feat_${f}` as EBTipKey;
  return (k in EB_TIPS) ? k : null;
}

function pct(v: number | null | undefined, digits = 0) {
  if (v == null || isNaN(Number(v))) return "—";
  return `${(Number(v) * 100).toFixed(digits)}%`;
}

function asArray<T = any>(v: any): T[] {
  if (!v) return [];
  if (Array.isArray(v)) return v as T[];
  return [];
}

export interface MatchWhyCardProps {
  match: MatchInboxRow;
  /** Compacto = sem comparáveis e sem grid de cenários completo (drawer). */
  compact?: boolean;
}

export function MatchWhyCard({ match, compact = false }: MatchWhyCardProps) {
  const [techMode, setTechMode] = useState(false);

  const contribs = useMemo<Contribution[]>(() => {
    const arr = asArray<Contribution>(match.feature_contributions);
    return arr
      .filter((c) => c && typeof c.feature === "string")
      .sort((a, b) => Math.abs(Number(b.contribution ?? 0)) - Math.abs(Number(a.contribution ?? 0)));
  }, [match.feature_contributions]);

  const humanItems = useMemo(() => humanize(contribs as any), [contribs]);
  const summary = useMemo(() => summarize(humanItems), [humanItems]);

  const maxAbs = useMemo(
    () => Math.max(0.001, ...contribs.map((c) => Math.abs(Number(c.contribution ?? 0)))),
    [contribs],
  );

  const sumContrib = useMemo(
    () => contribs.reduce((s, c) => s + Number(c.contribution ?? 0), 0),
    [contribs],
  );

  const reasons = asArray<any>(match.reasons).slice(0, 5);
  const counterfactual = (match.counterfactual ?? "")
    .split(/\n|;/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  const comparables = asArray<any>(match.comparables).slice(0, 3);

  const isV2 = (match.engine_version ?? "v1") === "v2";
  const hasFeatures = contribs.length > 0;

  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
      {/* ── Header narrativa ── */}
      <div>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#D9F564]" /> Por que esse match
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <button
              onClick={() => setTechMode((v) => !v)}
              className={cn(
                "px-1.5 py-0.5 rounded border font-mono inline-flex items-center gap-1",
                techMode
                  ? "bg-fuchsia-950/40 text-fuchsia-300 border-fuchsia-800/60"
                  : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-[#D9F564]"
              )}
              title={techMode ? "Voltar para linguagem simples" : "Ver decomposição técnica (SHAP)"}
            >
              <Languages className="h-3 w-3" />
              {techMode ? "técnico" : "simples"}
            </button>
            <span className={cn(
              "px-1.5 py-0.5 rounded border font-mono",
              isV2 ? "bg-fuchsia-950/40 text-fuchsia-300 border-fuchsia-800/60" : "bg-zinc-800 text-zinc-400 border-zinc-700",
            )}>
              engine {match.engine_version ?? "v1"}
            </span>
            {match.ai_confidence != null && (
              <span className="px-1.5 py-0.5 rounded border bg-emerald-950/30 text-emerald-300 border-emerald-800/60 font-mono">
                conf {pct(match.ai_confidence)}
              </span>
            )}
            {match.data_confidence != null && (
              <span className="px-1.5 py-0.5 rounded border bg-zinc-900 text-zinc-300 border-zinc-700 font-mono">
                dados {pct(match.data_confidence)}
              </span>
            )}
          </div>
        </div>

        {!techMode && summary && (
          <p className="text-[12px] text-[#D9F564] mt-2 break-words leading-relaxed font-medium">
            {summary}
          </p>
        )}

        {match.ai_thesis_summary && (
          <p className="text-xs text-zinc-300 mt-2 break-words leading-relaxed italic">
            "{match.ai_thesis_summary}"
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
          {match.thesis_key && (
            <span className="px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-900/60">
              tese: {match.thesis_key}
            </span>
          )}
          {match.buyer_archetype && (
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              arquétipo: {match.buyer_archetype}
            </span>
          )}
          {match.sector_cycle_phase != null && (
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              ciclo setor: {match.sector_cycle_phase}
            </span>
          )}
        </div>

        {match.abstain && (
          <div className="mt-2 flex items-start gap-2 p-2 rounded border border-amber-700/50 bg-amber-950/30 text-[11px] text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span className="break-words">
              <strong>Motor se absteve:</strong> {match.abstain_reason ?? "dados insuficientes para alta confiança."}
            </span>
          </div>
        )}
      </div>

      {/* ── Decomposição (plain por padrão / técnico no toggle) ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 inline-flex items-center gap-1">
            <Microscope className="h-3 w-3 text-fuchsia-400" />
            {techMode ? "Decomposição (peso × valor → impacto)" : "Como cada peça contribui"}
          </div>
          {hasFeatures && techMode && (
            <div className="text-[10px] text-zinc-400 font-mono">
              Σ Δ = <span className="text-zinc-200">{sumContrib.toFixed(3)}</span>
              {" → "}score <span className="text-[#D9F564] font-bold">{Math.round(Number(match.match_score ?? 0))}</span>
            </div>
          )}
        </div>

        {!hasFeatures ? (
          <div className="space-y-2">
            <div className="text-[11px] text-zinc-500 italic mb-2">
              Match calculado pelo motor legado v1 — explicabilidade limitada às 4 dimensões abaixo.
            </div>
            {[
              ["Setor", match.setor_fit],
              ["Geografia", match.geografia_fit],
              ["Porte", match.porte_fit],
              ["Tese", match.tese_fit],
            ].map(([label, v]) => {
              const p = v == null ? 0 : Math.round(Number(v) * 100);
              return (
                <div key={String(label)}>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                    <span>{label}</span>
                    <span className="tabular-nums text-zinc-200">{v == null ? "—" : `${p}%`}</span>
                  </div>
                  <div className="h-1.5 rounded bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-[#D9F564]" style={{ width: `${p}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : !techMode ? (
          // ── Modo PLAIN (padrão) ──
          <div className="space-y-1.5">
            {humanItems.map((it) => (
              <div
                key={it.feature}
                className={cn(
                  "rounded border p-2 flex items-start gap-2.5",
                  it.pullsDown
                    ? "border-rose-900/40 bg-rose-950/10"
                    : "border-zinc-800 bg-zinc-900/40",
                )}
              >
                <span className="text-base leading-none mt-0.5">{it.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[12px] text-zinc-100 font-semibold">{it.label}</span>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-mono shrink-0", it.badgeCls)}>
                      {it.badge}
                      {it.pullsDown && <span className="ml-1 text-rose-300">↓</span>}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug break-words">
                    {it.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // ── Modo TÉCNICO (SHAP detalhado) ──
          <div className="space-y-2">
            {contribs.map((c) => {
              const widthPct = (Math.abs(Number(c.contribution ?? 0)) / maxAbs) * 100;
              const negative = Number(c.contribution ?? 0) < 0;
              const tipKey = tipKeyFor(c.feature);
              return (
                <div key={c.feature} className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-zinc-200 font-medium break-words inline-flex items-center gap-1">
                      {labelFor(c.feature)}
                      {tipKey && (
                        <InfoHint
                          title={EB_TIPS[tipKey].title}
                          what={EB_TIPS[tipKey].what}
                          action={EB_TIPS[tipKey].action}
                          iconClassName="h-3 w-3"
                        />
                      )}
                      {negative && (
                        <span className="text-[9px] text-rose-400 ml-1">(puxa pra baixo)</span>
                      )}
                    </span>
                    <span className="text-zinc-500 font-mono text-[10px] shrink-0 tabular-nums">
                      v={Number(c.value ?? 0).toFixed(2)} · w={Number(c.weight ?? 0).toFixed(3)} ·{" "}
                      <span className={negative ? "text-rose-300" : "text-emerald-300"}>
                        Δ={Number(c.contribution ?? 0) >= 0 ? "+" : ""}{Number(c.contribution ?? 0).toFixed(3)}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800/60 rounded overflow-hidden">
                    <div
                      className={cn("h-full transition-all", negative ? "bg-rose-500/70" : colorFor(c.feature))}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Cenários (probabilidade + EV + tese) ── */}
      {(match.p_close_12m != null || match.ev_p50 != null || match.thesis_key) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded border border-emerald-900/40 bg-emerald-950/20 p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-emerald-400/80 inline-flex items-center gap-1">
              <Target className="h-3 w-3" /> p(close 12m)
            </div>
            <div className="text-base font-bold text-emerald-300 tabular-nums mt-0.5">
              {match.p_close_12m == null ? "—" : pct(match.p_close_12m, 1)}
            </div>
            {match.p_close_ci_lower != null && match.p_close_ci_upper != null && (
              <div className="text-[10px] text-zinc-500 font-mono">
                IC [{pct(match.p_close_ci_lower)} – {pct(match.p_close_ci_upper)}]
              </div>
            )}
          </div>

          <div className="rounded border border-zinc-700 bg-zinc-900/60 p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-zinc-400 inline-flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> EV (p10/p50/p90)
            </div>
            <div className="text-xs font-semibold text-zinc-100 tabular-nums mt-0.5 break-words">
              {brl(match.ev_p10 ?? null, { compact: true })} / {brl(match.ev_p50 ?? null, { compact: true })} / {brl(match.ev_p90 ?? null, { compact: true })}
            </div>
            {(match.multiple_p50 != null) && (
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                múltiplo: {Number(match.multiple_p10 ?? 0).toFixed(1)}x / {Number(match.multiple_p50 ?? 0).toFixed(1)}x / {Number(match.multiple_p90 ?? 0).toFixed(1)}x
              </div>
            )}
          </div>

          <div className="rounded border border-blue-900/40 bg-blue-950/20 p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-blue-300/80 inline-flex items-center gap-1">
              <Brain className="h-3 w-3" /> Tese & score M&A
            </div>
            <div className="text-xs font-semibold text-blue-200 mt-0.5 break-words">
              {match.thesis_key ?? "—"}
            </div>
            {match.ma_score_emp != null && (
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                ma_score: {Number(match.ma_score_emp).toFixed(1)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Razões + contrafactual ── */}
      {(reasons.length > 0 || counterfactual.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {reasons.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">Razões principais</div>
              <ul className="space-y-1">
                {reasons.map((r, i) => {
                  const txt = typeof r === "string"
                    ? r
                    : (r?.label ?? r?.feature ?? r?.key ?? JSON.stringify(r));
                  const delta = typeof r === "object" && r?.contribution != null
                    ? ` · Δ ${Number(r.contribution).toFixed(2)}`
                    : "";
                  return (
                    <li key={i} className="text-[11px] text-zinc-300 break-words flex gap-1.5">
                      <span className="text-emerald-400 shrink-0">•</span>
                      <span>{labelFor(String(txt))}<span className="text-zinc-500 font-mono text-[10px]">{delta}</span></span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {counterfactual.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">E se… (contrafactual)</div>
              <ul className="space-y-1">
                {counterfactual.map((c, i) => (
                  <li key={i} className="text-[11px] text-zinc-400 break-words flex gap-1.5">
                    <span className="text-amber-400 shrink-0">↗</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Comparáveis (apenas modo full) ── */}
      {!compact && comparables.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 inline-flex items-center gap-1">
            <BarChart3 className="h-3 w-3" /> Comparáveis usados
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {comparables.map((c, i) => (
              <div key={i} className="rounded border border-zinc-800 bg-zinc-900/50 p-2 text-[11px] text-zinc-300 break-words">
                <div className="font-medium text-zinc-100 truncate">{c?.name ?? c?.target ?? c?.sector ?? `Comp #${i + 1}`}</div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {c?.sector ? `${c.sector}` : ""}
                  {c?.multiple != null ? ` · ${Number(c.multiple).toFixed(1)}x` : ""}
                  {c?.ev != null ? ` · ${brl(c.ev, { compact: true })}` : ""}
                  {c?.year ? ` · ${c.year}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI pitch (só na versão full) ── */}
      {!compact && match.ai_pitch && (
        <div className="rounded border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 inline-flex items-center gap-1">
            <Brain className="h-3 w-3 text-[#D9F564]" /> Pitch sugerido pela Mari
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed break-words whitespace-pre-line">{match.ai_pitch}</p>
        </div>
      )}
    </div>
  );
}
