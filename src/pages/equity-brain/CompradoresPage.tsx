import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import BuyersPage from "./BuyersPage";
import TesesPage from "./TesesPage";

type Tab = "compradores" | "teses";
const TABS: { id: Tab; label: string }[] = [
  { id: "compradores", label: "Compradores" },
  { id: "teses", label: "Teses" },
];

export default function CompradoresPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const active: Tab = raw === "teses" ? "teses" : "compradores";

  function setTab(t: Tab) {
    const next = new URLSearchParams(params);
    if (t === "compradores") next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
  }

  return (
    <div className="flex flex-col h-full">
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
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {active === "compradores" ? <BuyersPage /> : <TesesPage />}
      </div>
    </div>
  );
}
