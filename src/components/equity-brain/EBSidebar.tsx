import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Target, Users, Lightbulb, PhoneCall, Map as MapIcon, Network, ArrowLeft, LogOut, LineChart, Sparkles, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { MariLogo } from "@/components/brand/MariLogo";

const items = [
  { to: "/equity-brain",                label: "Dashboard",       Icon: LayoutDashboard, end: true },
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

export function EBSidebar() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

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

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(({ to, label, Icon, end }) => (
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
            {label}
          </NavLink>
        ))}
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
