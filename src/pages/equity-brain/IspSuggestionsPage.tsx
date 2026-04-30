import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Snowflake, Loader2, Check, X, Filter, ExternalLink, Sparkles, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ColdMatch {
  id: string;
  cnpj: string;
  buyer_id: string | null;
  thesis_key: string | null;
  match_score: number | null;
  rationale: any;
  engine_version: string | null;
  created_at: string;
}

interface CompanyStat {
  cnpj: string;
  provider_name_norm: string | null;
  total_accesses: number | null;
  n_municipios: number | null;
  n_ufs: number | null;
  rollup_target_score: number | null;
  local_leader_score: number | null;
  sellability_score: number | null;
  platform_potential_score: number | null;
}

interface BuyerLite {
  id: string;
  buyer_name: string | null;
  company_name: string | null;
  state: string | null;
  city: string | null;
}

interface IspEntryLite {
  cnpj: string;
  provider_name: string | null;
  uf: string | null;
  municipio: string | null;
}

const TARGET_STATUSES = [
  { value: "cold_prospect", label: "Prospect frio (apenas marcar)" },
  { value: "contacted", label: "Contatado (entrou no CRM)" },
  { value: "relationship_started", label: "Relacionamento iniciado" },
  { value: "qualified", label: "Qualificado / em mandato" },
  { value: "do_not_contact", label: "Não contatar" },
  { value: "lost", label: "Perdido" },
];

export default function IspSuggestionsPage() {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<ColdMatch[]>([]);
  const [stats, setStats] = useState<Record<string, CompanyStat>>({});
  const [entries, setEntries] = useState<Record<string, IspEntryLite>>({});
  const [buyers, setBuyers] = useState<Record<string, BuyerLite>>({});
  const [thesisFilter, setThesisFilter] = useState<string>("all");
  const [ufFilter, setUfFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState(0.45);

  // promote modal
  const [promoteCnpj, setPromoteCnpj] = useState<string | null>(null);
  const [promoteThesis, setPromoteThesis] = useState<string | null>(null);
  const [promoteStatus, setPromoteStatus] = useState<string>("contacted");
  const [promoteReason, setPromoteReason] = useState<string>("");
  const [promoting, setPromoting] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      // 1) Cold matches dos engines ISP
      const { data: rawMatches } = await supabase
        .schema("equity_brain" as any)
        .from("matches")
        .select("id, cnpj, buyer_id, thesis_key, match_score, rationale, engine_version, created_at")
        .eq("is_cold_suggestion", true)
        .like("engine_version", "isp-%")
        .order("match_score", { ascending: false })
        .limit(500);
      const ms = (rawMatches ?? []) as any as ColdMatch[];
      setMatches(ms);

      const cnpjs = Array.from(new Set(ms.map((m) => m.cnpj).filter(Boolean)));
      const buyerIds = Array.from(new Set(ms.map((m) => m.buyer_id).filter(Boolean))) as string[];

      // 2) Stats por CNPJ
      if (cnpjs.length) {
        const { data: stRows } = await supabase
          .schema("equity_brain" as any)
          .from("isp_company_market_stats")
          .select("cnpj, provider_name_norm, total_accesses, n_municipios, n_ufs, rollup_target_score, local_leader_score, sellability_score, platform_potential_score")
          .in("cnpj", cnpjs);
        const stMap: Record<string, CompanyStat> = {};
        (stRows ?? []).forEach((s: any) => { stMap[s.cnpj] = s; });
        setStats(stMap);

        // entries (nome + uf/cidade)
        const { data: entRows } = await supabase
          .schema("equity_brain" as any)
          .from("isp_market_entries")
          .select("cnpj, provider_name, uf, municipio")
          .in("cnpj", cnpjs)
          .limit(2000);
        const entMap: Record<string, IspEntryLite> = {};
        (entRows ?? []).forEach((e: any) => {
          if (!entMap[e.cnpj]) entMap[e.cnpj] = e;
        });
        setEntries(entMap);
      }

      // 3) Buyers
      if (buyerIds.length) {
        const { data: byRows } = await supabase
          .from("buyer_profiles")
          .select("id, buyer_name, company_name, state, city")
          .in("id", buyerIds);
        const byMap: Record<string, BuyerLite> = {};
        (byRows ?? []).forEach((b: any) => { byMap[b.id] = b; });
        setBuyers(byMap);
      }
    } catch (e: any) {
      toast.error("Falha ao carregar sugestões: " + (e.message ?? "erro"));
    } finally {
      setLoading(false);
    }
  }

  const ufList = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      const uf = entries[m.cnpj]?.uf;
      if (uf) set.add(uf);
    });
    return Array.from(set).sort();
  }, [matches, entries]);

  const thesisList = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => { if (m.thesis_key) set.add(m.thesis_key); });
    return Array.from(set).sort();
  }, [matches]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return matches.filter((m) => {
      if (thesisFilter !== "all" && m.thesis_key !== thesisFilter) return false;
      if (ufFilter !== "all" && entries[m.cnpj]?.uf !== ufFilter) return false;
      if ((m.match_score ?? 0) < minScore) return false;
      if (q) {
        const ent = entries[m.cnpj];
        const blob = `${m.cnpj} ${ent?.provider_name ?? ""} ${ent?.municipio ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [matches, entries, thesisFilter, ufFilter, search, minScore]);

  // Group by CNPJ to render a single row per company with all buyer matches
  const grouped = useMemo(() => {
    const map = new Map<string, ColdMatch[]>();
    filtered.forEach((m) => {
      const arr = map.get(m.cnpj) ?? [];
      arr.push(m);
      map.set(m.cnpj, arr);
    });
    return Array.from(map.entries()).sort((a, b) => {
      const sa = Math.max(...a[1].map((x) => x.match_score ?? 0));
      const sb = Math.max(...b[1].map((x) => x.match_score ?? 0));
      return sb - sa;
    });
  }, [filtered]);

  function openPromote(cnpj: string, thesis: string | null) {
    setPromoteCnpj(cnpj);
    setPromoteThesis(thesis);
    setPromoteStatus("contacted");
    setPromoteReason("");
  }

  async function doPromote() {
    if (!promoteCnpj) return;
    setPromoting(true);
    try {
      const { data, error } = await supabase.functions.invoke("eb-promote-cold-isp", {
        body: {
          cnpj: promoteCnpj,
          to_status: promoteStatus,
          reason: promoteReason || null,
          thesis_key: promoteThesis,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(
        `${data.created ? "Empresa criada" : "Empresa atualizada"}` +
        (data.codename ? ` (${data.codename})` : "") +
        ` · ${data.matches_promoted} matches promovidos`,
      );
      setPromoteCnpj(null);
      void load();
    } catch (e: any) {
      toast.error("Falha ao promover: " + (e.message ?? "erro"));
    } finally {
      setPromoting(false);
    }
  }

  async function dismiss(matchId: string) {
    // Marca como descartado: use status "rejected" se existir, senão deleta o match frio
    const { error } = await supabase
      .schema("equity_brain" as any)
      .from("matches")
      .delete()
      .eq("id", matchId);
    if (error) {
      toast.error("Falha: " + error.message);
      return;
    }
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
  }

  return (
    <div className="p-6 space-y-5 bg-zinc-950 min-h-full">
      <Link to="/equity-brain/isp/import" className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="h-3 w-3" /> Voltar à ingestão
      </Link>

      <header className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded bg-fuchsia-950/40 text-fuchsia-300 border border-fuchsia-900">
            <Snowflake className="h-4 w-4" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">Sugestões frias — ISPs Anatel</h1>
        </div>
        <p className="text-[11px] text-zinc-500 mt-2 max-w-3xl break-words">
          Resultado da Fase 4. Cada linha é um ISP da lista fria com fit em alguma das 5 teses ISP e
          buyers ativos compatíveis. <strong>Promover</strong> cria a company no CRM (com codename),
          registra em <code>isp_promotion_log</code> e remove o flag <code>is_cold_suggestion</code> dos
          matches daquele CNPJ. <strong>Descartar</strong> remove só aquela sugestão.
        </p>
      </header>

      {/* Filters */}
      <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] text-zinc-500 block mb-1">Buscar (CNPJ, nome, cidade)</label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ex.: 12.345.678 / São José"
            className="bg-zinc-950 border-zinc-700 text-zinc-200 h-8 text-xs"
          />
        </div>
        <div className="w-[160px]">
          <label className="text-[10px] text-zinc-500 block mb-1">Tese</label>
          <Select value={thesisFilter} onValueChange={setThesisFilter}>
            <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-200 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-200">
              <SelectItem value="all">Todas</SelectItem>
              {thesisList.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[100px]">
          <label className="text-[10px] text-zinc-500 block mb-1">UF</label>
          <Select value={ufFilter} onValueChange={setUfFilter}>
            <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-200 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-200">
              <SelectItem value="all">Todas</SelectItem>
              {ufList.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[140px]">
          <label className="text-[10px] text-zinc-500 block mb-1">Score mínimo: {minScore.toFixed(2)}</label>
          <input
            type="range" min={0} max={1} step={0.05}
            value={minScore}
            onChange={(e) => setMinScore(parseFloat(e.target.value))}
            className="w-full accent-fuchsia-500"
          />
        </div>
        <div className="text-[11px] text-zinc-400 ml-auto flex items-center gap-1">
          <Filter className="h-3 w-3" /> {grouped.length} ISPs · {filtered.length} pares ISP×buyer
        </div>
      </div>

      {/* Table */}
      <div className="rounded border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center text-zinc-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando sugestões…
          </div>
        ) : grouped.length === 0 ? (
          <div className="p-10 text-center text-xs text-zinc-500">
            <AlertTriangle className="h-4 w-4 mx-auto mb-2 text-zinc-600" />
            Nenhuma sugestão fria encontrada com esses filtros. Rode a Fase 4 (gerar sugestões) na tela de ingestão.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="text-zinc-500 border-b border-zinc-800 bg-zinc-950/60">
                <tr>
                  <th className="text-left p-2 font-normal">ISP / CNPJ</th>
                  <th className="text-left p-2 font-normal">UF · Cidade</th>
                  <th className="text-right p-2 font-normal">Acessos</th>
                  <th className="text-right p-2 font-normal">Cidades</th>
                  <th className="text-right p-2 font-normal">Sellability</th>
                  <th className="text-right p-2 font-normal">Roll-up</th>
                  <th className="text-left p-2 font-normal">Teses & buyers</th>
                  <th className="text-right p-2 font-normal">Ações</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {grouped.map(([cnpj, group]) => {
                  const ent = entries[cnpj];
                  const st = stats[cnpj];
                  const topThesis = group.reduce((a, b) =>
                    (a.match_score ?? 0) >= (b.match_score ?? 0) ? a : b,
                  );
                  return (
                    <tr key={cnpj} className="border-b border-zinc-900 last:border-0 align-top hover:bg-zinc-900/40">
                      <td className="p-2 max-w-[220px]">
                        <div className="text-zinc-100 font-medium break-words">
                          {ent?.provider_name ?? st?.provider_name_norm ?? "—"}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">{formatCnpj(cnpj)}</div>
                      </td>
                      <td className="p-2 text-zinc-400">
                        {ent?.uf ?? "—"} · <span className="text-zinc-500">{ent?.municipio ?? "—"}</span>
                      </td>
                      <td className="p-2 text-right tabular-nums">{(st?.total_accesses ?? 0).toLocaleString("pt-BR")}</td>
                      <td className="p-2 text-right tabular-nums">{st?.n_municipios ?? 0}</td>
                      <td className="p-2 text-right">
                        <ScoreCell value={st?.sellability_score} />
                      </td>
                      <td className="p-2 text-right">
                        <ScoreCell value={st?.rollup_target_score} />
                      </td>
                      <td className="p-2 max-w-[280px]">
                        <div className="space-y-1">
                          {group.slice(0, 4).map((m) => {
                            const b = m.buyer_id ? buyers[m.buyer_id] : null;
                            return (
                              <div key={m.id} className="flex items-center gap-2 text-[10px]">
                                <Badge variant="outline" className="border-fuchsia-800 text-fuchsia-300 px-1.5 py-0 text-[9px]">
                                  {m.thesis_key?.replace("isp_", "") ?? "—"}
                                </Badge>
                                <span className="text-zinc-400 truncate max-w-[140px]">
                                  {b?.buyer_name ?? b?.company_name ?? "buyer"}
                                </span>
                                <span className="text-emerald-300 tabular-nums">
                                  {((m.match_score ?? 0) * 100).toFixed(0)}
                                </span>
                                <button
                                  onClick={() => dismiss(m.id)}
                                  className="ml-auto text-zinc-600 hover:text-rose-400"
                                  title="Descartar este par"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                          {group.length > 4 && (
                            <div className="text-[9px] text-zinc-500">+{group.length - 4} buyers</div>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          onClick={() => openPromote(cnpj, topThesis.thesis_key)}
                          className="bg-fuchsia-700 text-white hover:bg-fuchsia-600 h-7 text-[10px]"
                        >
                          <Sparkles className="h-3 w-3 mr-1" /> Promover
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Promote dialog */}
      <Dialog open={!!promoteCnpj} onOpenChange={(o) => !o && setPromoteCnpj(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-fuchsia-400" /> Promover ISP frio
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              CNPJ <span className="font-mono text-zinc-200">{promoteCnpj && formatCnpj(promoteCnpj)}</span>
              {promoteThesis && <> · tese <Badge variant="outline" className="border-fuchsia-800 text-fuchsia-300 ml-1">{promoteThesis}</Badge></>}
              <div className="mt-2 text-[11px] text-amber-300/80 break-words">
                Isto cria/atualiza a company no CRM (codename atribuído automaticamente), registra em
                <code className="mx-1">isp_promotion_log</code> e tira os matches do estado "frio".
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Novo status</label>
              <Select value={promoteStatus} onValueChange={setPromoteStatus}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-200">
                  {TARGET_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Razão (opcional, vai para o log)</label>
              <Input
                value={promoteReason}
                onChange={(e) => setPromoteReason(e.target.value)}
                placeholder="Ex.: contato confirmado por João, 30/04"
                className="bg-zinc-900 border-zinc-700 text-zinc-200 h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPromoteCnpj(null)}
              disabled={promoting}
              className="bg-transparent border-zinc-700 text-zinc-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={doPromote}
              disabled={promoting}
              className="bg-fuchsia-700 text-white hover:bg-fuchsia-600"
            >
              {promoting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Confirmar promoção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScoreCell({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-zinc-600">—</span>;
  const v = Number(value);
  const tone =
    v >= 0.7 ? "text-emerald-300" :
    v >= 0.5 ? "text-amber-300" :
    "text-zinc-500";
  return <span className={`tabular-nums ${tone}`}>{(v * 100).toFixed(0)}</span>;
}

function formatCnpj(c: string) {
  const d = c.replace(/\D/g, "").padStart(14, "0");
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`;
}
