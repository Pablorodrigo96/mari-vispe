import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  FileText,
  Shield,
  Building2,
  AlertTriangle,
  ChevronDown,
  TrendingUp,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { ReservationModal } from "@/components/investir/ReservationModal";
import { Skeleton } from "@/components/ui/skeleton";
import { sectorPhoto } from "@/lib/investirPhotos";

type Token = any;
type Listing = any;

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

const TABS = ["Sobre", "A oferta", "Documentos"] as const;

export default function InvestirAtivo() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [token, setToken] = useState<Token | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [tab, setTab] = useState<typeof TABS[number]>("Sobre");
  const [loading, setLoading] = useState(true);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    (async () => {
      const { data: tk } = await supabase.from("tokens").select("*").eq("symbol", symbol).maybeSingle();
      setToken(tk);
      if (tk?.listing_id) {
        const { data: l } = await supabase.from("listings").select("*").eq("id", tk.listing_id).maybeSingle();
        setListing(l);
      }
      const { data: ures } = await supabase.auth.getUser();
      setAuthed(!!ures?.user);
      setLoading(false);
    })();
  }, [symbol]);

  if (loading) {
    return (
      <InvestirShell authed={authed}>
        <div className="max-w-[1200px] mx-auto px-5 md:px-6 py-8">
          <Skeleton className="h-48 md:h-64 bg-graphite/40 rounded-2xl" />
          <Skeleton className="h-10 w-2/3 bg-graphite/40 mt-6" />
        </div>
      </InvestirShell>
    );
  }

  if (!token) {
    return (
      <InvestirShell authed={authed}>
        <div className="max-w-[1200px] mx-auto px-5 md:px-6 py-20 text-center">
          <h1 className="text-2xl text-bone mb-4">Empresa não encontrada</h1>
          <Link to="/investir/empresas" className="text-volt hover:underline">
            ← Ver todas
          </Link>
        </div>
      </InvestirShell>
    );
  }

  const pct = token.total_offering_amount ? Math.min(100, (token.amount_raised / token.total_offering_amount) * 100) : 0;
  const isOpen = token.status === "primary_open";
  const heroImg = sectorPhoto(token.sector || listing?.category || token.name);

  return (
    <InvestirShell authed={authed}>
      {/* Topbar mobile com voltar */}
      <div className="md:hidden sticky top-14 z-30 bg-carbon/95 backdrop-blur-xl border-b border-bone/10">
        <div className="px-4 h-12 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-bone/70 -ml-2 p-2" aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-[13px] text-bone font-mono">{token.symbol}</div>
          <button className="text-bone/70 -mr-2 p-2" aria-label="Compartilhar">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-carbon pb-28 md:pb-0">
        {/* HERO */}
        <div className="relative">
          <div className="relative aspect-[16/9] md:aspect-auto md:h-72 overflow-hidden bg-graphite">
            <img src={heroImg} alt={token.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/40 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-5 md:p-6">
              <div className="max-w-[1200px] mx-auto">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-semibold ${isOpen ? "bg-volt text-carbon" : "bg-bone/15 text-bone/80 backdrop-blur"}`}>
                    {isOpen ? "● Aberta" : "Em breve"}
                  </span>
                  {listing?.category && <span className="text-[10px] uppercase tracking-wider text-bone/70">{listing.category}</span>}
                </div>
                <h1 className="text-2xl md:text-4xl font-semibold text-bone leading-tight break-words">
                  {token.name}
                </h1>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-5 md:px-6 pt-6 md:grid md:grid-cols-[1fr_360px] md:gap-10">
          <div>
            <p className="text-bone/70 leading-relaxed text-sm md:text-base">
              {listing?.description?.split(".")[0] || `Invista em ${token.name} a partir de ${fmtBRL(token.min_ticket)}.`}
            </p>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <Kpi label="Por cota" value={fmtBRL(token.initial_price)} />
              <Kpi label="A partir de" value={fmtBRL(token.min_ticket)} />
              <Kpi label="Captado" value={`${pct.toFixed(0)}%`} />
              <Kpi
                label="Status"
                value={isOpen ? "Aberta" : "Em breve"}
                tone={isOpen ? "volt" : "muted"}
              />
            </div>

            {/* Barra de progresso */}
            {token.total_offering_amount && (
              <div className="mt-5">
                <div className="flex justify-between text-[11px] text-bone/50 mb-1.5">
                  <span>
                    <strong className="text-volt">{fmtBRL(token.amount_raised)}</strong> de {fmtBRL(token.total_offering_amount)}
                  </span>
                  <span>{pct.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-graphite rounded-full overflow-hidden">
                  <div className="h-full bg-volt transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            {/* TABS */}
            <div className="mt-8 border-b border-bone/10 flex gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap font-medium ${
                    tab === t ? "border-volt text-volt" : "border-transparent text-bone/55 hover:text-bone"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="py-6 md:py-8">
              {tab === "Sobre" && <About token={token} listing={listing} />}
              {tab === "A oferta" && <Offering token={token} />}
              {tab === "Documentos" && <Documents token={token} />}
            </div>
          </div>

          {/* BOLETA desktop */}
          <aside className="hidden md:block">
            <div className="sticky top-20 bg-carbon/80 border border-bone/10 rounded-2xl p-5 backdrop-blur-xl space-y-4">
              <div className="text-[10px] uppercase tracking-wider text-bone/40">A partir de</div>
              <div className="text-3xl font-semibold text-bone tabular-nums">{fmtBRL(token.min_ticket)}</div>
              <button
                disabled={!isOpen}
                onClick={() => setReserveOpen(true)}
                className="w-full bg-volt hover:bg-volt/90 disabled:bg-bone/10 disabled:text-bone/40 text-carbon font-semibold py-3.5 rounded-xl transition-colors text-base"
              >
                {isOpen ? "Comprar cotas" : "Indisponível"}
              </button>
              <button
                disabled
                className="w-full border border-bone/20 text-bone/60 font-semibold py-3 rounded-xl text-sm"
                title="Disponível após emissão"
              >
                Vender (em breve)
              </button>
              <div className="text-[10px] text-bone/40 leading-relaxed text-center pt-2 border-t border-bone/10">
                Sujeito a cadastro e confirmação de identidade.
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* STICKY BOLETA MOBILE (Comprar/Vender) - estilo XP */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-carbon/95 backdrop-blur-xl border-t border-bone/10 pb-[env(safe-area-inset-bottom)]">
        <div className="px-4 py-3 flex items-center gap-2">
          <button
            disabled
            className="flex-1 py-3.5 rounded-xl border border-bone/20 text-bone/60 font-semibold text-sm"
            title="Disponível após emissão"
          >
            Vender
          </button>
          <button
            disabled={!isOpen}
            onClick={() => setReserveOpen(true)}
            className="flex-[1.4] py-3.5 rounded-xl bg-volt disabled:bg-bone/10 disabled:text-bone/40 text-carbon font-semibold text-sm"
          >
            {isOpen ? `Comprar · ${fmtBRL(token.min_ticket)}` : "Em breve"}
          </button>
        </div>
      </div>

      <ReservationModal open={reserveOpen} onClose={() => setReserveOpen(false)} token={token} />
    </InvestirShell>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "volt" | "muted" }) {
  return (
    <div className="bg-graphite/40 border border-bone/10 rounded-xl p-3.5">
      <div className="text-[10px] uppercase tracking-wider text-bone/40">{label}</div>
      <div className={`text-base md:text-lg font-semibold tabular-nums mt-1 ${tone === "volt" ? "text-volt" : tone === "muted" ? "text-bone/60" : "text-bone"}`}>
        {value}
      </div>
    </div>
  );
}

function About({ token, listing }: { token: Token; listing: Listing }) {
  return (
    <div className="space-y-4">
      <Block title="O que é a empresa" icon={Building2}>
        <p className="text-bone/75 leading-relaxed text-sm">
          {listing?.description || `${token.name} é uma empresa privada disponível para investimento na plataforma.`}
        </p>
      </Block>

      {listing && (
        <div className="grid grid-cols-2 gap-3">
          {listing.category && <MiniFact label="Setor" value={listing.category} />}
          {listing.foundation_year && <MiniFact label="Fundada em" value={String(listing.foundation_year)} />}
          {listing.annual_revenue && <MiniFact label="Receita anual" value={fmtBRL(Number(listing.annual_revenue))} />}
          {(listing.city || listing.state) && (
            <MiniFact label="Localização" value={[listing.city, listing.state].filter(Boolean).join(" / ")} />
          )}
        </div>
      )}

      <Block title="Por que investir" icon={TrendingUp}>
        <p className="text-bone/75 leading-relaxed text-sm">
          {token.metadata?.thesis ||
            "Empresa selecionada pela curadoria da plataforma. Tese completa nos documentos da oferta."}
        </p>
      </Block>
    </div>
  );
}

function Offering({ token }: { token: Token }) {
  const [showTech, setShowTech] = useState(false);
  return (
    <div className="space-y-3">
      <Block title="O que você recebe" icon={CheckCircle2}>
        <p className="text-bone/75 leading-relaxed text-sm">
          {token.economic_rights ||
            "Cotas que representam participação econômica na empresa, conforme o contrato da oferta."}
        </p>
      </Block>

      <Block title="Como o retorno funciona" icon={TrendingUp}>
        <p className="text-bone/75 leading-relaxed text-sm">
          O retorno pode vir da valorização da cota, recompra pela empresa ou distribuição de resultados.
        </p>
      </Block>

      <Block title="Liquidez" icon={Shield}>
        <p className="text-bone/75 leading-relaxed text-sm">
          {token.expected_liquidity ||
            "Empresas privadas têm liquidez limitada. Venda em janelas específicas ou quando houver comprador."}
        </p>
      </Block>

      <Accordion title="Riscos" icon={AlertTriangle}>
        <ul className="space-y-2 text-sm text-bone/70 leading-relaxed">
          <li>• Risco de perda total do valor investido.</li>
          <li>• Liquidez limitada.</li>
          <li>• Sujeito a restrições regulatórias.</li>
          <li>• Rentabilidade passada não garante retorno futuro.</li>
        </ul>
      </Accordion>

      <button
        type="button"
        onClick={() => setShowTech((s) => !s)}
        className="text-xs text-bone/50 hover:text-bone flex items-center gap-1.5 pt-2"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTech ? "rotate-180" : ""}`} />
        Detalhes técnicos
      </button>
      {showTech && (
        <div className="grid grid-cols-2 gap-2 pt-2">
          {[
            ["Instrumento", token.legal_instrument || token.instrument_type],
            ["Supply total", token.total_supply ? Intl.NumberFormat("pt-BR").format(token.total_supply) : "—"],
            ["Em circulação", token.circulating_supply ? Intl.NumberFormat("pt-BR").format(token.circulating_supply) : "—"],
            ["Rede", token.blockchain_network || "Custódia da plataforma"],
          ].map(([k, v]) => (
            <div key={k} className="bg-graphite/30 border border-bone/10 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-bone/40">{k}</div>
              <div className="text-xs text-bone/80 mt-1 break-words">{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Documents({ token }: { token: Token }) {
  const docs = Array.isArray(token.documents) ? token.documents : [];
  if (!docs.length) {
    return (
      <div className="border border-dashed border-bone/15 rounded-xl p-8 text-center">
        <FileText className="w-6 h-6 text-bone/40 mx-auto mb-2" />
        <div className="text-bone/60 text-sm">Documentos serão publicados antes do início da oferta.</div>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-bone/10 border border-bone/10 rounded-xl">
      {docs.map((d: any, i: number) => (
        <li key={i} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-4 h-4 text-volt shrink-0" />
            <div className="min-w-0">
              <div className="text-sm text-bone truncate">{d.name || "Documento"}</div>
            </div>
          </div>
          {d.url && (
            <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-volt hover:underline shrink-0">
              Abrir
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function Block({ title, icon: Icon, children }: any) {
  return (
    <div className="bg-graphite/30 border border-bone/10 rounded-xl p-4 md:p-5">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className="w-4 h-4 text-volt" />
        <div className="font-semibold text-bone text-sm">{title}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Accordion({ title, icon: Icon, children }: any) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-graphite/30 border border-bone/10 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-bone/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-amber-300" />
          <div className="font-semibold text-bone text-sm">{title}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-bone/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 md:px-5 pb-4 md:pb-5">{children}</div>}
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-graphite/30 border border-bone/10 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-bone/40">{label}</div>
      <div className="text-sm text-bone mt-1 break-words">{value}</div>
    </div>
  );
}
