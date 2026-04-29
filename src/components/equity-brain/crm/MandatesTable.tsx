import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, MessageCircle, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMandates, MandateStatus, MANDATE_STATUS_LABELS } from "@/hooks/useCrm";
import { RegionBadge } from "./RegionBadge";
import { StatusBadge } from "./StatusBadge";
import { whatsAppLinkFor, formatBrazilPhone } from "@/lib/crmWhatsapp";

export function MandatesTable() {
  const { data: mandates = [], isLoading } = useMandates();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<MandateStatus | "all">("all");

  const filtered = useMemo(() => {
    return mandates.filter((m: any) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (q) {
        const t = q.toLowerCase();
        return (m.razao_social ?? "").toLowerCase().includes(t)
          || (m.nome_fantasia ?? "").toLowerCase().includes(t)
          || (m.company_cnpj ?? "").includes(t.replace(/\D/g, ""));
      }
      return true;
    });
  }, [mandates, q, statusFilter]);

  const grouped = useMemo(() => {
    const g = new Map<string, any[]>();
    for (const m of filtered) {
      const k = m.status ?? "vigente";
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(m);
    }
    return Array.from(g.entries()).sort();
  }, [filtered]);

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <h3 className="text-sm font-bold text-zinc-100 flex-1">
          Vendedores <span className="text-zinc-500 font-normal">({filtered.length})</span>
        </h3>
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar..."
            className="pl-7 h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="h-8 text-xs bg-zinc-950 border border-zinc-800 rounded px-2 text-zinc-100"
        >
          <option value="all">Todos status</option>
          {Object.entries(MANDATE_STATUS_LABELS).map(([k,v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="overflow-auto max-h-[600px]">
        {isLoading && <div className="p-6 text-center text-zinc-500 text-xs">Carregando...</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="p-6 text-center text-zinc-500 text-xs">Nenhum mandato encontrado</div>
        )}
        {grouped.map(([status, rows]) => (
          <div key={status}>
            <div className="px-4 py-1.5 bg-zinc-950/60 border-b border-zinc-800 sticky top-0 z-10">
              <StatusBadge status={status} />
              <span className="ml-2 text-[10px] text-zinc-500">{rows.length} elementos</span>
            </div>
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-zinc-500">
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-3 py-2 font-medium">Empresa</th>
                  <th className="text-left px-2 py-2 font-medium">UF</th>
                  <th className="text-left px-2 py-2 font-medium">Região</th>
                  <th className="text-left px-2 py-2 font-medium">Setor</th>
                  <th className="text-left px-2 py-2 font-medium">Contato</th>
                  <th className="text-left px-2 py-2 font-medium">Telefone</th>
                  <th className="text-right px-2 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m: any) => {
                  const c = m.primary_contact ?? {};
                  const wa = whatsAppLinkFor(c.telefone_e164,
                    `Olá ${c.nome ?? ""}, aqui é da Vispe sobre o mandato da ${m.razao_social ?? ""}.`);
                  return (
                    <tr key={m.id} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                      <td className="px-3 py-2 text-zinc-100">
                        <Link to={`/equity-brain/crm/mandate/${m.id}`} className="hover:text-emerald-300 font-medium break-words">
                          {m.razao_social ?? m.nome_fantasia ?? m.company_cnpj}
                        </Link>
                      </td>
                      <td className="px-2 py-2 text-zinc-300">{m.uf ?? "—"}</td>
                      <td className="px-2 py-2"><RegionBadge uf={m.uf} /></td>
                      <td className="px-2 py-2 text-zinc-400">{m.setor_ma ?? "—"}</td>
                      <td className="px-2 py-2 text-zinc-300 break-words">{c.nome ?? "—"}</td>
                      <td className="px-2 py-2 text-zinc-400 whitespace-nowrap">{formatBrazilPhone(c.telefone_e164)}</td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {wa && (
                            <a href={wa} target="_blank" rel="noopener noreferrer"
                               className="text-emerald-400 hover:text-emerald-300 p-1" title="WhatsApp">
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <Link to={`/equity-brain/crm/mandate/${m.id}`}
                                className="text-zinc-400 hover:text-zinc-100 p-1" title="Abrir ficha">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
