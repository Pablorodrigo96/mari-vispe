import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

export function StatusBarChart({ data }: { data: { status: string; buyside: number; sellside: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="status" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
        <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
        <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="buyside" stackId="a" fill="#1d4ed8" name="Buyside" />
        <Bar dataKey="sellside" stackId="a" fill="#10b981" name="Sellside" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function YearlyEvolutionChart({ data }: { data: { year: string; buyside: number; sellside: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="year" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
        <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
        <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="buyside" stackId="a" fill="#1d4ed8" name="Buyside" />
        <Bar dataKey="sellside" stackId="a" fill="#10b981" name="Sellside" />
      </BarChart>
    </ResponsiveContainer>
  );
}
