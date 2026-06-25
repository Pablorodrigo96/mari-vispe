import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { StoriesBar } from "@/components/investir/social/StoriesBar";
import { FeedCard } from "@/components/investir/social/FeedCard";
import { CategoryStrip } from "@/components/investir/social/CategoryStrip";
import { supabase } from "@/integrations/supabase/client";
import { makeFeedSeed, makeStoriesSeed, sectorToCover } from "@/data/socialSeed";
import type { FeedPost, StoryItem, CompanyMini } from "@/types/social";
import { Trophy, Flame, ChevronRight, Sparkles, Radio } from "lucide-react";

export default function FeedHome() {
  const [stories, setStories] = useState<StoryItem[]>(makeStoriesSeed());
  const [posts, setPosts] = useState<FeedPost[]>(makeFeedSeed());
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  // Enriquecer com empresas reais (tokens), se houver
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tokens")
        .select("id,symbol,name,sector:risk_level,listing_id,amount_raised,total_offering_amount")
        .in("status", ["primary_open", "approved", "issued"])
        .order("created_at", { ascending: false })
        .limit(6);
      if (!data?.length) return;
      const real: CompanyMini[] = data.map((t: any) => ({
        id: t.id,
        symbol: t.symbol,
        name: t.name,
        sector: t.sector,
        cover: sectorToCover(t.sector),
        avatar: sectorToCover(t.sector),
        founder: "Equipe fundadora",
        city: "Brasil",
      }));
      // injeta stories reais à frente
      setStories((prev) => [
        ...real.map<StoryItem>((c, i) => ({
          id: `r-story-${i}`,
          company: c,
          actor: "company",
          slides: [{ media: c.cover!, kind: "milestone", title: `Novidades de ${c.name}` }],
          media: c.cover!,
          kind: "milestone",
          title: `Novidades de ${c.name}`,
          createdAt: new Date().toISOString(),
        })),
        ...prev,
      ]);
      // injeta posts reais como cards de "rodada aberta"
      setPosts((prev) => [
        ...real.slice(0, 3).map((c, i) => {
          const t: any = data[i];
          const pct = t.total_offering_amount ? Math.min(100, (t.amount_raised / t.total_offering_amount) * 100) : undefined;
          return {
            id: `r-feed-${i}`,
            company: c,
            kind: "diario" as const,
            category: "Rodada aberta",
            headline: `${c.name} está captando agora`,
            resumoIA: `${c.name} acaba de abrir uma nova rodada na Mari. Conheça a história e os números antes de decidir.`,
            media: c.cover!,
            metrics: pct !== undefined ? [{ label: "Captado", value: `${pct.toFixed(0)}%` }] : undefined,
            comments: 0, followers: 0, investors: 0,
            rodadaPct: pct,
            createdAt: new Date().toISOString(),
          };
        }),
        ...prev,
      ]);
    })();
  }, []);

  return (
    <InvestirShell authed={authed} hideFooter>
      {/* Saudação humana, sem CTA comercial */}
      <section className="max-w-[1100px] mx-auto px-5 md:px-6 pt-6 md:pt-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-bone/55 text-xs md:text-sm">Bom dia 👋</p>
            <h1 className="text-2xl md:text-4xl font-semibold text-bone leading-tight">
              Empresas reais <span className="text-volt">crescendo agora.</span>
            </h1>
          </div>
          <Link
            to="/investir/ligas"
            className="hidden sm:inline-flex items-center gap-1 text-xs text-bone/65 hover:text-volt"
          >
            <Trophy className="w-3.5 h-3.5" /> Ligas <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <StoriesBar stories={stories} />
        <CategoryStrip />
      </section>

      {/* Faixa: Mari aproxima */}
      <section className="max-w-[1100px] mx-auto px-5 md:px-6 mt-2">
        <div className="rounded-2xl bg-gradient-to-r from-volt/10 via-volt/5 to-transparent border border-volt/20 px-4 py-3 flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-volt shrink-0" />
          <p className="text-bone/85 text-xs md:text-sm">
            <strong>Instagram</strong> aproxima pessoas. <strong>LinkedIn</strong>, profissionais.
            A <strong className="text-volt">Mari</strong> aproxima investidores e empreendedores.
          </p>
        </div>
      </section>

      {/* Feed principal */}
      <section className="max-w-[700px] mx-auto px-5 md:px-6 pt-6 md:pt-8 pb-12 space-y-5 md:space-y-6">
        {posts.map((p) => <FeedCard key={p.id} post={p} />)}

        <Link
          to="/investir/descobrir"
          className="block text-center text-bone/55 hover:text-volt text-sm py-6 border-t border-bone/10"
        >
          Ver todas as empresas <ChevronRight className="inline w-3.5 h-3.5" />
        </Link>
      </section>

      {/* Tiras horizontais (Em alta / Próximas de concluir) */}
      <HighlightStrip
        title="🔥 Em alta esta semana"
        items={posts.slice(0, 4)}
      />
      <HighlightStrip
        title="⏳ Perto de concluir a rodada"
        items={posts.filter((p) => (p.rodadaPct ?? 0) >= 70)}
      />

      <section className="max-w-[1100px] mx-auto px-5 md:px-6 py-10 grid sm:grid-cols-3 gap-3">
        <Link
          to="/investir/missoes"
          className="rounded-2xl border border-bone/10 hover:border-volt bg-graphite/30 p-5 transition-colors"
        >
          <Flame className="w-5 h-5 text-volt mb-2" />
          <div className="text-bone font-semibold text-sm">Missões diárias</div>
          <div className="text-bone/55 text-xs mt-1">Ganhe XP acompanhando empresas, sem investir.</div>
        </Link>
        <Link
          to="/investir/ligas"
          className="rounded-2xl border border-bone/10 hover:border-volt bg-graphite/30 p-5 transition-colors"
        >
          <Trophy className="w-5 h-5 text-volt mb-2" />
          <div className="text-bone font-semibold text-sm">Ligas por setor</div>
          <div className="text-bone/55 text-xs mt-1">Suba no ranking de quem mais conhece cada setor.</div>
        </Link>
        <Link
          to="/investir/lives"
          className="rounded-2xl border border-bone/10 hover:border-volt bg-graphite/30 p-5 transition-colors"
        >
          <Radio className="w-5 h-5 text-volt mb-2" />
          <div className="text-bone font-semibold text-sm">Lives da semana</div>
          <div className="text-bone/55 text-xs mt-1">Fundadores ao vivo respondendo perguntas reais.</div>
        </Link>
      </section>
    </InvestirShell>
  );
}

function HighlightStrip({ title, items }: { title: string; items: FeedPost[] }) {
  if (!items.length) return null;
  return (
    <section className="max-w-[1100px] mx-auto px-5 md:px-6 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-bone font-semibold text-base md:text-lg">{title}</h2>
        <Link to="/investir/descobrir" className="text-xs text-bone/55 hover:text-volt">Ver mais</Link>
      </div>
      <div className="overflow-x-auto no-scrollbar -mx-5 md:-mx-6 px-5 md:px-6">
        <ul className="flex gap-3 min-w-min pb-2">
          {items.map((p) => (
            <li key={p.id} className="shrink-0 w-[240px] md:w-[280px]">
              <Link
                to={`/investir/empresa/${p.company.symbol}`}
                className="block rounded-2xl overflow-hidden border border-bone/10 bg-graphite/40 hover:border-volt/40 transition-colors"
              >
                <div className="aspect-[4/3] overflow-hidden bg-carbon">
                  <img src={p.media} alt={p.company.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="text-[10px] uppercase tracking-wider text-volt">{p.category}</div>
                  <div className="text-bone font-medium text-sm mt-0.5 truncate">{p.company.name}</div>
                  {p.rodadaPct !== undefined && (
                    <div className="mt-2 h-1.5 bg-bone/10 rounded-full overflow-hidden">
                      <div className="h-full bg-volt" style={{ width: `${p.rodadaPct}%` }} />
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
