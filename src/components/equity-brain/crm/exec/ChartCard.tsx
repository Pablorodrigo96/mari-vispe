import { ReactNode } from "react";

export function ChartCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}
