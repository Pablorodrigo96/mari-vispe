import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChartCard } from "@/components/equity-brain/crm/exec/ChartCard";
import { KpiTile } from "@/components/equity-brain/crm/exec/KpiTile";
import { DonutChart } from "@/components/equity-brain/crm/exec/DonutChart";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { ArrowLeft, ArrowLeftRight, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { REGIAO_BY_UF, OUTCOME_LABEL, OUTCOME_COLOR, BUYER_ENGAGEMENT_LABEL, BUYER_ENGAGEMENT_COLOR } from "@/lib/dealFormatters";

type Dim = "uf" | "regiao" | "setor";

export default function MatchAnalyticsPage() {
  const [dim, setDim] = useState<Dim>("uf");

  const cross = useQuery({
    queryKey: ["eb-match-cross", dim],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("eb_match_crosstab", { dim });
      if (error) throw error;
      return ((data ?? []) as any[]) as { label: string; mandates_count: number; buyers_count: number }[];
    },
  });

  const mandates = useQuery({
    queryKey: ["eb-match-mandates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eb_mandates" as any)
        .select("id,company_cnpj,uf,setor,status,outcome,contato_nome,contato_telefone,contato_email,exclusividade")
        .in("outcome", ["em_andamento"])
        .limit(500);
      return (data ?? []) as any[];
    },
  });

  const buyers = useQuery({
    queryKey: ["eb-match-buyers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eb_buyers" as any)
        .select("id,nome,tipo,ufs_interesse,setores_interesse,status,raw_data")
        .eq("status", "ativo")
        .limit(500);
      return (data ?? []) as any[];
    },
  });

  const crossData = (cross.data ?? []).slice(0, 30).map((r) => ({
    label: dim === "regiao" ? (REGIAO_BY_UF[r.label] ?? r.label) : r.label,
    Mandatos: r.mandates_count,
    Compradores: r.buyers_count,
  }));

  // Agrupar por região no caso dim=regiao
  const finalCross = dim === "regiao" ? aggregateByLabel(crossData) : crossData;

  const mandList = mandates.data ?? [];
  const buyList = buyers.data ?? [];

  return (
    <div className="p-6 space-y-6 bg-zinc-950 min-h-full">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link to="/equity-brain/crm" className="text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> CRM
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1 tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-[#D9F564]" />
            Match Analytics — Vendedores × Compradores
          </h1>
          <p className="text-xs text-zinc-400 mt-1 break-words">
            Cruza oferta (mandatos vigentes) com demanda (compradores ativos) por dimensão.
          </p>
        </div>
        <Link
          to="/equity-brain/crm/executivo"
          className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-800 text-zinc-300 hover:text-zinc-100 bg-transparent"
        >
          ← Dashboard Executivo
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Mandatos vigentes" value={mandList.length} accent="success" loading={mandates.isLoading} />
        <KpiTile label="Compradores ativos" value={buyList.length} accent="primary" loading={buyers.isLoading} />
        <KpiTile
          label="Mandatos exclusivos"
          value={mandList.filter((m: any) => m.exclusividade).length}
          loading={mandates.isLoading}
        />
        <KpiTile
          label="Cobertura geográfica"
          value={`${new Set(mandList.map((m: any) => m.uf).filter(Boolean)).size} UFs`}
          loading={mandates.isLoading}
        />
      </div>

      <ChartCard
        title={`Match por ${dim === "uf" ? "estado" : dim}`}
        action={
          <div className="flex items-center gap-1">
            {(["uf", "regiao", "setor"] as Dim[]).map((d) => (
              <Button
                key={d}
                size="sm"
                variant={dim === d ? "default" : "outline"}
                onClick={() => setDim(d)}
                className={cn(
                  "h-7 text-[10px] px-2",
                  dim !== d && "bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-100",
                )}
              >
                {d === "uf" ? "Estado" : d === "regiao" ? "Região" : "Setor"}
              </Button>
            ))}
          </div>
        }
      >
        {finalCross.length > 0 ? (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={finalCross}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 10 }} angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Compradores" stackId="a" fill="#1d4ed8" />
              <Bar dataKey="Mandatos" stackId="a" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-xs text-zinc-500">
            Cadastre interesses (UF/setor) nos compradores e UF/setor nos mandatos para gerar o cruzamento.
          </div>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SideTable
          title={`Vendedores (${mandList.length})`}
          color="emerald"
          rows={mandList.map((m: any) => ({
            id: m.id,
            kind: "mandate",
            primary: m.company_cnpj,
            secondary: `${m.uf || "—"} · ${m.setor || "—"}`,
            contact: m.contato_nome,
            phone: m.contato_telefone,
            email: m.contato_email,
          }))}
        />
        <SideTable
          title={`Compradores (${buyList.length})`}
          color="blue"
          rows={buyList.map((b: any) => ({
            id: b.id,
            kind: "buyer",
            primary: b.nome,
            secondary: `${(b.ufs_interesse || []).slice(0, 3).join(", ") || "—"} · ${(b.setores_interesse || []).slice(0, 2).join(", ") || "—"}`,
            contact: b.tipo,
            phone: b.raw_data?.phone || null,
            email: b.raw_data?.email || null,
          }))}
        />
      </div>
    </div>
  );
}

function aggregateByLabel(arr: { label: string; Mandatos: number; Compradores: number }[]) {
  const m = new Map<string, { label: string; Mandatos: number; Compradores: number }>();
  arr.forEach((r) => {
    const e = m.get(r.label) ?? { label: r.label, Mandatos: 0, Compradores: 0 };
    e.Mandatos += r.Mandatos;
    e.Compradores += r.Compradores;
    m.set(r.label, e);
  });
  return Array.from(m.values()).sort((a, b) => b.Mandatos + b.Compradores - (a.Mandatos + a.Compradores));
}

function SideTable({
  title,
  color,
  rows,
}: {
  title: string;
  color: "emerald" | "blue";
  rows: { id: string; kind: string; primary: string; secondary: string; contact?: string; phone?: string | null; email?: string | null }[];
}) {
  const accent = color === "emerald" ? "border-emerald-500/40 text-emerald-300" : "border-blue-500/40 text-blue-300";
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg backdrop-blur-md overflow-hidden">
      <div className={cn("px-4 py-2.5 border-b text-xs font-semibold uppercase tracking-wider", accent)}>
        {title}
      </div>
      <div className="max-h-[480px] overflow-y-auto divide-y divide-zinc-800">
        {rows.length === 0 && (
          <div className="text-xs text-zinc-500 p-4">Nenhum registro.</div>
        )}
        {rows.map((r) => (
          <Link
            key={r.id}
            to={`/equity-brain/crm/${r.kind}/${r.id}`}
            className="block px-4 py-2.5 hover:bg-zinc-900/80 transition"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-zinc-100 font-medium truncate break-words">{r.primary}</div>
                <div className="text-[10px] text-zinc-500 truncate mt-0.5">{r.secondary}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {r.phone && <Phone className="h-3 w-3 text-zinc-600" />}
                {r.email && <Mail className="h-3 w-3 text-zinc-600" />}
              </div>
            </div>
            {r.contact && <div className="text-[10px] text-zinc-400 mt-1 truncate break-words">{r.contact}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
