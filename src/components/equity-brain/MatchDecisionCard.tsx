import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, CheckCircle2, XCircle, FileSignature,
  Loader2, ChevronDown, ChevronUp, AlertTriangle, Activity, MessageCircleReply,
  Lightbulb,
} from "lucide-react";

// Mapa estático: feature → pergunta sugerida na call do BDR
const FEATURE_QUESTIONS: Record<string, string> = {
  governanca: "Vocês têm conselho consultivo, auditoria externa ou contrato societário formalizado?",
  geografia: "Em quais regiões vocês operam hoje, e onde planejam expandir nos próximos 12 meses?",
  densidade_local: "Quantos concorrentes diretos vocês mapeiam na sua praça hoje?",
  tamanho: "Qual o faturamento dos últimos 12 meses e o EBITDA real (não ajustado)?",
  financeiro: "Vocês têm DRE auditado dos últimos 3 anos? Margem está estável, em alta ou em queda?",
  setor: "O setor está consolidando? Vocês já receberam abordagem de algum comprador estratégico?",
  vertical_fit: "Qual a sua principal vertical de receita hoje e quanto pesa no mix?",
  timing: "O sócio fundador pretende continuar à frente após uma transação? Em que horizonte?",
  tese: "Sucessão familiar é tema discutido? Há plano definido para os próximos 24 meses?",
  intent: "Vocês já consideraram receber um investidor minoritário ou vender o controle?",
  socio_idade_max: "Qual a idade dos sócios fundadores e como veem o próximo ciclo?",
  tempo_atividade_anos: "A empresa tem mais de 10 anos — como o sócio enxerga o próximo ciclo?",
  unipessoal_fundador_55plus: "Existe sucessor mapeado dentro da família ou da empresa?",
  sweet_spot_fadiga: "Como vocês veem o próximo ciclo de investimento? Capital próprio ou parceiro?",
};

export type MatchDecisionRow = {
  id: string;
  cnpj: string;
  buyer_id: string;
  buyer_archetype: string | null;
  thesis_key: string;
  match_score: number;
  p_close_12m: number | null;
  p_close_lo: number | null;
  p_close_hi: number | null;
  ev_p10: number | null;
  ev_p50: number | null;
  ev_p90: number | null;
  data_confidence: number | null;
  abstain: boolean | null;
  feature_contributions: any;
  reasons: any;
  engine_version: string;
};

const fmtPct = (n: number | null | undefined) =>
  n == null ? "—" : `${(n * 100).toFixed(1)}%`;
const fmtBRL = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(n);

const REJECTION_REASONS = [
  { value: "geo_fora_radar", label: "Geografia fora do radar" },
  { value: "tamanho_pequeno", label: "Tamanho pequeno demais" },
  { value: "tamanho_grande", label: "Tamanho grande demais" },
  { value: "governanca_problema", label: "Problema de governança" },
  { value: "setor_secundario", label: "Setor secundário" },
  { value: "timing_ruim", label: "Timing ruim" },
  { value: "preco_alto", label: "Preço fora da banda" },
  { value: "sem_resposta", label: "Sem resposta" },
  { value: "fit_fraco", label: "Fit fraco" },
  { value: "outro", label: "Outro" },
];

export function MatchDecisionCard({
  match,
  onLogged,
}: {
  match: MatchDecisionRow;
  onLogged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [notes, setNotes] = useState("");

  // SHAP-style top contributions
  const contribs = useMemo(() => {
    const fc = match.feature_contributions;
    if (!fc) return [] as Array<{ key: string; value: number }>;
    if (Array.isArray(fc)) {
      return fc
        .map((c: any) => ({ key: String(c.key ?? c.name ?? "?"), value: Number(c.value ?? c.contribution ?? 0) }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        .slice(0, 6);
    }
    if (typeof fc === "object") {
      return Object.entries(fc)
        .map(([k, v]) => ({ key: k, value: Number(v) || 0 }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        .slice(0, 6);
    }
    return [];
  }, [match.feature_contributions]);

  const maxAbs = Math.max(1, ...contribs.map((c) => Math.abs(c.value)));
  const pCloseStr = fmtPct(match.p_close_12m);
  const ciStr =
    match.p_close_lo != null && match.p_close_hi != null
      ? `IC90 [${fmtPct(match.p_close_lo)} – ${fmtPct(match.p_close_hi)}]`
      : null;
  const confStr = fmtPct(match.data_confidence);

  async function logEvent(eventType: string, opts?: { rejectionReason?: string }) {
    setSubmitting(eventType);
    try {
      const { error } = await (supabase as any).rpc("eb_log_deal_event", {
        p_match_id: match.id,
        p_event_type: eventType,
        p_rejection_reason: opts?.rejectionReason ?? null,
        p_notes: notes || null,
        p_metadata: { ui: "MatchDecisionCard", archetype: match.buyer_archetype },
      });
      if (error) throw error;
      toast.success("Evento registrado", {
        description: `${eventType}${opts?.rejectionReason ? ` · ${opts.rejectionReason}` : ""}`,
      });
      setRejectMode(false);
      setRejectReason("");
      setNotes("");
      onLogged?.();
    } catch (e: any) {
      toast.error("Falha ao registrar", { description: e.message ?? String(e) });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm font-mono text-foreground break-all">
                {match.cnpj}
              </CardTitle>
              {match.buyer_archetype && (
                <Badge variant="outline" className="text-[10px] bg-transparent">
                  {match.buyer_archetype}
                </Badge>
              )}
              {match.abstain && (
                <Badge variant="outline" className="text-[10px] bg-transparent border-amber-500/40 text-amber-400">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Abstenção
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 break-words">
              {match.thesis_key} · engine {match.engine_version}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">{match.match_score}</div>
            <div className="text-[10px] text-muted-foreground uppercase">score</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* p_close 12m */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3" /> p(close 12m)
            </span>
            <span className={`font-semibold ${(match.p_close_12m ?? 0) > 0.4 ? "text-emerald-400" : "text-foreground"}`}>
              {pCloseStr}
            </span>
          </div>
          <Progress value={(match.p_close_12m ?? 0) * 100} className="h-1.5" />
          {ciStr && <p className="text-[10px] text-muted-foreground mt-1">{ciStr} · confiança {confStr}</p>}
        </div>

        {/* Price bands */}
        <div className="grid grid-cols-3 gap-2 rounded-md bg-slate-800/40 p-2">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">EV p10</p>
            <p className="text-xs font-semibold text-rose-300 break-words">{fmtBRL(match.ev_p10)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">EV p50</p>
            <p className="text-xs font-bold text-foreground break-words">{fmtBRL(match.ev_p50)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">EV p90</p>
            <p className="text-xs font-semibold text-emerald-300 break-words">{fmtBRL(match.ev_p90)}</p>
          </div>
        </div>

        {/* SHAP-style contributions */}
        {contribs.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Contribuições ({contribs.length})
            </button>
            {open && (
              <div className="mt-2 space-y-1.5">
                {contribs.map((c) => {
                  const pos = c.value >= 0;
                  const widthPct = (Math.abs(c.value) / maxAbs) * 100;
                  return (
                    <div key={c.key} className="text-xs">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-muted-foreground break-words flex items-center gap-1">
                          {pos ? (
                            <TrendingUp className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-rose-400" />
                          )}
                          {c.key}
                        </span>
                        <span className={pos ? "text-emerald-400" : "text-rose-400"}>
                          {pos ? "+" : ""}{c.value.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-1 rounded bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full ${pos ? "bg-emerald-500/60" : "bg-rose-500/60"}`}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Feedback BDR */}
        <div className="border-t border-slate-800 pt-3 space-y-2">
          {!rejectMode ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm" variant="outline"
                className="bg-transparent border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                disabled={!!submitting}
                onClick={() => setRejectMode(true)}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
              </Button>
              <Button
                size="sm" variant="outline"
                className="bg-transparent border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
                disabled={!!submitting}
                onClick={() => logEvent("contacted")}
              >
                {submitting === "contacted" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                Contatado
              </Button>
              <Button
                size="sm" variant="outline"
                className="bg-transparent border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
                disabled={!!submitting}
                onClick={() => logEvent("reply_received")}
              >
                {submitting === "reply_received" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <MessageCircleReply className="h-3.5 w-3.5 mr-1" />}
                Resposta recebida
              </Button>
              <Button
                size="sm" variant="outline"
                className="bg-transparent border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                disabled={!!submitting}
                onClick={() => logEvent("nda_signed")}
              >
                {submitting === "nda_signed" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileSignature className="h-3.5 w-3.5 mr-1" />}
                NDA assinado
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!!submitting}
                onClick={() => logEvent("closed")}
              >
                {submitting === "closed" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                Fechado
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger className="h-8 text-xs bg-slate-800/60 border-slate-700">
                  <SelectValue placeholder="Motivo da rejeição" />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas (opcional)"
                className="h-16 text-xs bg-slate-800/60 border-slate-700 resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm" variant="outline"
                  className="bg-transparent"
                  disabled={!!submitting}
                  onClick={() => { setRejectMode(false); setRejectReason(""); }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                  disabled={!rejectReason || !!submitting}
                  onClick={() => logEvent("rejected", { rejectionReason: rejectReason })}
                >
                  {submitting === "rejected" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                  Confirmar rejeição
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
