import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, MessageCircle, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useBuyersCrm } from "@/hooks/useCrm";
import { RegionBadge } from "./RegionBadge";
import { whatsAppLinkFor, formatBrazilPhone } from "@/lib/crmWhatsapp";

export function BuyersTable() {
  const { data: buyers = [], isLoading } = useBuyersCrm();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => buyers.filter((b: any) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (q) {
      const t = q.toLowerCase();
      return (b.nome ?? "").toLowerCase().includes(t)
        || (b.cnpj ?? "").includes(t.replace(/\D/g, ""));
    }
    return true;
  }), [buyers, q, statusFilter]);

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <h3 className="text-sm font-bold text-zinc-100 flex-1">
          Compradores <span className="text-zinc-500 font-normal">({filtered.length})</span>
        </h3>
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..."
                 className="pl-7 h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-100" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 text-xs bg-zinc-950 border border-zinc-800 rounded px-2 text-zinc-100">
          <option value="all">Todos</option>
          <option value="ativo">Ativo</option>
          <option value="pausado">Pausado</option>
        </select>
      </div>
      <div className="overflow-auto max-h-[600px]">
        {isLoading && <div className="p-6 text-center text-zinc-500 text-xs">Carregando...</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="p-6 text-center text-zinc-500 text-xs">Nenhum comprador</div>
        )}
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase text-zinc-500 sticky top-0 bg-zinc-950">
            <tr className="border-b border-zinc-800">
              <th className="text-left px-3 py-2 font-medium">Nome</th>
              <th className="text-left px-2 py-2 font-medium">UFs Alvo</th>
              <th className="text-left px-2 py-2 font-medium">Setor</th>
              <th className="text-left px-2 py-2 font-medium">Matches</th>
              <th className="text-right px-2 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b: any) => {
              const c = b.primary_contact ?? {};
              const wa = whatsAppLinkFor(c.telefone_e164, `Olá ${c.nome ?? b.nome}, aqui é da Vispe.`);
              const ufs: string[] = b.ufs_interesse ?? [];
              return (
                <tr key={b.id} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                  <td className="px-3 py-2 text-zinc-100">
                    <Link to={`/equity-brain/crm/buyer/${b.id}`} className="hover:text-emerald-300 font-medium break-words">
                      {b.nome}
                    </Link>
                    {c.nome && <div className="text-[10px] text-zinc-500">{c.nome}</div>}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-0.5 max-w-[160px]">
                      {ufs.slice(0, 4).map((uf) => <RegionBadge key={uf} uf={uf} />)}
                      {ufs.length > 4 && <span className="text-[10px] text-zinc-500">+{ufs.length - 4}</span>}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-zinc-400">{b.vertical_principal ?? "—"}</td>
                  <td className="px-2 py-2 text-emerald-300 font-medium">{b.active_matches_count ?? 0}</td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer"
                           className="text-emerald-400 hover:text-emerald-300 p-1" title="WhatsApp">
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <Link to={`/equity-brain/crm/buyer/${b.id}`}
                            className="text-zinc-400 hover:text-zinc-100 p-1">
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
    </div>
  );
}
