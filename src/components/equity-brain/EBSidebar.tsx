import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Flame, Mail, Briefcase, Target, PhoneCall, Newspaper, BarChart3,
  ChevronDown, ArrowLeft, LogOut, Sparkles,
  TrendingUp, Building2, GitMerge, FileSignature,
  Settings, Upload, Search, GitCompare, Globe, Activity, Users,
  Table as TableIcon, Gauge, Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { MariLogo } from "@/components/brand/MariLogo";
import { useMatchPercentiles, useMatchInbox } from "@/hooks/useMatchInbox";
import { useUserRoles } from "@/hooks/useUserRoles";

const MAIN = [
  { to: "/equity-brain/oportunidades",   label: "Oportunidades",    Icon: Mail, badge: "matches" as const },
  { to: "/equity-brain/pipeline",        label: "Pipeline",         Icon: Briefcase },
  { to: "/equity-brain/mandatos/tabela", label: "Mandatos · tabela",Icon: TableIcon },
  { to: "/equity-brain/compradores",     label: "Compradores",      Icon: Target },
  { to: "/equity-brain/calls",           label: "Calls",            Icon: PhoneCall },
  { to: "/equity-brain/mercado",         label: "Mercado",          Icon: Newspaper },
];

const DASHBOARDS = [
  { to: "/equity-brain/dashboards/executivo", label: "Executivo", Icon: TrendingUp },
  { to: "/equity-brain/dashboards/mandatos",  label: "Mandatos",  Icon: Building2 },
  { to: "/equity-brain/dashboards/match",     label: "Match",     Icon: GitMerge },
  { to: "/equity-brain/dashboards/propostas", label: "Propostas", Icon: FileSignature },
];

const ADMIN_ITEMS = [
  { to: "/equity-brain/admin/dashboard-coverage", label: "Cobertura dashboards", Icon: Gauge },
  { to: "/equity-brain/admin/dedupe",     label: "Limpeza duplicatas",  Icon: Copy },
  { to: "/equity-brain/admin/imports",    label: "Importar",            Icon: Upload },
  { to: "/equity-brain/admin/auditoria",  label: "Auditoria",           Icon: Search },
  { to: "/equity-brain/admin/shadow",     label: "Shadow v1↔v2",        Icon: GitCompare },
  { to: "/equity-brain/admin/jarvis",     label: "Jarvis 3D",           Icon: Globe },
  { to: "/equity-brain/admin/monday-parity",     label: "Paridade Monday",     Icon: BarChart3 },
  { to: "/equity-brain/admin/advisors-mapping",  label: "Mapeamento Advisors", Icon: Users },
  { to: "/equity-brain/admin/health",     label: "Health",              Icon: Activity },
];

export function EBSidebar() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: pcts } = useMatchPercentiles();
  const { data: hotMatches = [] } = useMatchInbox({ minScore: pcts?.hot ?? 70, limit: 200 });
  const hotCount = hotMatches.length;
  const { roles } = useUserRoles();
  const isAdmin = roles.includes("admin");

  const dashboardsActive = location.pathname.startsWith("/equity-brain/dashboards");
  const adminActive = location.pathname.startsWith("/equity-brain/admin");

  const [dashOpen, setDashOpen] = useState(dashboardsActive);
  const [adminOpen, setAdminOpen] = useState(adminActive);

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
        {/* Hoje — destaque Volt */}
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

        {MAIN.map(({ to, label, Icon, badge }) => (
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
            {badge === "matches" && hotCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#D9F564] text-zinc-900 tabular-nums">
                {hotCount}
              </span>
            )}
          </NavLink>
        ))}

        {/* Dashboards accordion */}
        <button
          onClick={() => setDashOpen((o) => !o)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            dashboardsActive
              ? "bg-emerald-950/40 text-emerald-300 border border-emerald-900/60"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900",
          )}
        >
          <BarChart3 className="h-4 w-4" />
          <span className="flex-1 text-left">Dashboards</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", dashOpen && "rotate-180")} />
        </button>
        {dashOpen && (
          <div className="ml-3 pl-3 border-l border-zinc-800 space-y-0.5">
            {DASHBOARDS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors",
                    isActive
                      ? "text-[#D9F564] bg-[#D9F564]/10"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900",
                  )
                }
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        )}

        {/* Admin accordion (admin only) */}
        {isAdmin && (
          <>
            <div className="my-3 border-t border-zinc-800" />
            <button
              onClick={() => setAdminOpen((o) => !o)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                adminActive
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900",
              )}
            >
              <Settings className="h-4 w-4" />
              <span className="flex-1 text-left">Admin</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", adminOpen && "rotate-180")} />
            </button>
            {adminOpen && (
              <div className="ml-3 pl-3 border-l border-zinc-800 space-y-0.5">
                {ADMIN_ITEMS.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors",
                        isActive
                          ? "text-zinc-100 bg-zinc-800"
                          : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900",
                      )
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            )}
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
