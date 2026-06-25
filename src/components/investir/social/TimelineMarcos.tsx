import type { CompanyTimeline } from "@/types/social";
import { Milestone } from "lucide-react";

export function TimelineMarcos({ items }: { items: CompanyTimeline[] }) {
  return (
    <div className="bg-graphite/30 border border-bone/10 rounded-2xl p-5 md:p-6">
      <div className="flex items-center gap-2 mb-5">
        <Milestone className="w-4 h-4 text-volt" />
        <h3 className="text-bone font-semibold text-sm md:text-base">Linha do tempo</h3>
      </div>
      <ol className="relative border-l border-bone/15 ml-2 space-y-5">
        {items.map((it, i) => (
          <li key={i} className="pl-5 relative">
            <span
              className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full ring-4 ring-graphite ${
                it.highlight ? "bg-volt" : "bg-bone/40"
              }`}
            />
            <div className="text-[10px] uppercase tracking-wider text-bone/45">{it.date}</div>
            <div className={`text-sm ${it.highlight ? "text-bone font-medium" : "text-bone/75"}`}>{it.label}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
