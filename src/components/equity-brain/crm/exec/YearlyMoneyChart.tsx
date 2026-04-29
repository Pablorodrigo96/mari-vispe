import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { brl } from "@/lib/dealFormatters";

type Row = { year: number; sellside: number; buyside: number };

export function YearlyMoneyChart({
  data,
  sellsideName = "Sellside",
  buysideName = "Buyside",
  height = 280,
}: {
  data: Row[];
  sellsideName?: string;
  buysideName?: string;
  height?: number;
}) {
  if (!data?.length) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-xs text-zinc-500 break-words text-center px-4">
        Sem dados para exibir.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="year" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
        <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} tickFormatter={(v) => brl(v, { compact: true })} />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #27272a", fontSize: 12 }}
          formatter={(v: any) => brl(Number(v))}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="sellside" stroke="#10b981" strokeWidth={2} name={sellsideName} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="buyside" stroke="#1d4ed8" strokeWidth={2} name={buysideName} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
