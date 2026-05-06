import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Building2, MapPin, Wifi, Gauge, Users, AlertTriangle, TrendingUp, Banknote,
} from "lucide-react";
import {
  aggregateAnatel, classifyExpansion, classifyPorte, porteLimit,
  formatBRL, formatNum, formatCnpj, parseAcessos, DEFAULT_TICKET_BRL,
  type AnatelRow, type AnatelAggregate,
} from "@/lib/anatelInsights";

interface RfbData {
  razao_social?: string | null;
  nome_fantasia?: string | null;
  capital_social?: number | string | null;
  porte_empresa?: string | null;
  natureza_juridica?: string | null;
  cnae_fiscal_principal?: string | null;
  uf?: string | null;
  municipio?: string | null;
  bairro?: string | null;
  cep?: string | null;
  situacao_cadastral?: string | null;
  data_inicio_atividade?: string | null;
}

export function CompanyProfileCard({
  cnpj, rfb, anatelRows, loading,
}: {
  cnpj: string;
  rfb: RfbData | null;
  anatelRows: AnatelRow[];
  loading?: boolean;
}) {
  const [ticket, setTicket] = useState<number>(DEFAULT_TICKET_BRL);

  const sede = { uf: rfb?.uf, municipio: rfb?.municipio };
  const agg = useMemo(() => aggregateAnatel(anatelRows ?? [], sede), [anatelRows, rfb?.uf, rfb?.municipio]);
  const expansion = useMemo(() => classifyExpansion(agg, sede), [agg, rfb?.uf, rfb?.municipio]);
  const porte = classifyPorte(rfb?.porte_empresa);
  const limite = porteLimit(porte);

  const capitalSocial = Number(rfb?.capital_social ?? 0) || 0;
  const receitaMensal = agg.totalAcessos * ticket;
  const receitaAnual = receitaMensal * 12;

  const alertaSocietario = agg.totalAcessos > 5_000 && capitalSocial < 50_000 && capitalSocial > 0;
  const alertaPorte = limite != null && receitaAnual > limite;

  const situacaoOk = String(rfb?.situacao_cadastral ?? "").toUpperCase().includes("ATIVA")
    || String(rfb?.situacao_cadastral ?? "") === "02";

  const expansionColors: Record<string, string> = {
    Local: "bg-zinc-800 text-zinc-200 border-zinc-700",
    Regional: "bg-blue-950/50 text-blue-300 border-blue-900",
    Interestadual: "bg-violet-950/50 text-violet-300 border-violet-900",
    Indefinido: "bg-zinc-900 text-zinc-500 border-zinc-800",
  };

  if (loading) {
    return (
      <Card className="p-6 bg-zinc-900/60 border-zinc-800 text-sm text-zinc-400">
        Carregando perfil consolidado…
      </Card>
    );
  }

  if (!rfb && !anatelRows?.length) {
    return (
      <Card className="p-6 bg-zinc-900/60 border-zinc-800 text-sm text-zinc-500">
        Nenhum dado encontrado para este CNPJ.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-5 bg-zinc-900/60 border-zinc-800">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-emerald-950/40 border border-emerald-900 p-2">
            <Building2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-100 break-words">
                {rfb?.razao_social ?? "—"}
              </h2>
              {rfb?.situacao_cadastral && (
                <Badge variant="outline" className={situacaoOk
                  ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
                  : "border-red-800 bg-red-950/40 text-red-300"}>
                  {situacaoOk ? "ATIVA" : `Situação: ${rfb.situacao_cadastral}`}
                </Badge>
              )}
              {porte && (
                <Badge variant="outline" className="border-zinc-700 bg-zinc-800 text-zinc-200">
                  Porte: {porte}
                </Badge>
              )}
            </div>
            <div className="text-xs text-zinc-400 mt-1 space-x-3">
              {rfb?.nome_fantasia && <span>Fantasia: <span className="text-zinc-200">{rfb.nome_fantasia}</span></span>}
              <span className="font-mono">{formatCnpj(cnpj)}</span>
              {rfb?.cnae_fiscal_principal && <span>CNAE: <span className="text-zinc-200">{rfb.cnae_fiscal_principal}</span></span>}
            </div>
            <div className="text-xs text-zinc-500 mt-1 flex flex-wrap gap-x-4">
              {(rfb?.municipio || rfb?.uf) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Sede: {rfb?.municipio ?? "—"}/{rfb?.uf ?? "—"}
                </span>
              )}
              {rfb?.data_inicio_atividade && (
                <span>Início: {rfb.data_inicio_atividade}</span>
              )}
              {rfb?.natureza_juridica && (
                <span>Natureza: {rfb.natureza_juridica}</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* KPIs Anatel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Users className="h-4 w-4" />} label="Total de acessos" value={formatNum(agg.totalAcessos)} accent />
        <Kpi icon={<Wifi className="h-4 w-4" />} label="Tecnologia principal" value={agg.tecnologias[0]?.name ?? "—"}
          sub={agg.tecnologias[0] ? `${formatNum(agg.tecnologias[0].acessos)} acessos` : undefined} />
        <Kpi icon={<Gauge className="h-4 w-4" />} label="Velocidade predominante" value={agg.faixaVelocidadePredominante ?? "—"} />
        <Kpi icon={<MapPin className="h-4 w-4" />} label="Cobertura" value={`${agg.nCidades} cidades`} sub={`${agg.nUfs} UF${agg.nUfs > 1 ? "s" : ""}`} />
      </div>

      {/* Tecnologias detalhadas */}
      {agg.tecnologias.length > 0 && (
        <Card className="p-4 bg-zinc-900/60 border-zinc-800">
          <div className="text-xs text-zinc-400 mb-2">Distribuição por tecnologia</div>
          <div className="flex flex-wrap gap-2">
            {agg.tecnologias.slice(0, 8).map((t) => (
              <span key={t.name} className="inline-flex items-center gap-2 px-2 py-1 rounded border border-zinc-800 bg-zinc-950 text-xs">
                <span className="text-zinc-200">{t.name}</span>
                <span className="text-emerald-400 font-mono">{formatNum(t.acessos)}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Expansão geográfica */}
      <Card className="p-4 bg-zinc-900/60 border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-400" />
            Expansão geográfica
          </div>
          <Badge variant="outline" className={expansionColors[expansion]}>
            {expansion}
          </Badge>
        </div>
        <div className="text-xs text-zinc-500 mb-2">
          Sede declarada: <span className="text-zinc-300">{rfb?.municipio ?? "—"}/{rfb?.uf ?? "—"}</span>
          {" · "}atende em {agg.nCidades} {agg.nCidades === 1 ? "cidade" : "cidades"} · {agg.nUfs} UF{agg.nUfs > 1 ? "s" : ""}
        </div>
        <div className="overflow-auto max-h-64 rounded border border-zinc-800">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900 sticky top-0 text-zinc-400">
              <tr>
                <th className="px-3 py-2 text-left">Cidade</th>
                <th className="px-3 py-2 text-left">UF</th>
                <th className="px-3 py-2 text-right">Acessos</th>
                <th className="px-3 py-2 text-left">Sede?</th>
              </tr>
            </thead>
            <tbody>
              {agg.cidades.slice(0, 12).map((c, i) => (
                <tr key={i} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                  <td className="px-3 py-2 text-zinc-200">{c.cidade}</td>
                  <td className="px-3 py-2 text-zinc-400">{c.estado}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNum(c.acessos)}</td>
                  <td className="px-3 py-2">
                    {c.isSede ? (
                      <span className="text-emerald-400">●</span>
                    ) : <span className="text-zinc-700">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inteligência financeira */}
      <Card className="p-4 bg-zinc-900/60 border-zinc-800">
        <div className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-3">
          <Banknote className="h-4 w-4 text-emerald-400" />
          Inteligência financeira & alertas M&A
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Kpi label="Capital social (RFB)" value={capitalSocial > 0 ? formatBRL(capitalSocial) : "—"} />
          <Kpi label="Total de acessos" value={formatNum(agg.totalAcessos)} accent />
          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Ticket médio estimado</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-zinc-400 text-sm">R$</span>
              <Input
                type="number"
                value={ticket}
                onChange={(e) => setTicket(Number(e.target.value) || 0)}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 h-8 w-24 text-sm"
                min={0}
              />
              <span className="text-xs text-zinc-500">/ acesso · mês</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div className="rounded-md border border-emerald-900/60 bg-emerald-950/20 p-3">
            <div className="text-[10px] uppercase tracking-wide text-emerald-300">Receita mensal estimada</div>
            <div className="text-2xl font-bold tabular-nums text-emerald-300 mt-1">{formatBRL(receitaMensal)}</div>
          </div>
          <div className="rounded-md border border-emerald-900/60 bg-emerald-950/20 p-3">
            <div className="text-[10px] uppercase tracking-wide text-emerald-300">Receita anualizada</div>
            <div className="text-2xl font-bold tabular-nums text-emerald-300 mt-1">{formatBRL(receitaAnual)}</div>
            {limite != null && (
              <div className="text-[10px] text-zinc-500 mt-1">
                Limite {porte}: {formatBRL(limite)}
              </div>
            )}
          </div>
        </div>

        {(alertaSocietario || alertaPorte) && (
          <div className="mt-3 space-y-2">
            {alertaSocietario && (
              <div className="flex items-start gap-2 p-3 rounded-md border border-amber-900/60 bg-amber-950/30 text-amber-200 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <b>Alerta M&A — Inconsistência societária.</b>{" "}
                  {formatNum(agg.totalAcessos)} acessos com capital social de apenas {formatBRL(capitalSocial)}.
                  Operação relevante com base societária subdimensionada — comum em alvos de aquisição.
                </div>
              </div>
            )}
            {alertaPorte && (
              <div className="flex items-start gap-2 p-3 rounded-md border border-red-900/60 bg-red-950/30 text-red-200 text-xs">
                <TrendingUp className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <b>Possível desenquadramento fiscal.</b> Receita anualizada estimada de{" "}
                  {formatBRL(receitaAnual)} excede o limite do porte declarado ({porte} · {formatBRL(limite!)}).
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({
  icon, label, value, sub, accent,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-md border p-3 ${accent ? "border-emerald-900/60 bg-emerald-950/20" : "border-zinc-800 bg-zinc-950"}`}>
      <div className={`text-[10px] uppercase tracking-wide flex items-center gap-1 ${accent ? "text-emerald-300" : "text-zinc-500"}`}>
        {icon} {label}
      </div>
      <div className={`text-xl font-bold tabular-nums mt-1 break-words ${accent ? "text-emerald-300" : "text-zinc-100"}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}
