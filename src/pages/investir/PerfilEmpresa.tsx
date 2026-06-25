import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { CompanyHero } from "@/components/investir/social/CompanyHero";
import { ResumoIA } from "@/components/investir/social/ResumoIA";
import { ScoreMari } from "@/components/investir/social/ScoreMari";
import { TimelineMarcos } from "@/components/investir/social/TimelineMarcos";
import { DiarioFeed } from "@/components/investir/social/DiarioFeed";
import { CommentsThread } from "@/components/investir/social/CommentsThread";
import { ReservationModal } from "@/components/investir/ReservationModal";
import { supabase } from "@/integrations/supabase/client";
import {
  seedCompanies, seedDiario, seedScore, seedTimeline, seedComments, sectorToCover,
} from "@/data/socialSeed";
import type { CompanyMini } from "@/types/social";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, PlayCircle, Sparkles } from "lucide-react";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

export default function PerfilEmpresa() {
  const { symbol } = useParams<{ symbol: string }>();
  const [searchParams] = useSearchParams();
  const reservarParam = Number(searchParams.get("reservar") || 0);
  const [token, setToken] = useState<any>(null);
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [aiResumo, setAiResumo] = useState<{ summary: string; bullets: { label: string; body: string }[] } | null>(null);
  const [canManageStories, setCanManageStories] = useState(false);
  const [activeStoriesCount, setActiveStoriesCount] = useState(0);

  // Abrir modal automaticamente quando vier do story com ?reservar=50
  useEffect(() => {
    if (reservarParam > 0 && token && token.status === "primary_open") {
      setReserveOpen(true);
    }
  }, [reservarParam, token]);

  useEffect(() => {
    if (!symbol) return;
    (async () => {
      const { data: tk } = await supabase.from("tokens").select("*").eq("symbol", symbol).maybeSingle();
      if (tk) {
        setToken(tk);
        if (tk.listing_id) {
          const { data: l } = await supabase.from("listings").select("*").eq("id", tk.listing_id).maybeSingle();
          setListing(l);
        }
        // Resumo IA — cache-first leitura direta, fallback edge function
        const { data: cached } = await supabase
          .from("mari_company_summaries")
          .select("summary,bullets,generated_at")
          .eq("token_id", tk.id)
          .maybeSingle();
        const fresh =
          cached?.generated_at &&
          Date.now() - new Date(cached.generated_at).getTime() < 6 * 3600 * 1000;
        if (cached && fresh) {
          setAiResumo({ summary: cached.summary, bullets: (cached.bullets as any) || [] });
        } else {
          supabase.functions
            .invoke("mari-resumo-empresa", { body: { token_id: tk.id } })
            .then(({ data }) => {
              if (data?.summary) setAiResumo({ summary: data.summary, bullets: data.bullets || [] });
            })
            .catch(() => {});
        }
      }
      const { data: u } = await supabase.auth.getUser();
      setAuthed(!!u.user);
      if (u.user && tk) {
        const { data: can } = await supabase.rpc("can_manage_company_stories", {
          _token_id: tk.id, _user_id: u.user.id,
        });
        setCanManageStories(!!can);
        const { count } = await supabase
          .from("company_stories")
          .select("id", { count: "exact", head: true })
          .eq("token_id", tk.id)
          .gt("expires_at", new Date().toISOString());
        setActiveStoriesCount(count || 0);
      }
      setLoading(false);
    })();
  }, [symbol]);

  if (loading) {
    return (
      <InvestirShell authed={authed} hideFooter>
        <Skeleton className="w-full aspect-[3/1] bg-graphite/40" />
        <div className="max-w-[1200px] mx-auto px-5 py-6 space-y-4">
          <Skeleton className="h-8 w-1/2 bg-graphite/40" />
          <Skeleton className="h-40 w-full bg-graphite/40 rounded-2xl" />
        </div>
      </InvestirShell>
    );
  }

  const seed = seedCompanies.find((s) => s.symbol === symbol);
  const company: CompanyMini | null = token
    ? {
        id: token.id, symbol: token.symbol, name: token.name,
        sector: listing?.category || token.sector,
        cover: sectorToCover(listing?.category || token.sector),
        avatar: sectorToCover(listing?.category || token.sector),
        founder: listing?.founder_name || "Equipe fundadora",
        city: [listing?.city, listing?.state].filter(Boolean).join("/") || "Brasil",
      }
    : seed || null;

  if (!company) {
    return (
      <InvestirShell authed={authed}>
        <div className="max-w-[1200px] mx-auto px-5 md:px-6 py-20 text-center">
          <h1 className="text-2xl text-bone mb-4">Empresa não encontrada</h1>
          <Link to="/investir/descobrir" className="text-volt hover:underline">← Ver todas</Link>
        </div>
      </InvestirShell>
    );
  }

  const pct = token?.total_offering_amount
    ? Math.min(100, (token.amount_raised / token.total_offering_amount) * 100)
    : 78;
  const isOpen = token?.status === "primary_open";
  const minTicket = token?.min_ticket || 100;
  const followers = 1842;
  const investors = 217;

  return (
    <InvestirShell authed={authed} hideFooter>
      <CompanyHero
        company={company}
        followers={followers}
        investors={investors}
        tokenId={token?.id}
        symbol={company.symbol}
      />

      {canManageStories && (
        <div className="max-w-[1100px] mx-auto px-5 md:px-6 mt-4">
          <Link
            to={`/investir/empresa/${company.symbol}/stories`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-volt/30 bg-gradient-to-r from-volt/10 via-volt/5 to-transparent px-4 py-3 hover:border-volt transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full grid place-items-center bg-volt text-carbon">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-bone font-semibold text-sm">
                  {activeStoriesCount > 0 ? `${activeStoriesCount} stories ativos` : "Publique seu primeiro story"}
                </div>
                <div className="text-bone/65 text-xs">
                  Espelhe os stories do Instagram aqui — ficam 24h no topo do feed.
                </div>
              </div>
            </div>
            <span className="text-volt text-sm font-medium">Gerenciar →</span>
          </Link>
        </div>
      )}

      <div className="max-w-[1100px] mx-auto px-5 md:px-6 pt-8 md:pt-10 pb-28 md:pb-16 grid lg:grid-cols-[1fr_340px] gap-6 md:gap-10">
        <div className="space-y-6">
          {/* 1. História */}
          <section className="bg-graphite/30 border border-bone/10 rounded-2xl p-5 md:p-6">
            <div className="text-[10px] uppercase tracking-wider text-volt mb-2">A história</div>
            <h2 className="text-bone font-semibold text-xl md:text-2xl mb-3 break-words">
              {listing?.description?.split(".")[0] || `${company.name} começou pequena. Hoje cresce de verdade.`}
            </h2>
            <p className="text-bone/75 text-sm md:text-base leading-relaxed break-words">
              {listing?.description ||
                `${company.name} é uma empresa brasileira que documenta a própria jornada na Mari. ` +
                "Acompanhe os bastidores, conheça o fundador e veja, atualização por atualização, como o negócio evolui."}
            </p>
          </section>

          {/* 2. Vídeo de apresentação (placeholder) */}
          <button className="relative w-full aspect-video rounded-2xl overflow-hidden border border-bone/10 group">
            <img src={company.cover} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-carbon/55 grid place-items-center">
              <PlayCircle className="w-16 h-16 text-bone group-hover:text-volt transition-colors" strokeWidth={1.2} />
            </div>
            <div className="absolute bottom-3 left-3 text-bone text-sm font-medium">Conheça o fundador</div>
          </button>

          {/* 3. Resumo IA */}
          <ResumoIA
            summary={
              aiResumo?.summary ||
              `${company.name} apresenta evolução consistente nos últimos meses, com crescimento de receita, governança auditada e comunicação ativa com a comunidade.`
            }
            bullets={
              aiResumo?.bullets && aiResumo.bullets.length > 0
                ? aiResumo.bullets
                : [
                    { label: "Mudanças", body: "Nova unidade inaugurada e time +60%." },
                    { label: "Indicadores", body: "Receita +41% e NPS estável em 78." },
                    { label: "Riscos", body: "Pressão de custo de insumos mitigada parcialmente." },
                  ]
            }
          />


          {/* 4. Timeline */}
          <TimelineMarcos items={seedTimeline} />

          {/* 5. Diário */}
          <DiarioFeed entries={seedDiario} />

          {/* 6. Indicadores / Score */}
          <ScoreMari eixos={seedScore} />

          {/* 7. Comentários */}
          <CommentsThread initial={seedComments} tokenId={token?.id || null} founderUserId={listing?.user_id || null} />

          {/* 8. Investir — sempre último */}
          <section id="investir" className="bg-gradient-to-br from-volt/10 to-transparent border border-volt/30 rounded-2xl p-6 md:p-8 text-center">
            <div className="text-[10px] uppercase tracking-wider text-volt mb-2">Tornar-se sócio</div>
            <h3 className="text-bone text-xl md:text-2xl font-semibold mb-2">
              Acompanhou. Aprendeu. Pronto pra entrar?
            </h3>
            <p className="text-bone/65 text-sm max-w-md mx-auto mb-5">
              A partir de <strong className="text-bone">{fmtBRL(minTicket)}</strong>, você se torna sócio
              de {company.name} pela infraestrutura regulada da Mari (CVM 88).
            </p>
            <button
              disabled={!token || !isOpen}
              onClick={() => setReserveOpen(true)}
              className="inline-flex items-center justify-center bg-volt hover:bg-volt/90 disabled:bg-bone/10 disabled:text-bone/40 text-carbon font-semibold px-8 py-3 rounded-full text-base transition-colors"
            >
              {token ? (isOpen ? `Investir a partir de ${fmtBRL(minTicket)}` : "Em breve") : "Em breve"}
            </button>
            <Link
              to="/investir/regulamentacao"
              className="block mt-3 text-bone/45 text-xs hover:text-volt"
            >
              Entenda como funciona a regulamentação
            </Link>
          </section>
        </div>

        {/* Sidebar Rodada */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <div className="bg-graphite/30 border border-bone/10 rounded-2xl p-5">
              <div className="text-[10px] uppercase tracking-wider text-volt mb-1">Rodada atual</div>
              <div className="text-3xl font-semibold text-bone tabular-nums mb-3">
                {pct.toFixed(0)}<span className="text-bone/35 text-lg">%</span>
              </div>
              <div className="h-2 bg-bone/10 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-volt" style={{ width: `${pct}%` }} />
              </div>
              {token?.total_offering_amount && (
                <div className="text-bone/65 text-xs">
                  <strong className="text-volt">{fmtBRL(token.amount_raised)}</strong> de {fmtBRL(token.total_offering_amount)}
                </div>
              )}
              <a
                href="#investir"
                className="block text-center mt-4 bg-volt hover:bg-volt/90 text-carbon font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Quero ser sócio
              </a>
            </div>

            <div className="bg-graphite/30 border border-bone/10 rounded-2xl p-5">
              <div className="text-bone font-medium text-sm mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-volt" /> Documentos
              </div>
              <ul className="space-y-2 text-xs text-bone/65">
                <li>Material da rodada</li>
                <li>Demonstrações</li>
                <li>Termo de adesão</li>
                <li>Política de riscos</li>
              </ul>
              <button className="mt-3 text-volt text-xs hover:underline">Acessar documentos →</button>
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky mobile CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-carbon/95 backdrop-blur-xl border-t border-bone/10 pb-[env(safe-area-inset-bottom)]">
        <div className="px-4 py-3 flex items-center gap-2">
          <Link
            to={`#investir`}
            className="flex-1 py-3 rounded-xl border border-bone/20 text-bone font-medium text-sm text-center"
          >
            Seguir conhecendo
          </Link>
          <button
            onClick={() => setReserveOpen(true)}
            disabled={!token || !isOpen}
            className="flex-[1.4] py-3 rounded-xl bg-volt disabled:bg-bone/10 disabled:text-bone/40 text-carbon font-semibold text-sm"
          >
            {token && isOpen ? `Quero ser sócio · ${fmtBRL(minTicket)}` : "Em breve"}
          </button>
        </div>
      </div>

      {token && <ReservationModal open={reserveOpen} onClose={() => setReserveOpen(false)} token={token} initialAmount={reservarParam > 0 ? Math.max(reservarParam, token.min_ticket || 0) : undefined} />}
    </InvestirShell>
  );
}
