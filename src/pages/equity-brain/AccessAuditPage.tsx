import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Download, Search, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { relativeTime } from "@/lib/equityBrain";

type AccessLog = {
  id: string;
  user_id: string;
  entity_type: "mandate" | "buyer";
  entity_id: string;
  action: string;
  created_at: string;
};

type ProfileMap = Record<string, { full_name: string | null; email?: string | null }>;

export default function AccessAuditPage() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [days, setDays] = useState(7);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data } = await (supabase as any).schema("equity_brain")
        .from("access_logs")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      const list = (data ?? []) as AccessLog[];
      setLogs(list);

      const userIds = Array.from(new Set(list.map(l => l.user_id))).filter(Boolean);
      if (userIds.length > 0) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        const map: ProfileMap = {};
        (pData ?? []).forEach((p: any) => { map[p.user_id] = { full_name: p.full_name }; });
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [days]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return logs;
    const f = filter.toLowerCase();
    return logs.filter(l => {
      const name = (profiles[l.user_id]?.full_name ?? "").toLowerCase();
      return name.includes(f) || l.entity_id.toLowerCase().includes(f) || l.entity_type.includes(f);
    });
  }, [logs, profiles, filter]);

  const exportCsv = () => {
    const header = ["data_hora", "advisor", "user_id", "entity_type", "entity_id", "action"];
    const rows = filtered.map(l => [
      new Date(l.created_at).toISOString(),
      profiles[l.user_id]?.full_name ?? "",
      l.user_id,
      l.entity_type,
      l.entity_id,
      l.action,
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-crm-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-4 bg-zinc-950 min-h-full">
      <Link to="/equity-brain/crm" className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="h-3 w-3" /> Voltar ao CRM
      </Link>

      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight inline-flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" /> Auditoria de acessos
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Quem visualizou cada mandato/buyer — registro imutável para LGPD.
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 bg-transparent"
        >
          <Download className="h-3 w-3" /> Exportar CSV
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filtrar por advisor, entidade ou id…"
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
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
                <th className="text-left px-3 py-2 font-medium">Tipo</th>
                <th className="text-left px-3 py-2 font-medium">Entidade</th>
                <th className="text-left px-3 py-2 font-medium">Ação</th>
                <th className="text-right px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map(l => (
                <tr key={l.id} className="text-zinc-300">
                  <td className="px-3 py-2 text-zinc-400">{relativeTime(l.created_at)}</td>
                  <td className="px-3 py-2 break-words">{profiles[l.user_id]?.full_name ?? <span className="text-zinc-600">{l.user_id.slice(0, 8)}…</span>}</td>
                  <td className="px-3 py-2 capitalize text-zinc-400">{l.entity_type}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">{l.entity_id.slice(0, 8)}…</td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">{l.action}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      to={l.entity_type === "mandate" ? `/equity-brain/crm/mandate/${l.entity_id}` : `/equity-brain/crm/buyer/${l.entity_id}`}
                      className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                    >
                      <Eye className="h-3 w-3" /> abrir
                    </Link>
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
