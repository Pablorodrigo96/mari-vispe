import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const PALETTE = ["#1d4ed8", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"];

export function DonutChart({
  data,
  colors,
}: {
  data: { name: string; value: number }[];
  colors?: string[];
}) {
  const palette = colors ?? PALETTE;
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={85}
          paddingAngle={2}
          label={(d: any) => `${((d.value / total) * 100).toFixed(1)}%`}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} stroke="#0a0a0a" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}
