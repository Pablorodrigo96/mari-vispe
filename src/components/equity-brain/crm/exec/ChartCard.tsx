import { ReactNode } from "react";
import { InfoHint, type InfoHintProps } from "@/components/equity-brain/InfoHint";

export function ChartCard({
  title,
  action,
  children,
  info,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  info?: Omit<InfoHintProps, "side" | "align" | "className" | "iconClassName">;
}) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-xs font-semibold text-zinc-200 uppercase tracking-wider truncate">{title}</div>
          {info && <InfoHint {...info} />}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
