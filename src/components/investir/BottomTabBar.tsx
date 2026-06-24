import { NavLink } from "react-router-dom";
import { Home, LineChart, Wallet, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/investir/painel", label: "Início", icon: Home, end: true },
  { to: "/investir/empresas", label: "Investir", icon: LineChart },
  { to: "/investir/carteira", label: "Carteira", icon: Wallet },
  { to: "/investir/reservas", label: "Reservas", icon: ClipboardList },
  { to: "/investir/onboarding/kyc", label: "Conta", icon: User },
];

export function BottomTabBar() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-carbon/95 backdrop-blur-xl border-t border-bone/10 pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      <ul className="grid grid-cols-5">
        {tabs.map((t) => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-volt" : "text-bone/55 hover:text-bone",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <t.icon
                    className={cn("w-5 h-5", isActive && "stroke-[2.4]")}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  <span>{t.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
