import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useVertical } from "@/hooks/useVertical";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DealCard } from "@/components/equity-brain/DealCard";
import { maskCnpj, scoreColor, UFS, relativeTime } from "@/lib/equityBrain";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [25, 50, 100, 200];

export default function OportunidadesPage() {
  const { isAdmin } = useUserRoles();
  const { cnaeFilter, isIsp } = useVertical();
  const [drawerCnpj, setDrawerCnpj] = useState<string | null>(null);

  // Filtros
  const [ufs, setUfs] = useState<string[]>([]);
  const [setores, setSetores] = useState<string[]>([]);
  const [minScore, setMinScore] = useState(50);
  const [withSignals, setWithSignals] = useState(false);
  const [withMatches, setWithMatches] = useState(false);
  const [tier, setTier] = useState<("premium" | "strong" | "standard")[]>(["premium", "strong"]);
  const [search, setSearch] = useState("");

  // Paginação
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Debounce
  const [debounced, setDebounced] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDebounced((d) => d + 1), 300);
    return () => clearTimeout(t);
  }, [ufs, setores, minScore, withSignals, withMatches, tier, search]);

  // Setores disponíveis
  const setoresQ = useQuery({
    queryKey: ["eb", "setores-distinct"],
    queryFn: async () => {
      const { data } = await supabase
        .schema("equity_brain" as any).from("opportunities_ready" as any)
        .select("setor_ma").not("setor_ma", "is", null).limit(1000);
      return Array.from(new Set((data ?? []).map((r: any) => r.setor_ma).filter(Boolean))).sort() as string[];
    },
  });

  const dataQ = useQuery({
    queryKey: ["eb", "opps", debounced, page, pageSize, cnaeFilter.join(",")],
    queryFn: async () => {
      let q = supabase
        .schema("equity_brain" as any).from("opportunities_ready" as any)
        .select("cnpj, razao_social, uf, municipio, setor_ma, ma_score, vispe_score, sucessao_score, buyers_count, best_thesis_name, refreshed_at, status, cnae_principal", { count: "exact" })
        .order("ma_score", { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (cnaeFilter.length > 0) q = q.in("cnae_principal", cnaeFilter);
      if (ufs.length > 0) q = q.in("uf", ufs);
      if (setores.length > 0) q = q.in("setor_ma", setores);
      if (minScore > 0) q = q.gte("ma_score", minScore);
      if (withMatches) q = q.gt("buyers_count", 0);
      if (search) q = q.ilike("razao_social", `%${search}%`);

      // tier filter via faixas
      if (tier.length > 0 && tier.length < 3) {
        const ranges: number[][] = [];
        if (tier.includes("premium"))  ranges.push([80, 100]);
        if (tier.includes("strong"))   ranges.push([60, 80]);
        if (tier.includes("standard")) ranges.push([0, 60]);
        // PostgREST não suporta OR de ranges fácil — pegamos o min mais baixo
        const min = Math.min(...ranges.map((r) => r[0]));
        const max = Math.max(...ranges.map((r) => r[1]));
        q = q.gte("ma_score", min).lte("ma_score", max);
      }

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as any[], total: count ?? 0 };
    },
  });

  const total = dataQ.data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  return (
    <div className="flex h-full">
      {/* Filtros */}
      <aside className="w-72 shrink-0 border-r border-zinc-800 bg-zinc-950 p-4 space-y-5 overflow-y-auto">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500">
          <Filter className="h-3.5 w-3.5" /> Filtros
        </div>

        <div>
          <Label className="text-xs text-zinc-400">Buscar por razão social</Label>
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="ex: TELECOM"
            className="mt-1.5 h-8 bg-zinc-900 border-zinc-800 text-xs"
          />
        </div>

        <div>
          <Label className="text-xs text-zinc-400">Score M&A mínimo: <span className="text-emerald-400 font-mono">{minScore}</span></Label>
          <input
            type="range" min={0} max={100} step={5}
            value={minScore} onChange={(e) => { setMinScore(Number(e.target.value)); setPage(0); }}
            className="w-full mt-2 accent-emerald-500"
          />
        </div>

        <div>
          <div className="text-xs text-zinc-400 mb-2">Tier</div>
          <div className="space-y-1.5">
            {(["premium", "strong", "standard"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <Checkbox checked={tier.includes(t)} onCheckedChange={() => { setTier(toggle(tier, t)); setPage(0); }} className="border-zinc-700" />
                <span className="capitalize">{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs text-zinc-400 mb-2">UF ({ufs.length || "todos"})</div>
          <div className="grid grid-cols-3 gap-1 max-h-48 overflow-y-auto">
            {UFS.map((u) => (
              <button
                key={u}
                onClick={() => { setUfs(toggle(ufs, u)); setPage(0); }}
                className={cn(
                  "px-1.5 py-1 rounded text-[10px] font-mono border transition-colors",
                  ufs.includes(u)
                    ? "bg-emerald-900/40 text-emerald-300 border-emerald-700"
                    : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700",
                )}
              >{u}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs text-zinc-400 mb-2">Setor ({setores.length || "todos"})</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {(setoresQ.data ?? []).map((s) => (
              <label key={s} className="flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer">
                <Checkbox checked={setores.includes(s)} onCheckedChange={() => { setSetores(toggle(setores, s)); setPage(0); }} className="border-zinc-700 h-3.5 w-3.5" />
                <span className="truncate">{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <Checkbox checked={withMatches} onCheckedChange={(v) => { setWithMatches(!!v); setPage(0); }} className="border-zinc-700" />
            Apenas com buyer matches
          </label>
        </div>
      </aside>

      {/* Tabela */}
      <div className="flex-1 min-w-0 overflow-auto">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Oportunidades</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {dataQ.isLoading ? "carregando…" : `${total.toLocaleString("pt-BR")} resultados`}
            </p>
          </div>
        </div>

        <table className="w-full text-xs">
          <thead className="bg-zinc-950 text-zinc-500 sticky top-0 z-10">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Razão Social</th>
              <th className="text-left px-3 py-2.5 font-medium">CNPJ</th>
              <th className="text-left px-3 py-2.5 font-medium">UF / Município</th>
              <th className="text-left px-3 py-2.5 font-medium">Setor</th>
              <th className="text-right px-3 py-2.5 font-medium">M&A</th>
              <th className="text-right px-3 py-2.5 font-medium">Vispe</th>
              <th className="text-right px-3 py-2.5 font-medium">Suc.</th>
              <th className="text-right px-3 py-2.5 font-medium">Buyers</th>
              <th className="text-left px-3 py-2.5 font-medium">Tese top</th>
              <th className="text-right px-3 py-2.5 font-medium">Atualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {(dataQ.data?.rows ?? []).map((r) => (
              <tr key={r.cnpj} className="hover:bg-zinc-900/60 cursor-pointer" onClick={() => setDrawerCnpj(r.cnpj)}>
                <td className="px-4 py-2 text-zinc-100 truncate max-w-[260px]">{r.razao_social}</td>
                <td className="px-3 py-2 text-[10px] font-mono text-zinc-500">{maskCnpj(r.cnpj, isAdmin)}</td>
                <td className="px-3 py-2 text-zinc-400">{r.uf} {r.municipio && <span className="text-zinc-600">/ {r.municipio}</span>}</td>
                <td className="px-3 py-2 text-zinc-400 truncate max-w-[140px]">{r.setor_ma}</td>
                <td className={cn("px-3 py-2 text-right font-mono font-bold tabular-nums", scoreColor(r.ma_score))}>{Math.round(Number(r.ma_score ?? 0))}</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-400 tabular-nums">{Math.round(Number(r.vispe_score ?? 0))}</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-500 tabular-nums">{Math.round(Number(r.sucessao_score ?? 0))}</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300 tabular-nums">{r.buyers_count ?? 0}</td>
                <td className="px-3 py-2 text-zinc-400 truncate max-w-[160px]">{r.best_thesis_name ?? "—"}</td>
                <td className="px-3 py-2 text-right text-[10px] text-zinc-600">{relativeTime(r.refreshed_at)}</td>
              </tr>
            ))}
            {dataQ.isLoading && (
              <tr><td colSpan={10} className="px-4 py-12 text-center"><Loader2 className="h-5 w-5 animate-spin text-emerald-500 mx-auto" /></td></tr>
            )}
            {!dataQ.isLoading && (dataQ.data?.rows ?? []).length === 0 && (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-zinc-500">Nenhuma oportunidade encontrada com esses filtros.</td></tr>
            )}
          </tbody>
        </table>

        {/* Paginação */}
        <div className="px-6 py-3 border-t border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-500">
            Itens por página:
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-zinc-500">
              Página {page + 1} de {totalPages || 1}
            </span>
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}
              className="h-7 bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800">Anterior</Button>
            <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}
              className="h-7 bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800">Próximo</Button>
          </div>
        </div>
      </div>

      <Sheet open={!!drawerCnpj} onOpenChange={(o) => !o && setDrawerCnpj(null)}>
        <SheetContent side="right" className="dark bg-zinc-950 border-l border-zinc-800 text-zinc-100 w-full sm:max-w-[520px] p-0 overflow-y-auto">
          {drawerCnpj && <DealCard cnpj={drawerCnpj} mode="drawer" />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
