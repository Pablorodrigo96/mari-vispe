import { NavLink, useNavigate, useLocation, Link } from "react-router-dom";
import { useState } from "react";
import {
  Flame, Mail, Briefcase, Target, PhoneCall, Newspaper, BarChart3,
  ChevronDown, ArrowLeft, LogOut, Sparkles,
  TrendingUp, Building2, GitMerge, FileSignature,
  Settings, Upload, Search, GitCompare, Globe, Activity, Users,
  Table as TableIcon, Gauge, Copy, Database, Tags, CalendarDays, Search as SearchIcon,
  Scale, ShieldAlert, Send, FileText, Radio, BookOpen, KeyRound, UserCog, Download,
} from "lucide-react";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { MariLogo } from "@/components/brand/MariLogo";
import { useMatchPercentiles, useMatchInbox } from "@/hooks/useMatchInbox";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useVerticalRegistry } from "@/hooks/useVerticalRegistry";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

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
  { to: "/equity-brain/dashboards/propostas", label: "Propostas (NBO)", Icon: FileSignature },
];

const LEGAL_ITEMS = [
  { to: "/equity-brain/legal/biblioteca", label: "Biblioteca de documentos", Icon: BookOpen },
  { to: "/equity-brain/crm/aberturas",    label: "Quebras de sigilo (LGPD)", Icon: ShieldAlert },
];

const CARTAS_ITEMS = [
  { to: "/equity-brain/cartas/historico", label: "Histórico de lotes", Icon: FileText },
  { to: "/equity-brain/cartas/modelos",   label: "Modelos (admin)",    Icon: Mail, adminOnly: true },
];

const ISP_ITEMS = [
  { to: "/equity-brain/isp/import",    label: "Importar base",      Icon: Upload },
  { to: "/equity-brain/isp/sugestoes", label: "Sugestões frias",    Icon: Sparkles },
  { to: "/equity-brain/isp/mercado",   label: "Mercado ISP",        Icon: Radio },
];

const ADMIN_ITEMS = [
  { to: "/equity-brain/admin/rfb", label: "Base Nacional (RFB)", Icon: Database },
  { to: "/equity-brain/admin/dashboard-coverage", label: "Cobertura dashboards", Icon: Gauge },
  { to: "/equity-brain/admin/dedupe",     label: "Limpeza duplicatas",  Icon: Copy },
  { to: "/equity-brain/admin/imports",    label: "Importar",            Icon: Upload },
  { to: "/equity-brain/admin/benchmark",  label: "Base Benchmark",      Icon: Database },
  { to: "/equity-brain/admin/buyer-classification", label: "Classificar Buyers", Icon: Tags },
  { to: "/equity-brain/admin/auditoria",  label: "Auditoria",           Icon: Search },
  { to: "/equity-brain/crm/admin/permissoes",  label: "Permissões",        Icon: KeyRound },
  { to: "/equity-brain/crm/admin/atribuicoes", label: "Atribuições advisor",Icon: UserCog },
  { to: "/equity-brain/crm/exports",      label: "Exports CSV/XLSX",    Icon: Download },
  { to: "/equity-brain/vertical/import",  label: "Importar vertical",   Icon: Layers },
  { to: "/equity-brain/admin/shadow",     label: "Shadow v1↔v2",        Icon: GitCompare },
  { to: "/equity-brain/admin/jarvis",     label: "Jarvis 3D",           Icon: Globe },
  { to: "/equity-brain/grafo-jarvis/guia", label: "Guia Jarvis",        Icon: BookOpen },
  { to: "/equity-brain/admin/monday-parity",     label: "Paridade Monday",     Icon: BarChart3 },
  { to: "/equity-brain/admin/advisors-mapping",  label: "Mapeamento Advisors", Icon: Users },
  { to: "/equity-brain/admin/health",     label: "Health",              Icon: Activity },
];

export function EBSidebar() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { data: pcts } = useMatchPercentiles();
  const { data: hotMatches = [] } = useMatchInbox({ minScore: pcts?.hot ?? 70, limit: 200 });
  const hotCount = hotMatches.length;
  const { roles } = useUserRoles();
  const isAdmin = roles.includes("admin");

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");
  const dashboardsActive = location.pathname.startsWith("/equity-brain/dashboards");
  const adminActive = location.pathname.startsWith("/equity-brain/admin");
  const [dashOpen, setDashOpen] = useState(dashboardsActive);
  const [adminOpen, setAdminOpen] = useState(adminActive);
  const verticalsActive = location.pathname.startsWith("/equity-brain/vertical/");
  const [vertOpen, setVertOpen] = useState(verticalsActive);
  const { data: verticals = [] } = useVerticalRegistry({ onlyActive: true });

  const hojeActive = location.pathname === "/equity-brain/hoje";
  const diarioActive = location.pathname.startsWith("/equity-brain/diario");
  const buscaNotasActive = location.pathname.startsWith("/equity-brain/busca-notas");

  return (
    <Sidebar collapsible="icon" className="border-r border-zinc-800 bg-zinc-950">
      <SidebarHeader className="border-b border-zinc-800 bg-zinc-950 p-3">
        <div className="flex items-center gap-3">
          <MariLogo variant="symbol-dark" size={collapsed ? 32 : 44} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-zinc-100 text-sm font-bold leading-none">Equity Brain</div>
              <div className="text-zinc-500 text-[10px] mt-1">by mari · Vispe</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-zinc-950">
        {/* Hoje destaque Volt */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={hojeActive}
                  tooltip="Hoje"
                  className={cn(
                    "font-semibold",
                    hojeActive
                      ? "!bg-[#D9F564] !text-zinc-900 hover:!bg-[#D9F564]/90"
                      : "!bg-zinc-900 !text-[#D9F564] border border-[#D9F564]/30 hover:!bg-zinc-800",
                  )}
                >
                  <Link to="/equity-brain/hoje">
                    <Flame className="h-4 w-4" />
                    <span>Hoje</span>
                    {!collapsed && <Sparkles className="ml-auto h-3 w-3 opacity-70" />}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={diarioActive}
                  tooltip="Diário"
                  className={cn(
                    diarioActive
                      ? "!bg-emerald-950/40 !text-emerald-300 border border-emerald-900/60"
                      : "!text-zinc-400 hover:!text-zinc-100 hover:!bg-zinc-900",
                  )}
                >
                  <Link to="/equity-brain/diario">
                    <CalendarDays className="h-4 w-4" />
                    <span>Diário</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={buscaNotasActive}
                  tooltip="Buscar notas"
                  className={cn(
                    buscaNotasActive
                      ? "!bg-violet-950/40 !text-violet-300 border border-violet-900/60"
                      : "!text-zinc-400 hover:!text-zinc-100 hover:!bg-zinc-900",
                  )}
                >
                  <Link to="/equity-brain/busca-notas">
                    <SearchIcon className="h-4 w-4" />
                    <span>Buscar notas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-zinc-600">Operação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN.map(({ to, label, Icon, badge }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(to)}
                    tooltip={label}
                    className={cn(
                      isActive(to)
                        ? "!bg-emerald-950/40 !text-emerald-300 border border-emerald-900/60"
                        : "!text-zinc-400 hover:!text-zinc-100 hover:!bg-zinc-900",
                    )}
                  >
                    <NavLink to={to}>
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                      {!collapsed && badge === "matches" && hotCount > 0 && (
                        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#D9F564] text-zinc-900 tabular-nums">
                          {hotCount}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dashboards */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setDashOpen((o) => !o)}
                  isActive={dashboardsActive}
                  tooltip="Dashboards"
                  className={cn(
                    dashboardsActive
                      ? "!bg-emerald-950/40 !text-emerald-300"
                      : "!text-zinc-400 hover:!text-zinc-100 hover:!bg-zinc-900",
                  )}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Dashboards</span>
                  {!collapsed && (
                    <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", dashOpen && "rotate-180")} />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              {dashOpen && !collapsed && DASHBOARDS.map(({ to, label, Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(to)}
                    className={cn(
                      "ml-3 text-xs",
                      isActive(to) ? "!text-[#D9F564] !bg-[#D9F564]/10" : "!text-zinc-500 hover:!text-zinc-200",
                    )}
                  >
                    <NavLink to={to}>
                      <Icon className="h-3.5 w-3.5" />
                      <span>{label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Verticais (multi-vertical 2026) */}
        {verticals.length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-zinc-600">Verticais</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setVertOpen((o) => !o)}
                    isActive={verticalsActive}
                    tooltip="Verticais"
                    className={cn(
                      verticalsActive
                        ? "!bg-emerald-950/40 !text-emerald-300"
                        : "!text-zinc-400 hover:!text-zinc-100 hover:!bg-zinc-900",
                    )}
                  >
                    <Layers className="h-4 w-4" />
                    <span>Verticais</span>
                    {!collapsed && (
                      <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", vertOpen && "rotate-180")} />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {vertOpen && !collapsed && verticals.map((v) => {
                  const to = v.market_page_path || `/equity-brain/vertical/${v.slug}/mercado`;
                  return (
                    <SidebarMenuItem key={v.slug}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(to)}
                        className={cn(
                          "ml-3 text-xs",
                          isActive(to) ? "!text-[#D9F564] !bg-[#D9F564]/10" : "!text-zinc-500 hover:!text-zinc-200",
                        )}
                      >
                        <NavLink to={to}>
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: v.color || "#D9F564" }}
                          />
                          <span>{v.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                {vertOpen && !collapsed && isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === "/equity-brain/vertical/import"}
                      className={cn(
                        "ml-3 text-xs",
                        location.pathname === "/equity-brain/vertical/import"
                          ? "!text-zinc-100 !bg-zinc-800"
                          : "!text-zinc-500 hover:!text-zinc-200",
                      )}
                    >
                      <NavLink to="/equity-brain/vertical/import">
                        <Upload className="h-3.5 w-3.5" />
                        <span>Importar vertical</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin */}
        {isAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-zinc-600">Admin</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setAdminOpen((o) => !o)}
                    isActive={adminActive}
                    tooltip="Admin"
                    className={cn(
                      adminActive ? "!bg-zinc-800 !text-zinc-100" : "!text-zinc-400 hover:!text-zinc-100 hover:!bg-zinc-900",
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Admin</span>
                    {!collapsed && (
                      <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", adminOpen && "rotate-180")} />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {adminOpen && !collapsed && ADMIN_ITEMS.map(({ to, label, Icon }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(to)}
                      className={cn(
                        "ml-3 text-xs",
                        isActive(to) ? "!text-zinc-100 !bg-zinc-800" : "!text-zinc-500 hover:!text-zinc-200",
                      )}
                    >
                      <NavLink to={to}>
                        <Icon className="h-3.5 w-3.5" />
                        <span>{label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-zinc-800 bg-zinc-950 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate("/")}
              tooltip="Voltar ao site"
              className="!text-zinc-500 hover:!text-zinc-200 hover:!bg-zinc-900 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar ao site</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={async () => { await signOut(); navigate("/"); }}
                tooltip="Sair"
                className="!text-zinc-500 hover:!text-rose-400 hover:!bg-zinc-900 text-xs"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sair</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
        {!collapsed && user?.email && (
          <div className="px-3 pt-2 text-[10px] text-zinc-600 truncate">{user.email}</div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
