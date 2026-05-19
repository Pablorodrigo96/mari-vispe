import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Download, Search, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { relativeTime } from "@/lib/equityBrain";

type AccessLog = {
  id: string;
  user_id: string;
  entity_type: string | null;
  entity_id: string | null;
  cnpj: string | null;
  action: string | null;
  context: string | null;
  disclosure_mode: string | null;
  created_at: string;
  advisor_name: string | null;
  razao_social: string | null;
  codename: string | null;
};

export default function AccessAuditPage() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [days, setDays] = useState(7);
  const [mode, setMode] = useState<"all" | "implicit" | "explicit">("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      let query = (supabase as any)
        .from("eb_access_logs_v")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      if (mode !== "all") {
        query = query.eq("disclosure_mode", mode);
      }
      const { data } = await query;
      setLogs((data ?? []) as AccessLog[]);
      setLoading(false);
    })();
  }, [days, mode]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return logs;
    const f = filter.toLowerCase();
    return logs.filter(l => {
      return (
        (l.advisor_name ?? "").toLowerCase().includes(f) ||
        (l.razao_social ?? "").toLowerCase().includes(f) ||
        (l.codename ?? "").toLowerCase().includes(f) ||
        (l.cnpj ?? "").toLowerCase().includes(f) ||
        (l.context ?? "").toLowerCase().includes(f) ||
        (l.entity_type ?? "").toLowerCase().includes(f) ||
        (l.entity_id ?? "").toLowerCase().includes(f)
      );
    });
  }, [logs, filter]);

  const exportCsv = () => {
    const header = ["data_hora", "advisor", "user_id", "modo", "contexto", "entity_type", "entity_id", "cnpj", "codinome", "razao_social", "acao"];
    const rows = filtered.map(l => [
      new Date(l.created_at).toISOString(),
      l.advisor_name ?? "",
      l.user_id,
      l.disclosure_mode ?? "",
      l.context ?? "",
      l.entity_type ?? "",
      l.entity_id ?? "",
      l.cnpj ?? "",
      l.codename ?? "",
      l.razao_social ?? "",
      l.action ?? "",
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-identidade-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = useMemo(() => {
    const implicit = logs.filter(l => l.disclosure_mode === "implicit").length;
    const explicit = logs.filter(l => l.disclosure_mode === "explicit").length;
    return { implicit, explicit, total: logs.length };
  }, [logs]);

  return (
    <div className="p-6 space-y-4 bg-zinc-950 min-h-full">
      <Link to="/equity-brain/crm" className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="h-3 w-3" /> Voltar ao CRM
      </Link>

      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight inline-flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" /> Auditoria de identidade
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl break-words">
            Trilha LGPD/NDA: quem visualizou identidade real de quais empresas, quando e em qual tela.
            Modo <span className="text-emerald-300">implícito</span> = visualização interna por advisor/admin.
            Modo <span className="text-amber-300">explícito</span> = abertura via disclosure aprovado.
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 bg-transparent"
        >
          <Download className="h-3 w-3" /> Exportar CSV
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2 max-w-xl">
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
          <div className="text-[10px] uppercase text-zinc-500">Total</div>
          <div className="text-lg font-bold text-zinc-100 tabular-nums">{counts.total}</div>
        </div>
        <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2">
          <div className="text-[10px] uppercase text-emerald-300">Implícito</div>
          <div className="text-lg font-bold text-zinc-100 tabular-nums">{counts.implicit}</div>
        </div>
        <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2">
          <div className="text-[10px] uppercase text-amber-300">Explícito (NDA)</div>
          <div className="text-lg font-bold text-zinc-100 tabular-nums">{counts.explicit}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filtrar por advisor, empresa, CNPJ, codinome, contexto…"
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
        <select
          value={mode}
          onChange={e => setMode(e.target.value as any)}
          className="text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-zinc-200"
        >
          <option value="all">Todos os modos</option>
          <option value="implicit">Implícito</option>
          <option value="explicit">Explícito (NDA)</option>
        </select>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-zinc-200"
        >
          <option value={1}>Últimas 24h</option>
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </select>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded overflow-hidden">
        {loading ? (
          <div className="p-6 text-xs text-zinc-500">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-xs text-zinc-500 italic">Nenhum acesso registrado no período.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-zinc-950/60 text-zinc-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Quando</th>
                <th className="text-left px-3 py-2 font-medium">Advisor</th>
                <th className="text-left px-3 py-2 font-medium">Empresa</th>
                <th className="text-left px-3 py-2 font-medium">Contexto</th>
                <th className="text-left px-3 py-2 font-medium">Modo</th>
                <th className="text-right px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map(l => (
                <tr key={l.id} className="text-zinc-300">
                  <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">{relativeTime(l.created_at)}</td>
                  <td className="px-3 py-2 break-words">
                    {l.advisor_name ?? <span className="text-zinc-600">{l.user_id.slice(0, 8)}…</span>}
                  </td>
                  <td className="px-3 py-2 break-words">
                    {l.codename && <div className="font-mono text-amber-300 text-[10px]">{l.codename}</div>}
                    <div className="text-zinc-200">{l.razao_social ?? l.cnpj ?? <span className="text-zinc-600 italic">—</span>}</div>
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    <span className="text-[10px] uppercase tracking-wide">{l.context ?? l.action ?? "—"}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${
                      l.disclosure_mode === "explicit"
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    }`}>
                      {l.disclosure_mode ?? "implicit"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {l.cnpj && (
                      <Link
                        to={`/equity-brain/empresa/${l.cnpj}`}
                        className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                      >
                        <Eye className="h-3 w-3" /> abrir
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="px-3 py-2 text-[10px] text-zinc-600 border-t border-zinc-800">
          {filtered.length} de {logs.length} registros · últimos {days} dias
        </div>
      </div>
    </div>
  );
}
