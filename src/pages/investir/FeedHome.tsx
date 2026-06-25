import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { StoriesBar } from "@/components/investir/social/StoriesBar";
import { FeedCard } from "@/components/investir/social/FeedCard";
import { CategoryStrip } from "@/components/investir/social/CategoryStrip";
import { supabase } from "@/integrations/supabase/client";
import { makeFeedSeed, makeStoriesSeed, sectorToCover, seedCompanies } from "@/data/socialSeed";
import type { FeedPost, StoryItem, CompanyMini } from "@/types/social";
import { Trophy, Flame, ChevronRight, Sparkles, Radio, MapPin, Eye, Sprout, Target, Bell } from "lucide-react";

type Interests = {
  setores?: string[];
  cidade?: string;
  empresas_favoritas?: string[];
  perfil?: string;
};

export default function FeedHome() {
  const [stories, setStories] = useState<StoryItem[]>(makeStoriesSeed());
  const [posts, setPosts] = useState<FeedPost[]>(makeFeedSeed());
  const [authed, setAuthed] = useState(false);
  const [interests, setInterests] = useState<Interests>({});
  const [followingSymbols, setFollowingSymbols] = useState<string[]>([]);
  const [recentPosts, setRecentPosts] = useState<FeedPost[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setAuthed(!!u.user);
      if (!u.user) return;

      const { data: p } = await supabase
        .from("profiles")
        .select("interests")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (p?.interests) setInterests(p.interests as Interests);

      const { data: f } = await supabase
        .from("company_follows")
        .select("company_symbol")
        .eq("user_id", u.user.id);
      if (f?.length) setFollowingSymbols(f.map((x: any) => x.company_symbol));
    })();
  }, []);

  // Enriquecer com empresas reais (tokens)
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
        id: t.id, symbol: t.symbol, name: t.name, sector: t.sector,
        cover: sectorToCover(t.sector), avatar: sectorToCover(t.sector),
        founder: "Equipe fundadora", city: "Brasil",
      }));
      setStories((prev) => [
        ...real.map<StoryItem>((c, i) => ({
          id: `r-story-${i}`, company: c, actor: "company",
          slides: [{ media: c.cover!, kind: "milestone", title: `Novidades de ${c.name}` }],
          media: c.cover!, kind: "milestone", title: `Novidades de ${c.name}`,
          createdAt: new Date().toISOString(),
        })),
        ...prev,
      ]);
      setPosts((prev) => [
        ...real.slice(0, 3).map<FeedPost>((c, i) => {
          const t: any = data[i];
          const pct = t.total_offering_amount ? Math.min(100, (t.amount_raised / t.total_offering_amount) * 100) : undefined;
          return {
            id: `r-feed-${i}`, company: c, kind: "diario", category: "Rodada aberta",
            headline: `${c.name} está captando agora`,
            resumoIA: `${c.name} acaba de abrir uma nova rodada na Mari. Conheça a história e os números antes de decidir.`,
            media: c.cover!, comments: 0, followers: 0, investors: 0,
            metrics: pct !== undefined ? [{ label: "Captado", value: `${pct.toFixed(0)}%` }] : undefined,
            rodadaPct: pct, createdAt: new Date().toISOString(),
          };
        }),
        ...prev,
      ]);
    })();
  }, []);

  // Atualizações recentes (company_posts reais)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("company_posts")
        .select("id, token_id, kind, title, body, media_url, created_at, tokens:token_id(symbol, name, risk_level)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (!data?.length) return;
      const mapped: FeedPost[] = data.map((p: any) => {
        const t = p.tokens || {};
        const comp: CompanyMini = {
          id: p.token_id, symbol: t.symbol || "?", name: t.name || "Empresa",
          sector: t.risk_level, cover: sectorToCover(t.risk_level), avatar: sectorToCover(t.risk_level),
        };
        return {
          id: `cp-${p.id}`, company: comp, kind: p.kind || "diario",
          category: "Atualização", headline: p.title || "Nova atualização",
          resumoIA: p.body || "", media: p.media_url || comp.cover!,
          comments: 0, followers: 0, investors: 0, createdAt: p.created_at,
        };
      });
      setRecentPosts(mapped);
    })();
  }, []);

  // Slicers das faixas
  const cityKey = (interests.cidade || "").toLowerCase().split("/")[0].trim();
  const regionPosts = posts.filter((p) => cityKey && p.company.city?.toLowerCase().includes(cityKey));
  const followingPosts = posts.filter((p) => followingSymbols.includes(p.company.symbol));
  const recentlyAdded = posts.slice(0, 4); // fallback até termos created_at real ordenado
  const closeToGoal = posts.filter((p) => (p.rodadaPct ?? 0) >= 80);
  const livesPosts = posts.filter((p) => p.kind === "live");
  const updates = recentPosts.length ? recentPosts : posts.filter((p) => p.kind === "diario");

  // Greeting
  const hour = new Date().getHours();
  const greet = hour < 6 ? "Boa noite" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <InvestirShell authed={authed} hideFooter>
      <section className="max-w-[1100px] mx-auto px-5 md:px-6 pt-6 md:pt-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-bone/55 text-xs md:text-sm">{greet} 👋</p>
            <h1 className="text-2xl md:text-4xl font-semibold text-bone leading-tight">
              Empresas reais <span className="text-volt">crescendo agora.</span>
            </h1>
          </div>
          <Link to="/investir/ligas" className="hidden sm:inline-flex items-center gap-1 text-xs text-bone/65 hover:text-volt">
            <Trophy className="w-3.5 h-3.5" /> Ligas <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <StoriesBar stories={stories} />
        <CategoryStrip />
      </section>

      <section className="max-w-[1100px] mx-auto px-5 md:px-6 mt-2">
        <div className="rounded-2xl bg-gradient-to-r from-volt/10 via-volt/5 to-transparent border border-volt/20 px-4 py-3 flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-volt shrink-0" />
          <p className="text-bone/85 text-xs md:text-sm">
            <strong>Instagram</strong> aproxima pessoas. <strong>LinkedIn</strong>, profissionais.
            A <strong className="text-volt">Mari</strong> aproxima investidores e empreendedores.
          </p>
        </div>
      </section>

      {/* Faixas contextuais (interesses + follows) — antes do feed principal */}
      {followingPosts.length > 0 && (
        <HighlightStrip icon={<Eye className="w-4 h-4 text-volt" />} title="Que você segue" items={followingPosts} />
      )}
      {regionPosts.length > 0 && (
        <HighlightStrip icon={<MapPin className="w-4 h-4 text-volt" />} title={`Perto de ${interests.cidade || "você"}`} items={regionPosts} />
      )}

      {/* Feed principal */}
      <section className="max-w-[700px] mx-auto px-5 md:px-6 pt-6 md:pt-8 pb-4 space-y-5 md:space-y-6">
        {posts.map((p) => <FeedCard key={p.id} post={p} />)}
        <Link to="/investir/descobrir" className="block text-center text-bone/55 hover:text-volt text-sm py-6 border-t border-bone/10">
          Ver todas as empresas <ChevronRight className="inline w-3.5 h-3.5" />
        </Link>
      </section>

      {/* Tiras horizontais — descoberta passiva */}
      <HighlightStrip icon={<Flame className="w-4 h-4 text-volt" />} title="Em alta esta semana" items={posts.slice(0, 4)} />
      <HighlightStrip icon={<Target className="w-4 h-4 text-volt" />} title="Atingindo metas" items={closeToGoal} />
      <HighlightStrip icon={<Sprout className="w-4 h-4 text-volt" />} title="Recém-chegadas na Mari" items={recentlyAdded} />
      <HighlightStrip icon={<Bell className="w-4 h-4 text-volt" />} title="Atualizações recentes" items={updates.slice(0, 6)} />
      {livesPosts.length > 0 && (
        <HighlightStrip icon={<Radio className="w-4 h-4 text-volt" />} title="Lives programadas" items={livesPosts} />
      )}

      {/* Bloco gamificação */}
      <section className="max-w-[1100px] mx-auto px-5 md:px-6 py-10 grid sm:grid-cols-3 gap-3">
        <Link to="/investir/missoes" className="rounded-2xl border border-bone/10 hover:border-volt bg-graphite/30 p-5 transition-colors">
          <Flame className="w-5 h-5 text-volt mb-2" />
          <div className="text-bone font-semibold text-sm">Missões diárias</div>
          <div className="text-bone/55 text-xs mt-1">Ganhe XP acompanhando empresas, sem investir.</div>
        </Link>
        <Link to="/investir/ligas" className="rounded-2xl border border-bone/10 hover:border-volt bg-graphite/30 p-5 transition-colors">
          <Trophy className="w-5 h-5 text-volt mb-2" />
          <div className="text-bone font-semibold text-sm">Ligas por setor</div>
          <div className="text-bone/55 text-xs mt-1">Suba no ranking de quem mais conhece cada setor.</div>
        </Link>
        <Link to="/investir/lives" className="rounded-2xl border border-bone/10 hover:border-volt bg-graphite/30 p-5 transition-colors">
          <Radio className="w-5 h-5 text-volt mb-2" />
          <div className="text-bone font-semibold text-sm">Lives da semana</div>
          <div className="text-bone/55 text-xs mt-1">Fundadores ao vivo respondendo perguntas reais.</div>
        </Link>
      </section>
    </InvestirShell>
  );
}

function HighlightStrip({ icon, title, items }: { icon?: React.ReactNode; title: string; items: FeedPost[] }) {
  if (!items.length) return null;
  return (
    <section className="max-w-[1100px] mx-auto px-5 md:px-6 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-bone font-semibold text-base md:text-lg inline-flex items-center gap-2">
          {icon}{title}
        </h2>
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
