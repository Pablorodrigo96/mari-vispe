import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, Brain, ChevronDown, ChevronUp, Building2, Users } from "lucide-react";
import { formatBRL } from "@/lib/equityBrain";

interface Props {
  cnpj: string;
}

export function CompanyEnrichedHeader({ cnpj }: Props) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["eb-company-enriched-header", cnpj],
    enabled: !!cnpj,
    staleTime: 60_000,
    queryFn: async () => {
      const eb = (supabase as any).schema("equity_brain");
      const { data } = await eb
        .from("companies")
        .select(
          "cnpj,codename,razao_social,nome_fantasia,qualification_status,qualified_at,linked_buyer_id,embedding_computed_at,faturamento_estimado,ebitda_estimado,funcionarios_estimado,cnae_principal,cnae_descricao,setor_ma,uf,municipio,score_vendabilidade,nivel_maturidade,raw_data",
        )
        .eq("cnpj", cnpj)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading || !data) return null;

  const indexed = !!data.embedding_computed_at;
  const qualif = data.qualification_status as string | null;
  const linkedBuyerId = data.linked_buyer_id as string | null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {qualif && (
          <span
            title={data.qualified_at ? `Qualificado em ${new Date(data.qualified_at).toLocaleDateString("pt-BR")}` : undefined}
            className="text-[10px] px-2 py-0.5 rounded border border-emerald-800/60 text-emerald-300 inline-flex items-center gap-1"
          >
            <CheckCircle2 className="h-3 w-3" /> {qualif}
          </span>
        )}
        <span
          title={indexed ? `Indexada em ${new Date(data.embedding_computed_at!).toLocaleString("pt-BR")}` : "Empresa ainda não indexada na IA"}
          className={`text-[10px] px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
            indexed ? "border-violet-800/60 text-violet-300" : "border-zinc-700 text-zinc-500"
          }`}
        >
          <Brain className="h-3 w-3" /> {indexed ? "Indexada IA" : "Sem embedding"}
        </span>
        {data.score_vendabilidade != null && (
          <span className="text-[10px] px-2 py-0.5 rounded border border-amber-800/60 text-amber-300">
            SV {Number(data.score_vendabilidade).toFixed(0)}
          </span>
        )}
        {data.nivel_maturidade != null && (
          <span className="text-[10px] px-2 py-0.5 rounded border border-zinc-700 text-zinc-300">
            Maturidade {data.nivel_maturidade}
          </span>
        )}
        {linkedBuyerId && (
          <Link
            to={`/equity-brain/buyer/${linkedBuyerId}`}
            className="text-[10px] px-2 py-0.5 rounded border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/20 inline-flex items-center gap-1"
          >
            <Users className="h-3 w-3" /> Comprador vinculado
          </Link>
        )}
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-900/40">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-300 hover:text-zinc-100"
        >
          <span className="inline-flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-zinc-500" />
            Dados estruturados
          </span>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {open && (
          <div className="px-3 pb-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
            <Row label="CNAE" value={data.cnae_principal ? `${data.cnae_principal} — ${data.cnae_descricao ?? ""}` : "—"} />
            <Row label="Setor M&A" value={data.setor_ma ?? "—"} />
            <Row label="Local" value={[data.municipio, data.uf].filter(Boolean).join(" / ") || "—"} />
            <Row label="Funcionários (est.)" value={data.funcionarios_estimado != null ? String(data.funcionarios_estimado) : "—"} />
            <Row label="Faturamento (est.)" value={data.faturamento_estimado != null ? formatBRL(data.faturamento_estimado) : "—"} />
            <Row label="EBITDA (est.)" value={data.ebitda_estimado != null ? formatBRL(data.ebitda_estimado) : "—"} />
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-zinc-200 break-words">{value}</div>
    </div>
  );
}
