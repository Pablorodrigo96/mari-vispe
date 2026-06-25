// Pílula escura translúcida de KPI no story (estilo IG da referência).
export type StoryOverlay = {
  kpi_label?: string;
  kpi_value?: string;
  delta?: string;
  headline?: string;
  sub?: string;
};

export function StoryAutoOverlay({ overlay }: { overlay: StoryOverlay }) {
  if (!overlay) return null;
  return (
    <div className="space-y-3">
      {(overlay.kpi_label || overlay.kpi_value) && (
        <div className="inline-flex items-baseline gap-2 bg-black/55 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10">
          {overlay.kpi_label && (
            <span className="text-white/65 text-[10px] uppercase tracking-[0.12em] font-semibold">
              {overlay.kpi_label}
            </span>
          )}
          {overlay.kpi_value && (
            <span className="text-white font-bold text-lg md:text-xl tabular-nums">
              {overlay.kpi_value}
            </span>
          )}
          {overlay.delta && (
            <span className="text-volt text-xs font-bold tabular-nums">{overlay.delta}</span>
          )}
        </div>
      )}
      {overlay.headline && (
        <h3 className="text-white font-bold text-xl md:text-2xl leading-tight drop-shadow-lg">
          {overlay.headline}
        </h3>
      )}
      {overlay.sub && (
        <p className="text-white/85 text-sm leading-snug drop-shadow">{overlay.sub}</p>
      )}
    </div>
  );
}
