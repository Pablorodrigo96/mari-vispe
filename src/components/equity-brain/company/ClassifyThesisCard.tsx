import { useState, useEffect } from "react";
import { Brain, Copy, Loader2, RefreshCw, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  cnpj?: string | null;
}

const THESIS_LABELS: Record<string, { label: string; emoji: string; cls: string }> = {
  consolidacao_regional: { label: "Consolidação regional", emoji: "🗺️", cls: "border-blue-700/40 bg-blue-500/10 text-blue-200" },
  sucessao_familiar: { label: "Sucessão familiar", emoji: "👨‍👩‍👧", cls: "border-amber-700/40 bg-amber-500/10 text-amber-200" },
  roll_up_setor: { label: "Roll-up de setor", emoji: "🧩", cls: "border-purple-700/40 bg-purple-500/10 text-purple-200" },
  aquisicao_carteira: { label: "Aquisição de carteira", emoji: "📊", cls: "border-emerald-700/40 bg-emerald-500/10 text-emerald-200" },
  ganho_margem_governanca: { label: "Ganho de margem/governança", emoji: "📈", cls: "border-pink-700/40 bg-pink-500/10 text-pink-200" },
};

function copy(text: string, label = "Copiado") {
  navigator.clipboard.writeText(text);
  toast.success(label);
}

export function ClassifyThesisCard({ cnpj }: Props) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [tese, setTese] = useState<string>("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [cached, setCached] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  // Load existing summary from opportunities_ready
  useEffect(() => {
    let active = true;
    async function load() {
      if (!cnpj) return;
      const { data } = await supabase
        .schema("equity_brain" as any)
        .from("opportunities_ready")
        .select("ai_thesis_summary")
        .eq("cnpj", cnpj)
        .maybeSingle();
      if (!active) return;
      const s = (data as any)?.ai_thesis_summary;
      if (s) {
        setSummary(s);
        setHasExisting(true);
        setCached(true);
      }
    }
    load();
    return () => { active = false; };
  }, [cnpj]);

  async function classify(force = false) {
    if (!cnpj) {
      toast.error("CNPJ não disponível");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("claude-classify-thesis", {
        body: { cnpj, force_refresh: force },
      });
      if (error) throw error;
      if (data?.skipped) {
        setSummary(data.summary ?? "");
        setCached(true);
        setHasExisting(true);
        toast.success("Tese carregada do cache");
        return;
      }
      const parsed = data?.parsed;
      if (!parsed?.summary) throw new Error("Resposta inválida da IA");
      setSummary(parsed.summary);
      setTese(parsed.tese_refinada ?? "");
      setConfidence(typeof parsed.confidence === "number" ? parsed.confidence : null);
      setRedFlags(Array.isArray(parsed.red_flags) ? parsed.red_flags : []);
      setCached(false);
      setHasExisting(true);
      toast.success(`Tese classificada · ${data?.tokens?.output ?? 0} tokens`);
    } catch (e: any) {
      console.error("classify thesis error:", e);
      toast.error(e?.message ?? "Erro ao classificar tese");
    } finally {
      setLoading(false);
    }
  }

  const teseMeta = tese ? THESIS_LABELS[tese] : null;
  const confidencePct = confidence != null ? Math.round(confidence * 100) : null;

  return (
    <div className="rounded border border-[#D9F564]/30 bg-zinc-900/60 p-4 relative">
      <div className="absolute -top-2 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#D9F564] text-zinc-900 tracking-wider">
        NOVO ✨
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-4 w-4 text-[#D9F564]" />
        <div className="text-sm font-semibold text-zinc-100">Mari classifica a tese de M&A</div>
        <div className="text-[10px] text-zinc-500 ml-auto">IA · diagnóstico estratégico</div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          onClick={() => classify(false)}
          disabled={loading || !cnpj}
          className="text-[11px] px-3 h-7 inline-flex items-center gap-1 rounded bg-[#D9F564] text-zinc-900 font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {hasExisting ? "Recarregar tese" : "Classificar tese"}
        </button>
        {hasExisting && (
          <button
            onClick={() => classify(true)}
            disabled={loading}
            title="Forçar reclassificação (ignora cache)"
            className="text-[11px] px-2 h-7 inline-flex items-center gap-1 rounded border border-zinc-800 text-zinc-400 hover:text-[#D9F564]"
          >
            <RefreshCw className="h-3 w-3" /> Reclassificar
          </button>
        )}
        {confidencePct != null && (
          <span className="ml-auto text-[10px] text-zinc-400">
            Confiança: <span className={cn(
              "font-semibold",
              confidencePct >= 80 ? "text-emerald-300" : confidencePct >= 60 ? "text-amber-300" : "text-zinc-300"
            )}>{confidencePct}%</span>
          </span>
        )}
      </div>

      {!summary && !loading && (
        <div className="text-[11px] text-zinc-500 italic">
          Clique em "Classificar tese" para a Mari analisar perfil + signals + buyers compatíveis e sugerir a melhor tese de M&A.
        </div>
      )}

      {summary && (
        <div className="space-y-2">
          {cached && !tese && (
            <div className="text-[10px] text-amber-400">↻ Cache · clique em "Reclassificar" para regenerar tipo, confiança e red flags</div>
          )}

          {teseMeta && (
            <div className="rounded bg-zinc-950/60 border border-zinc-800 p-2.5">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[9px] uppercase tracking-wider text-zinc-500">Tese refinada</div>
                <button onClick={() => copy(teseMeta.label, "Tese copiada")} className="text-zinc-400 hover:text-[#D9F564]">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-semibold", teseMeta.cls)}>
                <span>{teseMeta.emoji}</span>
                <span>{teseMeta.label}</span>
              </div>
            </div>
          )}

          <div className="rounded bg-zinc-950/60 border border-zinc-800 p-2.5">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">Resumo estratégico</div>
              <button onClick={() => copy(summary, "Resumo copiado")} className="text-zinc-400 hover:text-[#D9F564]">
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <div className="text-xs text-zinc-200 whitespace-pre-wrap break-words leading-relaxed">{summary}</div>
          </div>

          {redFlags.length > 0 && (
            <div className="rounded bg-amber-950/20 border border-amber-700/40 p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[9px] uppercase tracking-wider text-amber-300 inline-flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Red flags ({redFlags.length})
                </div>
                <button onClick={() => copy(redFlags.map((r, i) => `${i + 1}. ${r}`).join("\n"), "Red flags copiadas")} className="text-amber-400/70 hover:text-[#D9F564]">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <ul className="space-y-1 text-xs text-amber-100">
                {redFlags.map((r, i) => (
                  <li key={i} className="break-words leading-relaxed">• {r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
