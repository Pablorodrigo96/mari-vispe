import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Target, Users, Lightbulb, PhoneCall, Map as MapIcon, Network, ArrowLeft, LogOut, LineChart, Sparkles, Brain, Briefcase, ArrowLeftRight, Upload, Wifi, BarChart3, Zap, Newspaper, ShieldAlert, Activity, UserCog, Flame, TrendingUp, FileSignature, Handshake, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { MariLogo } from "@/components/brand/MariLogo";
import { useMatchPercentiles, useMatchInbox } from "@/hooks/useMatchInbox";
import { useUserRoles } from "@/hooks/useUserRoles";

const items = [
  { to: "/equity-brain",                label: "Dashboard",       Icon: LayoutDashboard, end: true },
  { to: "/equity-brain/match-inbox",    label: "Match Inbox",     Icon: ArrowLeftRight, badge: "matches" as const },
  { to: "/equity-brain/crm",            label: "CRM",             Icon: Briefcase },
  { to: "/equity-brain/crm/minhas-empresas", label: "Minhas Empresas", Icon: Briefcase },
  { to: "/equity-brain/news",           label: "Notícias M&A",    Icon: Newspaper },
  { to: "/equity-brain/board",          label: "Board Executivo", Icon: LineChart },
  { to: "/equity-brain/oportunidades",  label: "Oportunidades",   Icon: Target },
  { to: "/equity-brain/mapa",           label: "Mapa",            Icon: MapIcon },
  { to: "/equity-brain/grafo",          label: "Grafo 2D",        Icon: Network },
  { to: "/equity-brain/grafo-jarvis",   label: "Jarvis 3D",       Icon: Brain },
  { to: "/equity-brain/buyers",         label: "Buyers",          Icon: Users },
  { to: "/equity-brain/teses",          label: "Teses",           Icon: Lightbulb },
  { to: "/equity-brain/calls",          label: "Calls",           Icon: PhoneCall },
  { to: "/equity-brain/shadow",         label: "Shadow v1↔v2",    Icon: Sparkles },
];

const dashboardItems = [
  { to: "/equity-brain/dashboard/executivo", label: "Executivo M&A", Icon: TrendingUp },
  { to: "/equity-brain/dashboard/mandato",   label: "Mandatos",      Icon: Briefcase },
  { to: "/equity-brain/dashboard/match",     label: "Matching",      Icon: ArrowLeftRight },
  { to: "/equity-brain/dashboard/nbo",       label: "NBO",           Icon: FileSignature },
];

const dataItems = [
  { to: "/equity-brain/crm/imports",                 label: "Imports",         Icon: Upload },
  { to: "/equity-brain/crm/admin/auditoria-operacional", label: "Auditoria CRM", Icon: ShieldAlert },
  { to: "/equity-brain/crm/admin/atribuicoes",       label: "Atribuições",     Icon: UserCog },
  { to: "/equity-brain/admin/health",                label: "Health 24h",      Icon: Activity },
  { to: "/equity-brain/isp/import",                  label: "ISP Anatel",      Icon: Wifi },
  { to: "/equity-brain/isp/sugestoes",               label: "ISP Sugestões",   Icon: Zap },
  { to: "/equity-brain/isp/mercado",                 label: "ISP Mercado",     Icon: BarChart3 },
];

export function EBSidebar() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { data: pcts } = useMatchPercentiles();
  const { data: hotMatches = [] } = useMatchInbox({ minScore: pcts?.hot ?? 70, limit: 200 });
  const hotCount = hotMatches.length;
  const { roles } = useUserRoles();
  const canSeeData = roles.includes("admin") || roles.includes("advisor");

  return (
    <aside className="w-60 shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col">
      <div className="px-5 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <MariLogo variant="symbol-dark" size={56} />
          <div>
            <div className="text-zinc-100 text-base font-bold leading-none">Equity Brain</div>
            <div className="text-zinc-500 text-[11px] mt-1">by mari · Vispe Capital</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Tela Hoje — destaque Volt no topo da sidebar */}
        <NavLink
          to="/equity-brain/hoje"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all mb-2",
              isActive
                ? "bg-[#D9F564] text-zinc-900 shadow-[0_0_20px_-5px_rgba(217,245,100,0.6)]"
                : "bg-zinc-900 text-[#D9F564] border border-[#D9F564]/30 hover:bg-zinc-800 hover:border-[#D9F564]/60",
            )
          }
        >
          <Flame className="h-4 w-4" />
          <span className="flex-1">Hoje</span>
          <Sparkles className="h-3 w-3 opacity-70" />
        </NavLink>

        {items.map(({ to, label, Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-emerald-950/40 text-emerald-300 border border-emerald-900/60"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900",
              )
            }
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {badge === "matches" && hotCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#D9F564] text-zinc-900 tabular-nums">
                {hotCount}
              </span>
            )}
          </NavLink>
        ))}

        <div className="pt-4 pb-1 px-3 text-[10px] uppercase tracking-wider text-[#D9F564]/70 font-semibold">
          Dashboards M&A
        </div>
        {dashboardItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-[#D9F564]/10 text-[#D9F564] border border-[#D9F564]/30"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900",
              )
            }
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
          </NavLink>
        ))}

        {canSeeData && (
          <>
            <div className="pt-4 pb-1 px-3 text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">
              Dados
            </div>
            {dataItems.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-emerald-950/40 text-emerald-300 border border-emerald-900/60"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-zinc-800 p-3 space-y-1">
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao site
        </button>
        {user && (
          <button
            onClick={async () => { await signOut(); navigate("/"); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        )}
        {user?.email && (
          <div className="px-3 pt-2 text-[10px] text-zinc-600 truncate">{user.email}</div>
        )}
      </div>
    </aside>
  );
}
