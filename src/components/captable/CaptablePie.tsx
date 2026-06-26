import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { brl } from "@/lib/painelExecutive";
import type { Partner } from "@/hooks/useCaptables";

const COLORS = ["#D9F564", "#2A2A2A", "#6BA539", "#FAFAF7", "#4B5563", "#A3E635", "#1F2937", "#D4D4AA"];

export function CaptablePie({ partners, valuation }: { partners: Partner[]; valuation: number }) {
  const data = partners
    .filter((p) => p.pct > 0)
    .map((p) => ({ name: p.nome, pct: Number(p.pct), value: (Number(p.pct) / 100) * valuation }));
  const livre = 100 - data.reduce((a, b) => a + b.pct, 0);
  if (livre > 0.01) data.push({ name: "Não alocado", pct: livre, value: (livre / 100) * valuation });

  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Adicione sócios para visualizar o cap-table</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="pct" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}
             label={(d: any) => `${d.pct.toFixed(1)}%`} labelLine={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.name === "Não alocado" ? "#3f3f46" : COLORS[i % COLORS.length]} stroke="#0A0A0A" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#0A0A0A", border: "1px solid #2A2A2A", fontSize: 12 }}
          formatter={(_, __, p: any) => [`${p.payload.pct.toFixed(2)}% · ${brl(p.payload.value)}`, p.payload.name]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}
