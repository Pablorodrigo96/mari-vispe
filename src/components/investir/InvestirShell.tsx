import { Outlet, Link, NavLink } from "react-router-dom";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Shield, ChevronRight, Sparkles, Sun, Moon } from "lucide-react";
import { BottomTabBar } from "./BottomTabBar";
import { MariThemeProvider, useMariTheme } from "@/contexts/MariThemeContext";

function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useMariTheme();
  return (
    <div
      role="group"
      aria-label="Tema"
      className={cn(
        "inline-flex items-center rounded-full p-0.5 border border-bone/15 bg-bone/5",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors",
          theme === "dark"
            ? "bg-bone text-carbon"
            : "text-bone/65 hover:text-bone",
        )}
      >
        <Moon className="w-3 h-3" />
        <span className="hidden sm:inline">Escuro</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors",
          theme === "light"
            ? "bg-bone text-carbon"
            : "text-bone/65 hover:text-bone",
        )}
      >
        <Sun className="w-3 h-3" />
        <span className="hidden sm:inline">Claro</span>
      </button>
    </div>
  );
}



const nav = [
  { to: "/investir/descobrir", label: "Descobrir" },
  { to: "/investir/ligas", label: "Ligas" },
  { to: "/investir/lives", label: "Lives" },
  { to: "/investir/sobre-a-mari", label: "Sobre" },
];

const authedNav = [
  { to: "/investir/painel", label: "Painel" },
  { to: "/investir/carteira", label: "Carteira" },
  { to: "/investir/reservas", label: "Reservas" },
];

export function InvestirHeader({ authed }: { authed?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-bone/10 bg-carbon/90 backdrop-blur-xl">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center gap-4 md:gap-8">
        <Link
          to={authed ? "/investir/painel" : "/investir"}
          className="flex items-center gap-2 font-semibold tracking-tight text-bone"
        >
          <div className="keep-volt w-7 h-7 rounded-md bg-volt grid place-items-center">
            <span className="text-carbon font-black text-sm">m</span>
          </div>
          <span className="text-[15px]">
            mari<span className="keep-volt text-volt">.</span>invest
          </span>

        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {(authed ? authedNav : nav).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  "px-3 py-1.5 rounded-md transition-colors",
                  isActive ? "bg-bone/10 text-bone" : "text-bone/60 hover:text-bone hover:bg-bone/5",
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {!authed ? (
            <>
              <Link
                to="/investir/auth"
                className="text-sm text-bone/70 hover:text-bone px-2.5 md:px-3 py-1.5"
              >
                Entrar
              </Link>
              <Link
                to="/investir/auth?mode=signup"
                className="text-sm bg-volt hover:bg-volt/90 text-carbon font-semibold px-3 md:px-3.5 py-1.5 rounded-md transition-colors"
              >
                Criar conta
              </Link>
            </>
          ) : (
            <Link
              to="/investir/carteira"
              className="text-xs text-bone/60 hover:text-bone hidden md:inline-flex items-center"
            >
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
      <div className="max-w-[1400px] mx-auto px-5 md:px-6 py-3 flex flex-wrap gap-x-6 gap-y-1">
        <span>
          <Shield className="inline w-3 h-3 mr-1 text-volt/70" />
          Plataforma regulada
        </span>
        <span className="hidden md:inline">• Investimentos em empresas privadas envolvem risco de perda total</span>
        <span className="hidden md:inline">• Ativos privados podem ter baixa liquidez</span>
        <span className="md:hidden">• Risco de perda total. Leia os documentos da oferta.</span>
      </div>
    </div>
  );
}

export function InvestirFooter() {
  return (
    <footer className="border-t border-bone/10 bg-carbon mt-16">
      <div className="max-w-[1400px] mx-auto px-5 md:px-6 py-12 grid grid-cols-2 md:grid-cols-6 gap-8 text-sm">
        <div className="col-span-2 md:col-span-2">
          <div className="flex items-center gap-2 font-semibold text-bone mb-3">
            <div className="w-6 h-6 rounded bg-volt grid place-items-center">
              <span className="text-carbon font-black text-xs">m</span>
            </div>
            mari.invest
          </div>
          <p className="text-bone/50 text-xs leading-relaxed max-w-xs">
            Plataforma regulada para acesso a ativos privados tokenizados. Parte do Grupo Vispe.
          </p>
        </div>
        <FooterCol
          title="Sobre"
          links={[
            ["A mari", "/investir/sobre/a-mari"],
            ["Quem somos", "/investir/sobre/quem-somos"],
            ["Vantagens", "/investir/sobre/vantagens"],
            ["Carreiras", "/investir/carreiras"],
            ["Blog", "/investir/blog"],
          ]}
        />
        <FooterCol
          title="Produtos"
          links={[
            ["Investimentos", "/investir/produtos/investimentos"],
            ["Simulador", "/investir/produtos/simulador"],
            ["App mari", "/investir/ferramentas/app"],
            ["Home Broker", "/investir/ferramentas/home-broker"],
            ["Cartão (em breve)", "/investir/servicos/cartao"],
          ]}
        />
        <FooterCol
          title="Ajuda"
          links={[
            ["Central de atendimento", "/investir/ajuda"],
            ["Dicionário", "/investir/ajuda/dicionario"],
            ["Custos", "/investir/custos"],
            ["Como funciona", "/investir/como-funciona"],
            ["Riscos", "/investir/riscos"],
          ]}
        />
        <FooterCol
          title="Atendimento"
          links={[
            ["Ouvidoria", "/investir/atendimento/ouvidoria"],
            ["RMP", "/investir/atendimento/rmp"],
            ["CVM", "/investir/atendimento/cvm"],
            ["Regulamentação", "/investir/regulamentacao"],
            ["Privacidade", "/investir/politicas/privacidade"],
            ["Cookies", "/investir/politicas/cookies"],
          ]}
        />
      </div>
      <DisclaimerBar />
      <div className="border-t border-bone/10 py-4 text-center text-[11px] text-bone/40">
        © {new Date().getFullYear()} mari · Grupo Vispe. Plataforma regulada pela CVM 88.
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
            <Link to={to} className="text-bone/60 hover:text-volt text-sm transition-colors">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InvestirShellInner({
  authed,
  children,
  hideFooter,
}: {
  authed?: boolean;
  children?: ReactNode;
  hideFooter?: boolean;
}) {
  const { theme } = useMariTheme();
  return (
    <div className={cn("min-h-screen bg-carbon text-bone flex flex-col", theme === "light" && "mari-light")}>
      <InvestirHeader authed={authed} />
      <main className="flex-1 pb-20 md:pb-0">
        {children ?? <Outlet />}
      </main>
      {!hideFooter && <InvestirFooter />}
      <BottomTabBar />
    </div>
  );
}

export function InvestirShell({
  authed = false,
  children,
  hideFooter = false,
}: {
  authed?: boolean;
  children?: ReactNode;
  hideFooter?: boolean;
}) {
  return (
    <MariThemeProvider>
      <InvestirShellInner authed={authed} hideFooter={hideFooter}>
        {children}
      </InvestirShellInner>
    </MariThemeProvider>
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
