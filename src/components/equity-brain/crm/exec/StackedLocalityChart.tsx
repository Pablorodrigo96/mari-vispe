import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

type Row = { uf: string; sellside: number; buyside: number };

export function StackedLocalityChart({ data, height = 300 }: { data: Row[]; height?: number }) {
  if (!data?.length) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-xs text-zinc-500 break-words text-center px-4">
        Preencha o UF dos mandatos.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="uf" tick={{ fill: "#a1a1aa", fontSize: 10 }} angle={-45} textAnchor="end" height={60} interval={0} />
        <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} />
        <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="buyside" stackId="a" fill="#1d4ed8" name="Buyside" />
        <Bar dataKey="sellside" stackId="a" fill="#10b981" name="Sellside" />
      </BarChart>
    </ResponsiveContainer>
  );
}
