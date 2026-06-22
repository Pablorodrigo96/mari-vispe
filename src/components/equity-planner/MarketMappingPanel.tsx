import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Building2, Megaphone, Star, Quote, Sparkles, ArrowRight, Landmark } from "lucide-react";

interface BigNumber { value: number | null; label: string; sub: string; }
interface Signal { status: string; nota: string; }
interface MediaClip { veiculo: string; data: string; trecho: string; url: string; }

export interface MarketMappingPayload {
  hero_insight: string;
  big_numbers: {
    google_rating: BigNumber;
    midia_12m: BigNumber;
    capital_gap: BigNumber;
  };
  signals: {
    site: Signal;
    holding: Signal;
    equity_story: Signal;
    reputacao: Signal;
  };
  fiscal_insight: { has_opportunity: boolean; economia_estimada_brl: number | null; racional: string };
  media_clips: MediaClip[];
  next_step: { titulo: string; racional: string };
  _meta?: { site_oficial?: string | null; capital_social?: number | null; capital_gap_pct?: number | null };
}

const statusColor = (s: string) => {
  const v = (s || "").toLowerCase();
  if (v.includes("forte")) return "text-emerald-300 border-emerald-400/40 bg-emerald-400/5";
  if (v.includes("medio") || v.includes("médio")) return "text-volt border-volt/40 bg-volt/5";
  if (v.includes("fragil") || v.includes("frágil")) return "text-orange-300 border-orange-400/40 bg-orange-400/5";
  return "text-white/50 border-white/15 bg-white/[0.02]";
};

const statusLabel = (s: string) => {
  const v = (s || "").toLowerCase();
  if (v.includes("forte")) return "Forte";
  if (v.includes("medio") || v.includes("médio")) return "Médio";
  if (v.includes("fragil") || v.includes("frágil")) return "Frágil";
  return "Ausente";
};

const brl = (n: number | null | undefined) => {
  if (!n) return "—";
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace(".", ",")}mi`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
  return `R$ ${n.toLocaleString("pt-BR")}`;
};

const signalIcon: Record<string, any> = {
  site: Globe, holding: Landmark, equity_story: Megaphone, reputacao: Star,
};

const signalLabel: Record<string, string> = {
  site: "Site", holding: "Holding", equity_story: "Equity Story", reputacao: "Reputação",
};

export default function MarketMappingPanel({ data }: { data: MarketMappingPayload }) {
  return (
    <div className="space-y-10">
      {/* Hero + tag */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-volt/80 text-[11px] uppercase tracking-[0.32em] font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          Mapeamento de Mercado · pesquisa Mari
        </div>
        <h2 className="text-bone font-serif text-3xl sm:text-4xl md:text-5xl leading-[1.1] tracking-tight max-w-4xl break-words">
          “{data.hero_insight}”
        </h2>
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-2xl overflow-hidden">
        {([
          { k: "google_rating", n: data.big_numbers?.google_rating, fmt: (v: number | null) => v == null ? "—" : v.toFixed(1) },
          { k: "midia_12m", n: data.big_numbers?.midia_12m, fmt: (v: number | null) => v == null ? "0" : String(v) },
          { k: "capital_gap", n: data.big_numbers?.capital_gap, fmt: (v: number | null) => v == null ? "—" : `${v}%` },
        ]).map(({ k, n, fmt }) => (
          <div key={k} className="bg-carbon/90 backdrop-blur-md p-7 sm:p-8">
            <div className="text-[10px] uppercase tracking-[0.28em] text-white/45 font-semibold">{n?.label || "—"}</div>
            <div className="text-bone font-serif text-5xl sm:text-6xl md:text-7xl leading-none mt-3 tracking-tight">
              {fmt(n?.value ?? null)}
            </div>
            <div className="text-sm text-bone/55 mt-3 break-words">{n?.sub}</div>
          </div>
        ))}
      </div>

      {/* Signal strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["site", "holding", "equity_story", "reputacao"] as const).map((key) => {
          const sig = data.signals?.[key];
          const Icon = signalIcon[key];
          return (
            <div key={key} className={`p-4 rounded-xl border ${statusColor(sig?.status || "")}`}>
              <div className="flex items-center justify-between mb-3">
                <Icon className="h-4 w-4 opacity-80" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold opacity-90">
                  {statusLabel(sig?.status || "")}
                </span>
              </div>
              <div className="text-bone font-semibold text-sm">{signalLabel[key]}</div>
              <div className="text-xs text-bone/60 mt-1.5 break-words leading-relaxed">{sig?.nota || "—"}</div>
            </div>
          );
        })}
      </div>

      {/* Fiscal insight */}
      {data.fiscal_insight?.has_opportunity && (
        <div className="relative bg-volt/5 border border-volt/20 rounded-2xl p-6 sm:p-8 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-volt" />
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex h-12 w-12 rounded-xl bg-volt/15 border border-volt/30 items-center justify-center shrink-0">
              <Landmark className="h-5 w-5 text-volt" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.28em] text-volt/90 font-semibold mb-2">
                Oportunidade fiscal identificada
              </div>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <div className="text-bone font-serif text-4xl sm:text-5xl tracking-tight">
                  {brl(data.fiscal_insight.economia_estimada_brl)}
                </div>
                <div className="text-bone/60 text-sm">de eficiência anual potencial</div>
              </div>
              <p className="text-bone/80 text-sm sm:text-base mt-3 break-words leading-relaxed max-w-3xl">
                {data.fiscal_insight.racional}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Media clips */}
      {data.media_clips?.length > 0 && (
        <div className="space-y-4">
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/45 font-semibold flex items-center gap-2">
            <Quote className="h-3.5 w-3.5" /> Citações públicas
          </div>
          <div className="space-y-3">
            {data.media_clips.slice(0, 3).map((c, i) => (
              <div key={i} className="border-l-2 border-white/15 pl-5 py-1">
                <p className="text-bone/85 text-base sm:text-lg italic break-words leading-relaxed">
                  “{c.trecho}”
                </p>
                <div className="text-xs text-white/45 mt-2 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-bone/70">{c.veiculo}</span>
                  {c.data && <span>· {c.data}</span>}
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener" className="text-volt/70 hover:text-volt underline underline-offset-2">
                      ler →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next step */}
      <Card className="!bg-carbon/90 backdrop-blur-md border-white/10 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-volt/15 border border-volt/30 flex items-center justify-center shrink-0">
            <ArrowRight className="h-5 w-5 text-volt" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.28em] text-white/45 font-semibold">Próximo passo</div>
            <div className="text-bone font-semibold text-xl sm:text-2xl mt-2 break-words">{data.next_step?.titulo}</div>
            <p className="text-bone/70 text-sm sm:text-base mt-2 break-words leading-relaxed max-w-3xl">
              {data.next_step?.racional}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
