import { Outlet, Link, useLocation, NavLink } from "react-router-dom";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Shield, ChevronRight, Sparkles } from "lucide-react";

const nav = [
  { to: "/investir/empresas", label: "Empresas" },
  { to: "/investir/como-funciona", label: "Como funciona" },
  { to: "/investir/riscos", label: "Riscos" },
];

const authedNav = [
  { to: "/investir/painel", label: "Painel" },
  { to: "/investir/carteira", label: "Carteira" },
  { to: "/investir/reservas", label: "Reservas" },
];

export function InvestirHeader({ authed }: { authed?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-bone/10 bg-carbon/90 backdrop-blur-xl">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center gap-8">
        <Link to="/investir" className="flex items-center gap-2 font-semibold tracking-tight text-bone">
          <div className="w-7 h-7 rounded-md bg-volt grid place-items-center">
            <span className="text-carbon font-black text-sm">m</span>
          </div>
          <span className="text-[15px]">mari<span className="text-volt">.</span>invest</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {(authed ? authedNav : nav).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  "px-3 py-1.5 rounded-md transition-colors",
                  isActive ? "bg-bone/10 text-bone" : "text-bone/60 hover:text-bone hover:bg-bone/5"
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {!authed ? (
            <>
              <Link to="/investir/auth" className="text-sm text-bone/70 hover:text-bone px-3 py-1.5">
                Entrar
              </Link>
              <Link
                to="/investir/auth?mode=signup"
                className="text-sm bg-volt hover:bg-volt/90 text-carbon font-medium px-3.5 py-1.5 rounded-md transition-colors"
              >
                Criar conta
              </Link>
            </>
          ) : (
            <Link to="/investir/carteira" className="text-xs text-bone/60 hover:text-bone">
              Minha carteira <ChevronRight className="inline w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function DisclaimerBar() {
  return (
    <div className="border-t border-bone/10 bg-graphite/40 text-[11px] text-bone/50 leading-relaxed">
      <div className="max-w-[1400px] mx-auto px-6 py-3 flex flex-wrap gap-x-6 gap-y-1">
        <span><Shield className="inline w-3 h-3 mr-1 text-volt/70" />Plataforma regulada</span>
        <span>• Investimentos em empresas privadas envolvem risco de perda total do capital</span>
        <span>• Ativos privados podem ter baixa liquidez</span>
        <span>• Rentabilidade passada ou projetada não representa garantia de retorno</span>
        <span>• Leia os documentos da oferta antes de investir</span>
      </div>
    </div>
  );
}

export function InvestirFooter() {
  return (
    <footer className="border-t border-bone/10 bg-carbon mt-16">
      <div className="max-w-[1400px] mx-auto px-6 py-10 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 font-semibold text-bone mb-3">
            <div className="w-6 h-6 rounded bg-volt grid place-items-center">
              <span className="text-carbon font-black text-xs">m</span>
            </div>
            mari.invest
          </div>
          <p className="text-bone/50 text-xs leading-relaxed">
            Plataforma regulada para acesso a ativos privados tokenizados. Empresas reais,
            ambiente seguro, transparência total.
          </p>
        </div>
        <FooterCol title="Investir" links={[
          ["Empresas", "/investir/empresas"],
          ["Como funciona", "/investir/como-funciona"],
          ["Tokenização", "/investir/como-funciona#tokenizacao"],
        ]} />
        <FooterCol title="Compliance" links={[
          ["Riscos", "/investir/riscos"],
          ["Termos", "/terms"],
          ["Privacidade", "/terms#privacidade"],
        ]} />
        <FooterCol title="Conta" links={[
          ["Entrar", "/investir/auth"],
          ["Criar conta", "/investir/auth?mode=signup"],
        ]} />
      </div>
      <DisclaimerBar />
      <div className="border-t border-bone/10 py-4 text-center text-[11px] text-bone/40">
        © {new Date().getFullYear()} mari · Grupo Vispe. Todos os direitos reservados.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-bone font-medium text-xs uppercase tracking-wider mb-3">{title}</div>
      <ul className="space-y-2">
        {links.map(([label, to]) => (
          <li key={to}>
            <Link to={to} className="text-bone/60 hover:text-volt text-sm transition-colors">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InvestirShell({ authed = false, children }: { authed?: boolean; children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-carbon text-bone flex flex-col">
      <InvestirHeader authed={authed} />
      <main className="flex-1">
        {children ?? <Outlet />}
      </main>
      <InvestirFooter />
    </div>
  );
}

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-volt/90 font-medium">
      <Sparkles className="w-3 h-3" />
      {children}
    </div>
  );
}
