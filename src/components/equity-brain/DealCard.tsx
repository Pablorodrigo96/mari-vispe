import { useState, useMemo } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Phone, Mail, Bookmark, BookmarkCheck, Copy, RotateCw, Loader2, ExternalLink, Building2, MapPin, Tag, MessageCircle, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  maskCnpj, formatBRL, formatNumber, relativeTime, tierFor, tierLabel, OUTCOMES,
} from "@/lib/equityBrain";
import { ScoreDial } from "./ScoreDial";
import { SignalChip } from "./SignalChip";
import { QuickCallModal } from "./QuickCallModal";
import { BlindBadge } from "./BlindBadge";
import { RequestDisclosureDialog } from "./RequestDisclosureDialog";
import { useIdentityVisibility } from "@/hooks/useIdentityVisibility";
import { useMatchContacts } from "@/hooks/useMatchContacts";
import { useIsSaved, useToggleSaved } from "@/hooks/useSavedCompanies";
import { getWhatsAppLink, normalizeBrPhone } from "@/lib/whatsapp";
import { AddContactDialog } from "./match/AddContactDialog";
import { cn } from "@/lib/utils";

interface DealCardProps {
  cnpj: string;
  mode?: "drawer" | "page";
}

export function DealCard({ cnpj, mode = "drawer" }: DealCardProps) {
  const { isAdmin, isAdvisor } = useUserRoles();
  const { data: canSeeIdentity = false } = useIdentityVisibility({ cnpj });
  const identified = isAdmin || isAdvisor || canSeeIdentity;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [callOpen, setCallOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const queries = useQueries({
    queries: [
      {
        queryKey: ["eb", "company", cnpj],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("eb_companies_enriched" as any)
            .select("*").eq("cnpj", cnpj).maybeSingle();
          if (error) throw error;
          return data as any;
        },
      },
      {
        queryKey: ["eb", "scored", cnpj],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("eb_companies_scored" as any)
            .select("*").eq("cnpj", cnpj).maybeSingle();
          if (error) throw error;
          return data as any;
        },
      },
      {
        queryKey: ["eb", "signals", cnpj],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("eb_company_signals" as any)
            .select("signal_key, weight, signal_text, source, created_at")
            .eq("cnpj", cnpj).order("weight", { ascending: false }).limit(20);
          if (error) throw error;
          return (data ?? []) as any[];
        },
      },
      {
        queryKey: ["eb", "matches", cnpj],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("eb_matches_enriched" as any)
            .select("*").eq("cnpj", cnpj).order("match_score", { ascending: false }).limit(10);
          if (error) throw error;
          return (data ?? []) as any[];
        },
      },
      {
        queryKey: ["eb", "opp", cnpj],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("eb_opportunities_ready" as any)
            .select("*").eq("cnpj", cnpj).maybeSingle();
          if (error) throw error;
          return data as any;
        },
      },
      {
        queryKey: ["eb", "calls", cnpj],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("eb_call_feedback" as any)
            .select("id, call_at, outcome, interest_level, raw_notes, dor_principal, timing_estimado")
            .eq("cnpj", cnpj).order("call_at", { ascending: false }).limit(5);
          if (error) throw error;
          return (data ?? []) as any[];
        },
      },
    ],
  });

  const [companyQ, scoredQ, signalsQ, matchesQ, oppQ, callsQ] = queries;
  const company = companyQ.data;
  const scored = scoredQ.data;
  const signals = signalsQ.data ?? [];
  const matches = matchesQ.data ?? [];
  const opp = oppQ.data;
  const calls = callsQ.data ?? [];

  const loading = queries.some((q) => q.isLoading);
  const tier = tierFor(scored?.ma_score ?? opp?.ma_score);
  const tierBadge = tierLabel(tier);

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ["eb"] });
  };

  async function regeneratePitch() {
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("claude-generate-pitch", {
        body: { cnpj, channel: "call", force_refresh: true },
      });
      if (error) throw error;
      toast.success("Pitch gerado", { description: data?.parsed?.abertura_curta ?? "Atualizado." });
      qc.invalidateQueries({ queryKey: ["eb", "opp", cnpj] });
    } catch (e: any) {
      toast.error("Falha ao gerar pitch", { description: e?.message ?? "Erro" });
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!company && !scored && !opp) {
    return (
      <div className="p-8 text-center text-zinc-500">
        <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <div className="text-sm">Empresa não encontrada na base do Equity Brain.</div>
        <div className="text-xs mt-1 font-mono">{maskCnpj(cnpj, isAdmin)}</div>
      </div>
    );
  }

  const razao = company?.razao_social ?? scored?.razao_social ?? opp?.razao_social ?? "—";
  const uf = company?.uf ?? scored?.uf ?? opp?.uf;
  const municipio = company?.municipio ?? scored?.municipio ?? opp?.municipio;
  const setor = company?.setor_ma ?? scored?.setor_ma ?? opp?.setor_ma;

  return (
    <div className={cn("space-y-4", mode === "page" ? "p-8 max-w-5xl mx-auto" : "p-5")}>
      {/* HEADER */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <BlindBadge unlocked={identified} />
              {company?.codename && (
                <span className="font-mono text-xs text-amber-300">{company.codename}</span>
              )}
            </div>
            <h1 className={cn("font-bold text-zinc-100 break-words", mode === "page" ? "text-3xl" : "text-xl")}>
              {identified ? razao : (company?.codename ?? "Ativo blind")}
            </h1>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400 mt-1">
              <span className="font-mono">{identified ? maskCnpj(cnpj, true) : "•• ••• •••/••••-••"}</span>
              {uf && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{identified && municipio ? `${municipio}/${uf}` : uf}
                </span>
              )}
              {setor && <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{setor}</span>}
            </div>
            {!identified && (
              <div className="mt-2">
                <RequestDisclosureDialog
                  targetKind="company"
                  targetCnpj={cnpj}
                  codename={company?.codename}
                />
              </div>
            )}
          </div>
          {mode === "drawer" && (
            <Button
              variant="ghost" size="sm"
              onClick={() => navigate(`/equity-brain/empresa/${cnpj}`)}
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />Página
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {company?.situacao_cadastral && (
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-medium border",
              company.situacao_cadastral === "Ativa"
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-900/60"
                : "bg-zinc-800 text-zinc-400 border-zinc-700",
            )}>
              {company.situacao_cadastral}
            </span>
          )}
          <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium border", tierBadge.cls)}>
            {tierBadge.label}
          </span>
          {opp?.best_thesis_name && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium border bg-blue-950/40 text-blue-300 border-blue-900/60">
              {opp.best_thesis_name}
            </span>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => setCallOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold"
          >
            <Phone className="h-3.5 w-3.5 mr-1" />Ligar
          </Button>
          <Button
            size="sm" variant="outline"
            className="bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
          >
            <Mail className="h-3.5 w-3.5 mr-1" />Email
          </Button>
          <Button
            size="sm" variant="outline"
            className="bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
          >
            <Bookmark className="h-3.5 w-3.5 mr-1" />Salvar
          </Button>
        </div>
      </div>

      {/* SCORES */}
      {scored && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <div className="text-xs uppercase tracking-wider text-zinc-500">Scores</div>
          <ScoreDial label="M&A Score"     value={scored.ma_score}       max={100} />
          <ScoreDial label="Vispe Fit"     value={scored.vispe_score}    max={100} />
          <ScoreDial label="Sucessão"      value={scored.sucessao_score} max={100} />
          {scored.scores_computed_at && (
            <div className="text-[10px] text-zinc-600 text-right">
              Recomputado {relativeTime(scored.scores_computed_at)}
            </div>
          )}
        </div>
      )}

      {/* TESE PRINCIPAL */}
      {opp?.ai_thesis_summary && (
        <div className="rounded-lg border border-blue-900/40 bg-blue-950/10 p-4 space-y-2">
          <div className="text-xs uppercase tracking-wider text-blue-400">Tese principal · Claude</div>
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">{opp.ai_thesis_summary}</p>
          {opp.best_thesis_name && (
            <div className="text-[11px] text-blue-400 font-mono">{opp.best_thesis_key} · {opp.best_thesis_name}</div>
          )}
        </div>
      )}

      {/* SINAIS */}
      {signals.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-2">
          <div className="text-xs uppercase tracking-wider text-zinc-500">
            Sinais ativos ({signals.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {signals.slice(0, 8).map((s, i) => (
              <SignalChip key={i} signalKey={s.signal_key} weight={s.weight} />
            ))}
            {signals.length > 8 && (
              <span className="text-xs text-zinc-500 self-center">+{signals.length - 8} outros</span>
            )}
          </div>
        </div>
      )}

      {/* BUYERS */}
      {matches.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-2">
          <div className="text-xs uppercase tracking-wider text-zinc-500">
            Buyers recomendados (top {Math.min(5, matches.length)})
          </div>
          <div className="space-y-2">
            {matches.slice(0, 5).map((m) => (
              <BuyerMatchRow key={m.id} match={m} />
            ))}
          </div>
        </div>
      )}

      {/* HISTÓRICO */}
      {calls.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-2">
          <div className="text-xs uppercase tracking-wider text-zinc-500">
            Histórico de contato ({calls.length})
          </div>
          <div className="space-y-2">
            {calls.map((c) => {
              const out = OUTCOMES.find((o) => o.value === c.outcome);
              return (
                <div key={c.id} className="text-xs flex items-start gap-2 border-l-2 border-zinc-800 pl-3 py-1">
                  <div className="text-zinc-500 font-mono shrink-0 w-20">
                    {new Date(c.call_at).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {out && <span className={cn("px-1.5 py-0.5 rounded text-[10px]", out.cls)}>{out.label}</span>}
                      {c.interest_level && (
                        <span className="text-amber-400 text-[10px]">{"★".repeat(c.interest_level)}</span>
                      )}
                    </div>
                    {c.raw_notes && (
                      <div className="text-zinc-400 mt-1 line-clamp-2">{c.raw_notes}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI PITCH */}
      {(opp?.ai_pitch || opp?.default_pitch) && (
        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-emerald-400">
              {opp.ai_pitch ? "AI Pitch · Claude" : "Pitch padrão"}
            </div>
            <div className="flex gap-1">
              <Button
                size="sm" variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(opp.ai_pitch ?? opp.default_pitch ?? "");
                  toast.success("Copiado");
                }}
                className="h-7 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                <Copy className="h-3 w-3 mr-1" />Copiar
              </Button>
              <Button
                size="sm" variant="ghost"
                onClick={regeneratePitch}
                disabled={regenerating}
                className="h-7 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                {regenerating
                  ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  : <RotateCw className="h-3 w-3 mr-1" />}
                Regenerar
              </Button>
            </div>
          </div>
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
            {opp.ai_pitch ?? opp.default_pitch}
          </p>
        </div>
      )}

      {/* FINANCEIROS */}
      {(company?.faturamento_estimado || company?.capital_social || company?.qtd_socios) && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 grid grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-zinc-500">Capital social</div>
            <div className="text-zinc-200 font-mono mt-0.5">{formatBRL(company?.capital_social)}</div>
          </div>
          <div>
            <div className="text-zinc-500">Fat. estimado</div>
            <div className="text-zinc-200 font-mono mt-0.5">{formatBRL(company?.faturamento_estimado)}</div>
          </div>
          <div>
            <div className="text-zinc-500">Sócios</div>
            <div className="text-zinc-200 font-mono mt-0.5">{formatNumber(company?.qtd_socios)}</div>
          </div>
        </div>
      )}

      <QuickCallModal
        cnpj={cnpj}
        razaoSocial={razao}
        open={callOpen}
        onOpenChange={setCallOpen}
        onSubmitted={() => {
          setTimeout(refetchAll, 8000);
        }}
      />
    </div>
  );
}

function BuyerMatchRow({ match }: { match: any }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-950 p-2.5 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-zinc-100 truncate">{match.buyer_nome}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">
            {match.buyer_tipo} · tese {match.thesis_name}
          </div>
        </div>
        <div className={cn(
          "shrink-0 px-2 py-0.5 rounded text-[11px] font-mono font-bold tabular-nums",
          Number(match.match_score) >= 70 ? "bg-emerald-950/60 text-emerald-300" :
          Number(match.match_score) >= 50 ? "bg-blue-950/60 text-blue-300" :
          "bg-zinc-800 text-zinc-400",
        )}>
          {Math.round(Number(match.match_score))}
        </div>
      </div>
      {Array.isArray(match.reasons) && match.reasons.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {match.reasons.slice(0, 3).map((r: any, i: number) => (
            <span key={i} className="text-[10px] text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-900">
              {r.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
