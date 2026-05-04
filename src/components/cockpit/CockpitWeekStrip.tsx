import { useCockpitData } from "@/hooks/useCockpitData";
import { WindowCard } from "./cards/WindowCard";
import { ActiveBuyersCard } from "./cards/ActiveBuyersCard";
import { NextStepCard } from "./cards/NextStepCard";
import { MariInsightCard } from "./cards/MariInsightCard";
import { MarketSignalCard } from "./cards/MarketSignalCard";

export function CockpitWeekStrip() {
  const { data: ctx, isLoading } = useCockpitData();

  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <section className="mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Sua semana na Mari</h2>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{today}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <WindowCard ctx={ctx} loading={isLoading} />
        <ActiveBuyersCard ctx={ctx} loading={isLoading} />
        <NextStepCard ctx={ctx} loading={isLoading} />
        <MariInsightCard ctx={ctx} loading={isLoading} />
        <MarketSignalCard ctx={ctx} loading={isLoading} />
      </div>
    </section>
  );
}
