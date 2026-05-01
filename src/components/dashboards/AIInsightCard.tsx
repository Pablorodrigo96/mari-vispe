import { Sparkles } from "lucide-react";

export function AIInsightCard({
  title = "Insight da Mari",
  body,
  actionLabel,
  onAction,
}: {
  title?: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl p-5 border border-[#D9F564]/40 bg-gradient-to-br from-[#D9F564]/5 to-transparent">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D9F564]">
        <Sparkles className="h-3.5 w-3.5" />
        {title}
      </div>
      <p className="text-sm text-[#FAFAF7] mt-3 leading-relaxed break-words">{body}</p>
      {actionLabel && (
        <button
          onClick={onAction}
          className="mt-3 text-[11px] inline-flex items-center gap-1 text-[#D9F564] hover:underline"
        >
          {actionLabel} →
        </button>
      )}
    </div>
  );
}
