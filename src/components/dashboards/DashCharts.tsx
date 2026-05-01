import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const PALETTE = ["#D9F564", "#00C2FF", "#00D27F", "#FFB800", "#FF3B6B", "#8B5CF6", "#A8A8A3"];

const TOOLTIP_STYLE = {
  backgroundColor: "#141414",
  border: "1px solid #2A2A2A",
  borderRadius: 8,
  color: "#FAFAF7",
  fontSize: 12,
};

export function DashDonut({
  data,
  centerLabel,
  centerValue,
  height = 240,
}: {
  data: { name: string; value: number }[];
  centerLabel?: string;
  centerValue?: string | number;
  height?: number;
}) {
  if (!data.length || data.every((d) => !d.value)) {
    return <EmptyChart height={height} />;
  }
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            innerRadius="65%"
            outerRadius="90%"
            paddingAngle={2}
            dataKey="value"
            stroke="#141414"
            strokeWidth={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "transparent" }} />
        </PieChart>
      </ResponsiveContainer>
      {centerValue !== undefined && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="font-mono text-3xl font-light text-[#FAFAF7] tabular-nums">{centerValue}</div>
          {centerLabel && <div className="text-[9px] uppercase tracking-wider text-[#6B6B68] mt-1">{centerLabel}</div>}
        </div>
      )}
    </div>
  );
}

export function DashBar({
  data,
  dataKey = "value",
  height = 280,
  highlightTop = true,
  layout = "vertical",
}: {
  data: { name: string; value: number }[];
  dataKey?: string;
  height?: number;
  highlightTop?: boolean;
  layout?: "vertical" | "horizontal";
}) {
  if (!data.length) return <EmptyChart height={height} />;
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout={layout === "horizontal" ? "vertical" : "horizontal"} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#2A2A2A" vertical={false} />
          {layout === "horizontal" ? (
            <>
              <XAxis type="number" tick={{ fill: "#6B6B68", fontSize: 10 }} stroke="#2A2A2A" />
              <YAxis type="category" dataKey="name" tick={{ fill: "#A8A8A3", fontSize: 10 }} stroke="#2A2A2A" width={100} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" tick={{ fill: "#A8A8A3", fontSize: 10 }} stroke="#2A2A2A" />
              <YAxis tick={{ fill: "#6B6B68", fontSize: 10 }} stroke="#2A2A2A" />
            </>
          )}
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#1F1F1F" }} />
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={highlightTop && d.value === max ? "#D9F564" : i < 3 ? "#00C2FF" : "#FAFAF7"} fillOpacity={highlightTop && d.value === max ? 1 : 0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashStackedBar({
  data,
  keys,
  height = 280,
}: {
  data: any[];
  keys: { key: string; color: string; label: string }[];
  height?: number;
}) {
  if (!data.length) return <EmptyChart height={height} />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#2A2A2A" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#A8A8A3", fontSize: 10 }} stroke="#2A2A2A" />
          <YAxis tick={{ fill: "#6B6B68", fontSize: 10 }} stroke="#2A2A2A" />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#1F1F1F" }} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#A8A8A3" }} />
          {keys.map((k, i) => (
            <Bar key={k.key} dataKey={k.key} stackId="a" fill={k.color} name={k.label} radius={i === keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashLine({
  data,
  series,
  height = 280,
}: {
  data: any[];
  series: { key: string; color: string; label: string }[];
  height?: number;
}) {
  if (!data.length) return <EmptyChart height={height} />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#2A2A2A" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#A8A8A3", fontSize: 10 }} stroke="#2A2A2A" />
          <YAxis tick={{ fill: "#6B6B68", fontSize: 10 }} stroke="#2A2A2A" />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "#00C2FF", strokeDasharray: "3 3" }} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#A8A8A3" }} />
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: s.color }} name={s.label} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashArea({
  data,
  series,
  height = 280,
}: {
  data: any[];
  series: { key: string; color: string; label: string }[];
  height?: number;
}) {
  if (!data.length) return <EmptyChart height={height} />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#2A2A2A" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#A8A8A3", fontSize: 10 }} stroke="#2A2A2A" />
          <YAxis tick={{ fill: "#6B6B68", fontSize: 10 }} stroke="#2A2A2A" />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "#00C2FF", strokeDasharray: "3 3" }} />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} fill={`url(#grad-${s.key})`} name={s.label} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyChart({ height }: { height: number }) {
  return (
    <div style={{ height }} className="flex flex-col items-center justify-center text-center text-[#6B6B68] text-xs gap-2">
      <div className="w-12 h-12 rounded-full border border-dashed border-[#2A2A2A] flex items-center justify-center text-[#404040]">?</div>
      <div>Sem dados para os filtros atuais</div>
      <div className="text-[10px] text-[#404040]">Tente ampliar o período ou remover filtros</div>
    </div>
  );
}
