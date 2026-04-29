import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight, Filter, Sparkles } from "lucide-react";
import { useMatchInbox, useMatchPercentiles } from "@/hooks/useMatchInbox";
import { MatchInboxRow } from "@/components/equity-brain/match/MatchInboxRow";
import { InfoHint } from "@/components/equity-brain/InfoHint";
import { ALL_UFS, SETORES } from "@/lib/dealFormatters";
import { cn } from "@/lib/utils";

export default function MatchInboxPage() {
  const { data: pcts } = useMatchPercentiles();
  const [minScore, setMinScore] = useState<number>(0);
  const [uf, setUf] = useState<string | null>(null);
  const [setor, setSetor] = useState<string | null>(null);
  const [onlyWithMandate, setOnlyWithMandate] = useState(false);

  const { data: rows = [], isLoading } = useMatchInbox({
    minScore,
    uf,
    setor,
    onlyWithMandate,
    limit: 500,
  });

  const stats = useMemo(() => {
    const hot = rows.filter((r) => r.match_score >= (pcts?.hot ?? 70)).length;
    const warm = rows.filter((r) => r.match_score >= (pcts?.warm ?? 50) && r.match_score < (pcts?.hot ?? 70)).length;
    const cold = rows.length - hot - warm;
    return { hot, warm, cold, total: rows.length };
  }, [rows, pcts]);

  return (
    <div className="p-6 space-y-4 bg-zinc-950 min-h-full">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link to="/equity-brain" className="text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Equity Brain
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1 tracking-tight inline-flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-[#D9F564]" />
            Match Inbox
            <InfoHint
              title="Match Inbox"
              what="Fila de pares vendedor↔comprador calculados pelo motor IA. Cada linha é um possível negócio pronto para ação."
              action="Use os filtros para focar nos mais relevantes. Ligue, mande WhatsApp ou abra o mandato/empresa direto pelos botões."
            />
          </h1>
          <p className="text-xs text-zinc-400 mt-1 break-words">
            {pcts?.total ?? 0} matches ativos · percentis: 🔥 ≥{pcts?.hot ?? 70} · ⚡ ≥{pcts?.warm ?? 50}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <div className="px-3 py-1.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-200">
            🔥 <span className="font-bold tabular-nums">{stats.hot}</span> quentes
          </div>
          <div className="px-3 py-1.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-200">
            ⚡ <span className="font-bold tabular-nums">{stats.warm}</span> mornos
          </div>
          <div className="px-3 py-1.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-400">
            · <span className="font-bold tabular-nums">{stats.cold}</span> frios
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
        <Filter className="h-3.5 w-3.5 text-zinc-500" />
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">Filtros</span>

        <select value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}
          className="text-[11px] bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200">
          <option value={0}>Todos os scores</option>
          <option value={pcts?.warm ?? 50}>Mornos+ (≥{pcts?.warm ?? 50})</option>
          <option value={pcts?.hot ?? 70}>Apenas quentes (≥{pcts?.hot ?? 70})</option>
          <option value={40}>≥ 40</option>
          <option value={50}>≥ 50</option>
          <option value={60}>≥ 60</option>
        </select>

        <select value={uf ?? ""} onChange={(e) => setUf(e.target.value || null)}
          className="text-[11px] bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200">
          <option value="">UF: todas</option>
          {ALL_UFS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>

        <select value={setor ?? ""} onChange={(e) => setSetor(e.target.value || null)}
          className="text-[11px] bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200">
          <option value="">Setor: todos</option>
          {SETORES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <button onClick={() => setOnlyWithMandate((v) => !v)}
          className={cn(
            "text-[11px] px-2.5 py-1 rounded border inline-flex items-center gap-1.5",
            onlyWithMandate
              ? "border-[#D9F564]/60 bg-[#D9F564]/10 text-[#D9F564]"
              : "border-zinc-800 bg-transparent text-zinc-300 hover:text-[#D9F564]",
          )}>
          <Sparkles className="h-3 w-3" /> Só com mandato vigente
        </button>

        {(uf || setor || onlyWithMandate || minScore > 0) && (
          <button onClick={() => { setUf(null); setSetor(null); setOnlyWithMandate(false); setMinScore(0); }}
            className="text-[10px] text-zinc-500 hover:text-zinc-200 underline-offset-2 hover:underline ml-auto">
            limpar filtros
          </button>
        )}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-xs text-zinc-500 p-6">Carregando matches…</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-zinc-500 p-12 border border-dashed border-zinc-800 rounded-lg">
          <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <div className="text-sm">Nenhum match encontrado com esses filtros.</div>
          <div className="text-[10px] mt-1">Tente reduzir o score mínimo ou limpar filtros.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <MatchInboxRow key={r.id} row={r} percentiles={pcts} />
          ))}
        </div>
      )}
    </div>
  );
}
