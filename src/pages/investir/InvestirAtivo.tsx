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
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { ReservationModal } from "@/components/investir/ReservationModal";
import { Skeleton } from "@/components/ui/skeleton";

type Token = any;
type Listing = any;

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

const TABS = ["Sobre a empresa", "A oferta", "Documentos"] as const;

export default function InvestirAtivo() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [token, setToken] = useState<Token | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [tab, setTab] = useState<typeof TABS[number]>("Sobre a empresa");
  const [loading, setLoading] = useState(true);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [wallet, setWallet] = useState<number | null>(null);
  const [quickAmount, setQuickAmount] = useState<number>(0);

  useEffect(() => {
    if (!symbol) return;
    (async () => {
      const { data: tk } = await supabase.from("tokens").select("*").eq("symbol", symbol).maybeSingle();
      setToken(tk);
      if (tk) setQuickAmount(Number(tk.min_ticket || 100));
      if (tk?.listing_id) {
        const { data: l } = await supabase.from("listings").select("*").eq("id", tk.listing_id).maybeSingle();
        setListing(l);
      }
      const { data: ures } = await supabase.auth.getUser();
      if (ures?.user) {
        const { data: w } = await supabase.from("financial_wallets").select("available_balance").eq("user_id", ures.user.id).maybeSingle();
        if (w) setWallet(Number(w.available_balance));
      }
      setLoading(false);
    })();
  }, [symbol]);

  if (loading) {
    return (
      <InvestirShell>
        <div className="max-w-[1200px] mx-auto px-6 py-12">
          <Skeleton className="h-12 w-2/3 bg-graphite/40" />
          <Skeleton className="h-64 mt-6 bg-graphite/40" />
        </div>
      </InvestirShell>
    );
  }

  if (!token) {
    return (
      <InvestirShell>
        <div className="max-w-[1200px] mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl text-bone mb-4">Empresa não encontrada</h1>
          <Link to="/investir/empresas" className="text-volt hover:underline">← Ver todas as empresas</Link>
        </div>
      </InvestirShell>
    );
  }

  const pct = token.total_offering_amount ? Math.min(100, (token.amount_raised / token.total_offering_amount) * 100) : 0;
  const isOpen = token.status === "primary_open";
  const price = Number(token.initial_price || 1);
  const qty = quickAmount / price;

  return (
    <InvestirShell>
      <div className="border-b border-bone/10 bg-graphite/20">
        <div className="max-w-[1200px] mx-auto px-6 py-3">
          <button onClick={() => navigate(-1)} className="text-xs text-bone/50 hover:text-bone flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Voltar
          </button>
        </div>
      </div>

      {/* HERO simplificado */}
      <section className="border-b border-bone/10">
        <div className="max-w-[1200px] mx-auto px-6 py-10 grid lg:grid-cols-[1fr_360px] gap-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full ${
                isOpen ? "bg-volt/15 text-volt" : "bg-bone/10 text-bone/60"
              }`}>
                {isOpen ? "Oferta aberta" : "Em breve"}
              </span>
              {listing?.category && (
                <span className="text-[11px] uppercase tracking-wider text-bone/50">{listing.category}</span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold text-bone tracking-tight leading-tight break-words">
              {token.name}
            </h1>
            <p className="mt-3 text-bone/65 leading-relaxed max-w-2xl">
              {listing?.description?.split(".")[0] || `Invista em ${token.name} a partir de ${fmtBRL(token.min_ticket)}.`}
            </p>

            <div className="grid grid-cols-3 gap-6 mt-8 max-w-md">
              <Big label="Preço por cota" value={fmtBRL(token.initial_price)} />
              <Big label="A partir de" value={fmtBRL(token.min_ticket)} />
              <Big label="Já captado" value={`${pct.toFixed(0)}%`} />
            </div>

            {/* TABS */}
            <div className="mt-10 border-b border-bone/10 flex gap-1 overflow-x-auto">
              {TABS.map(t => (
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

            <div className="py-8">
              {tab === "Sobre a empresa" && <About token={token} listing={listing} />}
              {tab === "A oferta" && <Offering token={token} />}
              {tab === "Documentos" && <Documents token={token} />}
            </div>
          </div>

          {/* BOLETA estilo Rico */}
          <aside>
            <div className="sticky top-20 bg-carbon/80 border border-bone/10 rounded-2xl p-5 backdrop-blur-xl space-y-4">
              {wallet !== null && (
                <div className="flex items-center justify-between bg-graphite/40 border border-bone/10 rounded-xl px-3 py-2.5">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-bone/40">Saldo</div>
                    <div className="text-sm font-semibold text-bone tabular-nums">{fmtBRL(wallet)}</div>
                  </div>
                  <Link to="/investir/carteira" className="text-[11px] text-volt hover:underline">
                    + Adicionar
                  </Link>
                </div>
              )}

              <div>
                <label className="text-xs uppercase tracking-wider text-bone/50 mb-2 block">
                  Quanto quero investir
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bone/50 text-sm">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={quickAmount.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      setQuickAmount(raw ? Number(raw) : 0);
                    }}
                    className="w-full bg-graphite/40 border border-bone/10 rounded-lg py-3 pl-10 pr-3 text-xl font-semibold text-bone tabular-nums focus:border-volt/50 focus:outline-none"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[100, 500, 1000].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setQuickAmount(a => a + v)}
                      className="px-2.5 py-1 text-[11px] bg-bone/5 hover:bg-volt/15 hover:text-volt border border-bone/10 rounded-full text-bone/70 transition-colors"
                    >
                      +R${v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-volt/5 border border-volt/20 rounded-lg px-3 py-2.5">
                <div className="text-[11px] text-bone/60">Você recebe</div>
                <div className="text-lg font-semibold text-bone tabular-nums">
                  {qty.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}{" "}
                  <span className="text-xs text-bone/60 font-normal">cotas</span>
                </div>
              </div>

              <button
                disabled={!isOpen || quickAmount < (token.min_ticket || 0)}
                onClick={() => setReserveOpen(true)}
                className="w-full bg-volt hover:bg-volt/90 disabled:bg-bone/10 disabled:text-bone/40 text-carbon font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
              >
                <Wallet className="w-4 h-4" />
                {isOpen ? "Investir agora" : "Indisponível"}
              </button>

              {quickAmount < (token.min_ticket || 0) && (
                <div className="text-[11px] text-amber-300/80 text-center">
                  Mínimo: {fmtBRL(token.min_ticket)}
                </div>
              )}

              <div className="text-[10px] text-bone/40 leading-relaxed text-center pt-1 border-t border-bone/10">
                Sujeito a cadastro e confirmação de identidade.
              </div>
            </div>
          </aside>
        </div>
      </section>

      <ReservationModal open={reserveOpen} onClose={() => setReserveOpen(false)} token={token} />
    </InvestirShell>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-bone/40">{label}</div>
      <div className="text-2xl font-semibold text-bone tabular-nums mt-1">{value}</div>
    </div>
  );
}

function About({ token, listing }: { token: Token; listing: Listing }) {
  return (
    <div className="space-y-6">
      <Block title="O que é a empresa" icon={Building2}>
        <p className="text-bone/75 leading-relaxed">
          {listing?.description || `${token.name} é uma empresa privada disponível para investimento na plataforma.`}
        </p>
      </Block>

      {listing && (
        <div className="grid sm:grid-cols-2 gap-3">
          {listing.category && <MiniFact label="Setor" value={listing.category} />}
          {listing.foundation_year && <MiniFact label="Fundada em" value={String(listing.foundation_year)} />}
          {listing.annual_revenue && <MiniFact label="Receita anual" value={fmtBRL(Number(listing.annual_revenue))} />}
          {(listing.city || listing.state) && (
            <MiniFact label="Localização" value={[listing.city, listing.state].filter(Boolean).join(" / ")} />
          )}
        </div>
      )}

      <Block title="Por que investir" icon={TrendingUp}>
        <p className="text-bone/75 leading-relaxed">
          {token.metadata?.thesis ||
            "Empresa selecionada pela curadoria da plataforma. Detalhes completos da tese de investimento estão nos documentos da oferta."}
        </p>
      </Block>
    </div>
  );
}

function Offering({ token }: { token: Token }) {
  const [showTech, setShowTech] = useState(false);
  return (
    <div className="space-y-4">
      <Block title="O que você recebe" icon={CheckCircle2}>
        <p className="text-bone/75 leading-relaxed text-sm">
          {token.economic_rights ||
            "Cotas que representam participação econômica na empresa, conforme o contrato da oferta. Os direitos completos estão descritos nos documentos."}
        </p>
      </Block>

      <Block title="Como o retorno funciona" icon={TrendingUp}>
        <p className="text-bone/75 leading-relaxed text-sm">
          O retorno pode vir da valorização da cota ao longo do tempo, de eventos como recompra
          pela empresa, ou de distribuição de resultados — quando previsto no contrato.
        </p>
      </Block>

      <Block title="Liquidez" icon={Shield}>
        <p className="text-bone/75 leading-relaxed text-sm">
          {token.expected_liquidity ||
            "Empresas privadas têm liquidez limitada. A venda pode acontecer em janelas específicas ou quando houver comprador interessado."}
        </p>
      </Block>

      {/* RISCOS — accordion */}
      <Accordion title="Riscos" icon={AlertTriangle}>
        <ul className="space-y-2 text-sm text-bone/70 leading-relaxed">
          <li>• Risco de perda total do valor investido.</li>
          <li>• Liquidez limitada — pode ser difícil vender quando você quiser.</li>
          <li>• A operação pode estar sujeita a restrições regulatórias.</li>
          <li>• Rentabilidade passada ou projetada não garante retorno futuro.</li>
        </ul>
      </Accordion>

      {/* DETALHES TÉCNICOS — escondido por padrão */}
      <button
        type="button"
        onClick={() => setShowTech(s => !s)}
        className="text-xs text-bone/50 hover:text-bone flex items-center gap-1.5 pt-2"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTech ? "rotate-180" : ""}`} />
        Detalhes técnicos da emissão
      </button>
      {showTech && (
        <div className="grid sm:grid-cols-2 gap-2 pt-2">
          {[
            ["Instrumento jurídico", token.legal_instrument || token.instrument_type],
            ["Supply total", token.total_supply ? Intl.NumberFormat("pt-BR").format(token.total_supply) : "—"],
            ["Em circulação", token.circulating_supply ? Intl.NumberFormat("pt-BR").format(token.circulating_supply) : "—"],
            ["Token standard", token.token_standard || "—"],
            ["Rede", token.blockchain_network || "Custódia da plataforma"],
            ["Restrições", token.eligibility_restrictions || "Conforme suitability"],
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
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-volt" />
            <div>
              <div className="text-sm text-bone">{d.name || "Documento"}</div>
              {d.hash && <div className="text-[10px] font-mono text-bone/40">{d.hash.slice(0, 16)}…</div>}
            </div>
          </div>
          {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-volt hover:underline">Abrir</a>}
        </li>
      ))}
    </ul>
  );
}

function Block({ title, icon: Icon, children }: any) {
  return (
    <div className="bg-graphite/30 border border-bone/10 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
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
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 hover:bg-bone/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-amber-300" />
          <div className="font-semibold text-bone text-sm">{title}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-bone/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
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
