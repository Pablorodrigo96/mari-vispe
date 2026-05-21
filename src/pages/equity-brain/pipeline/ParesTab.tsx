import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles } from "@/hooks/useRoles";
import { useDealPairs, useTransitionDealPair, PAIR_STATUS_LABEL, PAIR_STATUS_COLOR, type DealPair, type DealPairStatus } from "@/hooks/useDealPairs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Search, ExternalLink, Filter } from "lucide-react";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_OPTIONS: { value: DealPairStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Rascunho" },
  { value: "active", label: "Ativo" },
  { value: "nbo", label: "NBO" },
  { value: "signed", label: "Assinado" },
  { value: "closed", label: "Fechado" },
  { value: "lost", label: "Perdido" },
];

const NEXT_STATUS: Record<DealPairStatus, DealPairStatus[]> = {
  draft: ["active", "lost"],
  active: ["nbo", "lost"],
  nbo: ["signed", "lost"],
  signed: ["closed", "lost"],
  closed: [],
  lost: [],
};

export default function ParesTab() {
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  const [status, setStatus] = useState<DealPairStatus | "all">("all");
  const [onlyMine, setOnlyMine] = useState<boolean>(!isAdmin);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useDealPairs({
    status,
    onlyMine,
    userId: user?.id,
  });
  const transition = useTransitionDealPair();

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = search.trim().toLowerCase();
    if (!s) return data;
    return data.filter((p) =>
      [p.sell_cnpj, p.buy_cnpj, p.buyer_profile_name, p.buyer_profile_company, p.responsavel_name, p.notes]
        .filter(Boolean)
        .some((v) => v!.toString().toLowerCase().includes(s))
    );
  }, [data, search]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      {/* Toolbar */}
      <div className="border-b border-zinc-800 px-4 py-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por CNPJ, comprador, responsável..."
            className="pl-8 h-9 bg-zinc-900 border-zinc-800 text-zinc-100"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 bg-transparent border-zinc-700 text-zinc-100 hover:bg-zinc-800">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              {STATUS_OPTIONS.find((o) => o.value === status)?.label ?? "Status"}
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-100">
            {STATUS_OPTIONS.map((o) => (
              <DropdownMenuItem key={o.value} onClick={() => setStatus(o.value)}>
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {isAdmin && (
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
              className="accent-[#D9F564]"
            />
            Só meus
          </label>
        )}

        <div className="ml-auto text-xs text-zinc-500">
          {filtered.length} {filtered.length === 1 ? "par" : "pares"}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-zinc-400 text-sm mb-2">Nenhum par encontrado.</div>
            <div className="text-xs text-zinc-600">
              Crie pares a partir de matches aprovados na aba <Link to="/equity-brain/match" className="text-[#D9F564] underline">Matches</Link>.
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Vendedor</th>
                <th className="text-left px-4 py-2 font-medium">Comprador</th>
                <th className="text-left px-4 py-2 font-medium">Responsável</th>
                <th className="text-left px-4 py-2 font-medium">Comissão</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Atualizado</th>
                <th className="text-right px-4 py-2 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <PairRow key={p.id} pair={p} onTransition={transition.mutate} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PairRow({ pair, onTransition }: { pair: DealPair; onTransition: (a: { pair_id: string; new_status: DealPairStatus; reason?: string }) => void }) {
  const buyerLabel =
    pair.buyer_profile_name || pair.buyer_profile_company || pair.buy_cnpj || "—";
  const nexts = NEXT_STATUS[pair.status];
  const updated = pair.updated_at ? formatDistanceToNowStrict(parseISO(pair.updated_at), { addSuffix: true, locale: ptBR }) : "—";

  return (
    <tr className="border-b border-zinc-900 hover:bg-zinc-900/50">
      <td className="px-4 py-2.5">
        <div className="text-zinc-100 truncate max-w-[200px]">{pair.sell_cnpj ?? "—"}</div>
        <div className="text-xs text-zinc-500 truncate max-w-[200px]">
          {pair.sell_setor ?? "?"} · {pair.sell_uf ?? "?"}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <div className="text-zinc-100 truncate max-w-[220px]">{buyerLabel}</div>
        <div className="text-xs text-zinc-500 truncate max-w-[220px]">
          {pair.buyer_profile_id ? "Buyer profile" : "Mandato"}
        </div>
      </td>
      <td className="px-4 py-2.5 text-zinc-300">{pair.responsavel_name ?? "—"}</td>
      <td className="px-4 py-2.5 text-zinc-300 text-xs whitespace-nowrap">
        S {pair.comissao_sell_pct}% · B {pair.comissao_buy_pct}%
      </td>
      <td className="px-4 py-2.5">
        <Badge className={PAIR_STATUS_COLOR[pair.status]}>{PAIR_STATUS_LABEL[pair.status]}</Badge>
      </td>
      <td className="px-4 py-2.5 text-xs text-zinc-500 whitespace-nowrap">{updated}</td>
      <td className="px-4 py-2.5 text-right">
        <div className="inline-flex items-center gap-1">
          <Button asChild size="sm" variant="outline" className="h-7 bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800">
            <Link to={`/equity-brain/par/${pair.id}`}>
              <ExternalLink className="h-3 w-3 mr-1" />
              Abrir
            </Link>
          </Button>
          {nexts.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 text-zinc-300 hover:bg-zinc-800">
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-100">
                {nexts.map((ns) => (
                  <DropdownMenuItem
                    key={ns}
                    onClick={() => {
                      const reason =
                        ns === "lost" ? window.prompt("Motivo da perda?") ?? undefined : undefined;
                      if (ns === "lost" && !reason) return;
                      onTransition({ pair_id: pair.id, new_status: ns, reason });
                    }}
                  >
                    Mover para {PAIR_STATUS_LABEL[ns]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </td>
    </tr>
  );
}
