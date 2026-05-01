import { useSearchParams } from "react-router-dom";
import { useMatchPercentiles, useMatchInbox } from "@/hooks/useMatchInbox";
import MatchInboxPage from "./MatchInboxPage";
import OportunidadesEmAndamentoPage from "./OportunidadesEmAndamentoPage";
import { cn } from "@/lib/utils";

type Tab = "novos" | "andamento" | "todos";
const TABS: { id: Tab; label: string }[] = [
  { id: "novos", label: "Novos" },
  { id: "andamento", label: "Em andamento" },
  { id: "todos", label: "Todos" },
];

export default function OportunidadesPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") as Tab | null;
  const active: Tab = raw === "andamento" || raw === "todos" ? raw : "novos";

  const { data: pcts } = useMatchPercentiles();
  const { data: hot = [] } = useMatchInbox({ minScore: pcts?.hot ?? 70, limit: 200 });

  function setTab(t: Tab) {
    const next = new URLSearchParams(params);
    if (t === "novos") next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs header */}
      <div className="border-b border-zinc-800 bg-zinc-950 px-6 pt-4">
        <div className="flex items-end gap-1">
          {TABS.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  isActive
                    ? "border-[#D9F564] text-[#D9F564]"
                    : "border-transparent text-zinc-500 hover:text-zinc-200",
                )}
              >
                {t.label}
                {t.id === "novos" && hot.length > 0 && (
                  <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#D9F564]/20 text-[#D9F564] tabular-nums">
                    {hot.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {active === "novos" && <MatchInboxPage />}
        {active === "andamento" && <OportunidadesEmAndamentoPage />}
        {active === "todos" && <OportunidadesEmAndamentoPage />}
      </div>
    </div>
  );
}
