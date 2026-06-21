// Relatório executivo imprimível do Equity Planner — Onda 6
// Rota: /equity-planner/:id/relatorio
// Layout otimizado para impressão (window.print → Salvar como PDF) com branding Mari.
import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DIMENSOES, ARQUETIPOS_LABEL, VEREDITO_LABEL, brl } from "@/lib/equity-planner/constants";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const PRINT_CSS = `
  @page { size: A4; margin: 14mm 12mm; }
  @media print {
    html, body { background: white !important; color: #0a0a0a !important; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
    .avoid-break { page-break-inside: avoid; }
    .report-section { break-inside: avoid; }
  }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`;

export default function EquityPlannerReport() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const auto = search.get("auto") === "1";
  const [loading, setLoading] = useState(true);
  const [assess, setAssess] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [dims, setDims] = useState<any[]>([]);
  const [val, setVal] = useState<any>(null);
  const [bridge, setBridge] = useState<any[]>([]);
  const [inits, setInits] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [progresso, setProgresso] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: a } = await supabase.from("equity_assessments").select("*").eq("id", id).single();
      if (!a) { setLoading(false); return; }
      setAssess(a);
      const [{ data: c }, { data: d }, { data: v }, { data: ini }, { data: bm }, { data: pl }] = await Promise.all([
        supabase.from("equity_companies").select("*").eq("id", (a as any).company_id).maybeSingle(),
        supabase.from("equity_dimension_scores").select("*").eq("assessment_id", id),
        supabase.from("equity_valuations").select("*").eq("assessment_id", id).maybeSingle(),
        supabase.from("equity_initiatives").select("*").eq("assessment_id", id).order("prioridade"),
        supabase.from("equity_buyer_map").select("*").eq("assessment_id", id).order("prioridade"),
        supabase.from("equity_progress_log").select("*").eq("company_id", (a as any).company_id).order("created_at", { ascending: true }),
      ]);
      setCompany(c);
      setDims((d as any) || []);
      setVal(v);
      setInits((ini as any) || []);
      setBuyers((bm as any) || []);
      setProgresso((pl as any) || []);
      if (v) {
        const { data: br } = await supabase.from("equity_value_bridge_items").select("*").eq("valuation_id", (v as any).id).order("ordem");
        setBridge((br as any) || []);
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (auto && !loading && assess) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [auto, loading, assess]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="h-8 w-8 animate-spin text-black" /></div>;
  if (!assess) return <div className="min-h-screen flex items-center justify-center text-gray-500 bg-white">Diagnóstico não encontrado.</div>;

  const radarData = DIMENSOES.map((d) => ({ dim: d.label.split(" ")[0], score: dims.find((x: any) => x.dimensao === d.key)?.score ?? 0 }));
  const veredito = VEREDITO_LABEL[assess.veredito_liquidez || "vendavel_em_meses"];
  const topDestruidores = dims.filter((d: any) => d.destruidor_top).sort((a: any, b: any) => a.score - b.score);
  const sprintGroups = [1, 2, 3, 4].map((sp) => ({ sp, items: inits.filter((i: any) => i.sprint === sp) }));
  const buyerAlvo = buyers.find((b: any) => b.selecionado);
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-white text-[#0a0a0a]">
      <style>{PRINT_CSS}</style>

      {/* Toolbar — não imprime */}
      <div className="no-print sticky top-0 z-50 bg-[#0a0a0a] text-white py-3 px-6 flex items-center justify-between border-b border-[#D9F564]/30">
        <Link to={`/equity-planner/${id}`} className="text-sm inline-flex items-center gap-1 hover:text-[#D9F564]">
          <ArrowLeft className="h-4 w-4" /> Voltar ao diagnóstico
        </Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-[#D9F564] text-[#0a0a0a] font-semibold px-4 py-2 rounded hover:bg-[#D9F564]/90 text-sm">
          <Printer className="h-4 w-4" /> Baixar PDF / Imprimir
        </button>
      </div>

      <div className="max-w-[210mm] mx-auto p-8 print:p-0">
        {/* CAPA */}
        <header className="report-section border-b-4 border-[#D9F564] pb-6 mb-8 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">mari · Equity Planner</p>
            <h1 className="text-4xl font-bold leading-tight">Raio-X de Equity</h1>
            <p className="text-lg text-gray-700 mt-1 break-words">{company?.nome_empresa || "Diagnóstico executivo"}</p>
            <p className="text-xs text-gray-500 mt-2">Emitido em {today}</p>
          </div>
          <div className="text-right">
            <div className="inline-block bg-[#0a0a0a] text-[#D9F564] font-bold px-3 py-1 rounded text-xs uppercase tracking-wider">CONFIDENCIAL</div>
            <p className="text-[10px] text-gray-500 mt-2 max-w-[180px]">Documento blind preparado para uso interno do(a) sócio(a) controlador(a).</p>
          </div>
        </header>

        {/* RESUMO EXECUTIVO */}
        <section className="report-section mb-8 avoid-break">
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">IPE (0-100)</p>
              <p className="text-4xl font-bold mt-1">{assess.ipe_composto ?? "—"}</p>
              <p className="text-xs text-gray-500 mt-1">Arquétipo: {ARQUETIPOS_LABEL[assess.arquetipo_id] || assess.arquetipo_id || "—"}</p>
            </div>
            <div className="border border-gray-200 rounded p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Valor atual</p>
              <p className="text-2xl font-bold mt-1">{brl(val?.valor_atual)}</p>
              <p className="text-xs text-gray-500 mt-1">EBITDA {brl(val?.ebitda_normalizado)} × {val?.multiplo_aplicado ?? "—"}x</p>
            </div>
            <div className="border-2 border-[#D9F564] rounded p-4 bg-[#D9F564]/10">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Valor potencial</p>
              <p className="text-2xl font-bold mt-1">{brl(val?.valor_alvo)}</p>
              <p className="text-xs text-gray-700 mt-1">Δ {brl((Number(val?.valor_alvo) || 0) - (Number(val?.valor_atual) || 0))} com plano executado</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Veredito de liquidez</p>
              <p className={`text-base font-semibold mt-1 ${veredito?.tone === "good" ? "text-emerald-700" : veredito?.tone === "warn" ? "text-amber-700" : "text-rose-700"}`}>{veredito?.label || "—"}</p>
            </div>
            <div className="border border-gray-200 rounded p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Faixa de múltiplo do arquétipo</p>
              <p className="text-base font-semibold mt-1">{val?.faixa_min}x — {val?.multiplo_aplicado}x (hoje) — {val?.faixa_max}x</p>
            </div>
          </div>
          {assess.summary && (
            <div className="mt-4 border-l-4 border-[#D9F564] pl-4 text-sm text-gray-700 break-words">{assess.summary}</div>
          )}
        </section>

        {/* RAIO-X */}
        <section className="report-section mb-8 avoid-break page-break">
          <h2 className="text-xl font-bold border-b-2 border-[#0a0a0a] pb-1 mb-4">1 · Raio-X — 12 dimensões de prontidão</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded p-2">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#999" />
                  <PolarAngleAxis dataKey="dim" tick={{ fill: "#333", fontSize: 9 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#666", fontSize: 8 }} />
                  <Radar name="Score" dataKey="score" stroke="#0a0a0a" fill="#D9F564" fillOpacity={0.45} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">Top destruidores de valor</h3>
              <ul className="space-y-2">
                {topDestruidores.map((d: any) => {
                  const meta = DIMENSOES.find((x) => x.key === d.dimensao);
                  return (
                    <li key={d.dimensao} className="border-l-4 border-rose-500 pl-3 text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium break-words">{meta?.label}</span>
                        <span className="font-mono text-rose-700">{d.score}/100</span>
                      </div>
                      {d.evidencias?.[0]?.texto && <p className="text-gray-600 mt-0.5 break-words">{d.evidencias[0].texto}</p>}
                    </li>
                  );
                })}
                {topDestruidores.length === 0 && <li className="text-xs text-gray-500">Nenhum destruidor crítico identificado.</li>}
              </ul>
            </div>
          </div>
          <table className="w-full text-xs mt-5 border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 border border-gray-200">Dimensão</th>
                <th className="text-right p-2 border border-gray-200">Score</th>
                <th className="text-right p-2 border border-gray-200">Peso</th>
                <th className="text-left p-2 border border-gray-200">Evidência</th>
              </tr>
            </thead>
            <tbody>
              {DIMENSOES.map((d) => {
                const row = dims.find((x: any) => x.dimensao === d.key);
                return (
                  <tr key={d.key} className="align-top">
                    <td className="p-2 border border-gray-200 break-words">{d.label}</td>
                    <td className="p-2 border border-gray-200 text-right font-mono">{row?.score ?? "—"}</td>
                    <td className="p-2 border border-gray-200 text-right font-mono">{row?.peso ? (Number(row.peso) * 100).toFixed(0) + "%" : "—"}</td>
                    <td className="p-2 border border-gray-200 text-gray-600 break-words">{row?.evidencias?.[0]?.texto || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* VALOR */}
        <section className="report-section mb-8 page-break avoid-break">
          <h2 className="text-xl font-bold border-b-2 border-[#0a0a0a] pb-1 mb-4">2 · Valor — triangulação e bridge</h2>
          {val && (
            <div className="grid grid-cols-4 gap-3 mb-5">
              <div className="border border-gray-300 rounded p-3">
                <p className="text-[10px] uppercase text-gray-500">Múltiplos</p>
                <p className="text-lg font-bold">{brl(val.valor_atual)}</p>
                <p className="text-[10px] text-gray-500">EBITDA × {val.multiplo_aplicado}x</p>
              </div>
              {!!val.valor_dcf && (
                <div className="border border-gray-300 rounded p-3">
                  <p className="text-[10px] uppercase text-gray-500">DCF</p>
                  <p className="text-lg font-bold">{brl(val.valor_dcf)}</p>
                  <p className="text-[10px] text-gray-500">5 anos + perpetuidade</p>
                </div>
              )}
              {!!val.valor_sde && (
                <div className="border border-gray-300 rounded p-3">
                  <p className="text-[10px] uppercase text-gray-500">SDE</p>
                  <p className="text-lg font-bold">{brl(val.valor_sde)}</p>
                  <p className="text-[10px] text-gray-500">Dono-operador</p>
                </div>
              )}
              {!!val.valor_triangulado && (
                <div className="border-2 border-emerald-500 rounded p-3 bg-emerald-50">
                  <p className="text-[10px] uppercase text-gray-500">Triangulado</p>
                  <p className="text-lg font-bold text-emerald-700">{brl(val.valor_triangulado)}</p>
                  <p className="text-[10px] text-gray-500">Mix ponderado</p>
                </div>
              )}
            </div>
          )}

          {val?.addbacks && Object.keys(val.addbacks).length > 0 && (
            <div className="mb-5">
              <h3 className="font-semibold text-sm mb-2">Normalização do EBITDA</h3>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr><td className="p-2 border border-gray-200">EBITDA contábil</td><td className="p-2 border border-gray-200 text-right font-mono">{brl(val.ebitda_contabil)}</td></tr>
                  {Object.entries(val.addbacks).filter(([_, v]: any) => Number(v) > 0).map(([k, v]: any) => (
                    <tr key={k}><td className="p-2 border border-gray-200 text-gray-600">+ {k.replace(/_/g, " ")}</td><td className="p-2 border border-gray-200 text-right font-mono">{brl(Number(v))}</td></tr>
                  ))}
                  <tr className="bg-[#D9F564]/20"><td className="p-2 border border-gray-300 font-bold">EBITDA normalizado</td><td className="p-2 border border-gray-300 text-right font-mono font-bold">{brl(val.ebitda_normalizado)}</td></tr>
                </tbody>
              </table>
            </div>
          )}

          {bridge.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Value bridge — onde está o Δvalor</h3>
              <div className="bg-gray-50 rounded p-2">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={bridge.map((b: any) => ({ name: b.parcela.replace("_", " "), valor: b.delta_valor }))}>
                    <XAxis dataKey="name" tick={{ fill: "#333", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#333", fontSize: 10 }} tickFormatter={(v) => brl(v)} />
                    <Tooltip formatter={(v: any) => brl(v as number)} />
                    <Bar dataKey="valor" fill="#0a0a0a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {bridge.map((b: any) => (
                  <div key={b.parcela} className="border border-gray-200 rounded p-2 text-xs">
                    <p className="text-[10px] uppercase text-gray-500">{b.parcela.replace(/_/g, " ")}</p>
                    <p className="font-bold">{brl(b.delta_valor)}</p>
                    <p className="text-gray-600 break-words">{b.descricao}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* PLANO */}
        <section className="report-section mb-8 page-break">
          <h2 className="text-xl font-bold border-b-2 border-[#0a0a0a] pb-1 mb-4">3 · Plano — iniciativas por sprint</h2>
          {assess.migracao_arquetipo_sugerida?.para_arquetipo_id && (
            <div className="border-2 border-[#D9F564] bg-[#D9F564]/10 rounded p-3 mb-4 text-sm avoid-break">
              <p className="font-bold">🚀 Migração de arquétipo: {ARQUETIPOS_LABEL[assess.arquetipo_id] || assess.arquetipo_id} → {ARQUETIPOS_LABEL[assess.migracao_arquetipo_sugerida.para_arquetipo_id] || assess.migracao_arquetipo_sugerida.para_arquetipo_id}</p>
              <p className="text-xs text-gray-700 mt-1 break-words">{assess.migracao_arquetipo_sugerida.racional}</p>
            </div>
          )}
          {sprintGroups.map(({ sp, items }) => (
            <div key={sp} className="mb-4 avoid-break">
              <h3 className="font-bold text-sm bg-[#0a0a0a] text-white px-3 py-1 inline-block rounded">Sprint {sp} · Q{sp}</h3>
              {items.length === 0 ? (
                <p className="text-xs text-gray-500 mt-2">— sem iniciativas neste sprint —</p>
              ) : (
                <table className="w-full text-xs mt-2 border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-2 border border-gray-200 w-2/5">Iniciativa</th>
                      <th className="text-left p-2 border border-gray-200">Dimensão</th>
                      <th className="text-right p-2 border border-gray-200">Δ IPE</th>
                      <th className="text-right p-2 border border-gray-200">Δ Valor</th>
                      <th className="text-center p-2 border border-gray-200">Esforço</th>
                      <th className="text-center p-2 border border-gray-200">Prazo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i: any) => (
                      <tr key={i.id} className="align-top">
                        <td className="p-2 border border-gray-200">
                          <div className="font-semibold break-words">{i.titulo}</div>
                          {i.descricao && <div className="text-gray-600 text-[11px] mt-0.5 break-words">{i.descricao}</div>}
                          {i.tipo === "migracao_arquetipo" && <span className="inline-block bg-[#D9F564] text-[#0a0a0a] text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mt-1">Migração</span>}
                          {i.tipo === "derisk" && <span className="inline-block bg-amber-100 text-amber-800 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mt-1">De-risk</span>}
                        </td>
                        <td className="p-2 border border-gray-200 text-[11px] break-words">{DIMENSOES.find((d) => d.key === i.dimensao_alvo)?.label || i.dimensao_alvo}</td>
                        <td className="p-2 border border-gray-200 text-right font-mono">+{i.delta_ipe}</td>
                        <td className="p-2 border border-gray-200 text-right font-mono">{brl(i.delta_valor)}</td>
                        <td className="p-2 border border-gray-200 text-center capitalize">{i.esforco}</td>
                        <td className="p-2 border border-gray-200 text-center">{i.prazo_meses}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </section>

        {/* BUYER MAP */}
        <section className="report-section mb-8 page-break">
          <h2 className="text-xl font-bold border-b-2 border-[#0a0a0a] pb-1 mb-4">4 · Buyer map — compradores naturais e prêmio estratégico</h2>
          {buyerAlvo && (
            <div className="border-2 border-[#D9F564] bg-[#D9F564]/10 rounded p-3 mb-4 text-sm avoid-break">
              <p className="font-bold">🎯 Comprador-alvo definido: {buyerAlvo.nome_alvo || buyerAlvo.arquetipo_comprador}</p>
              <p className="text-xs text-gray-700 mt-1 break-words">{buyerAlvo.tese_aquisicao}</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3">
            {buyers.map((b: any, i: number) => (
              <div key={i} className={`border rounded p-3 avoid-break ${b.selecionado ? "border-2 border-[#D9F564]" : "border-gray-300"}`}>
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <h3 className="font-bold text-sm">{b.nome_alvo || "—"} <span className="text-xs font-normal text-gray-500 capitalize">· {b.arquetipo_comprador}</span></h3>
                  <span className="text-sm font-mono font-bold text-emerald-700">+{b.premio_estimado_pct?.toFixed(0)}% · {brl(b.premio_estimado_valor)}</span>
                </div>
                {b.setor_alvo && <p className="text-[10px] uppercase text-gray-500 tracking-wider">{b.setor_alvo}</p>}
                <p className="text-xs text-gray-700 mt-1 break-words">{b.tese_aquisicao}</p>
                {!!b.sinergias?.length && (
                  <div className="mt-2">
                    <p className="text-[10px] uppercase text-gray-500">Sinergias</p>
                    <ul className="grid grid-cols-2 gap-x-3 text-[11px]">
                      {b.sinergias.slice(0, 6).map((s: string, idx: number) => (
                        <li key={idx} className="break-words">▸ {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {!!b.exemplos_targets?.length && (
                  <p className="text-[10px] text-gray-600 mt-2 break-words"><span className="uppercase text-gray-500">Exemplos:</span> {b.exemplos_targets.slice(0, 6).join(" · ")}</p>
                )}
                {b.racional_premio && (
                  <p className="text-[11px] text-gray-600 italic mt-2 break-words">Racional do prêmio: {b.racional_premio}</p>
                )}
              </div>
            ))}
            {buyers.length === 0 && <p className="text-sm text-gray-500">Sem buyer map disponível.</p>}
          </div>
        </section>

        {/* PROGRESSO */}
        {progresso.length >= 2 && (
          <section className="report-section mb-8 avoid-break">
            <h2 className="text-xl font-bold border-b-2 border-[#0a0a0a] pb-1 mb-4">5 · Loop de re-medição</h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-2 border border-gray-200">#</th>
                  <th className="text-left p-2 border border-gray-200">Data</th>
                  <th className="text-right p-2 border border-gray-200">IPE</th>
                  <th className="text-right p-2 border border-gray-200">Valor atual</th>
                  <th className="text-right p-2 border border-gray-200">Valor potencial</th>
                  <th className="text-left p-2 border border-gray-200">Arquétipo</th>
                </tr>
              </thead>
              <tbody>
                {progresso.map((p: any, idx: number) => (
                  <tr key={p.id}>
                    <td className="p-2 border border-gray-200">#{idx + 1}</td>
                    <td className="p-2 border border-gray-200">{new Date(p.created_at).toLocaleString("pt-BR")}</td>
                    <td className="p-2 border border-gray-200 text-right font-mono">{p.ipe}</td>
                    <td className="p-2 border border-gray-200 text-right font-mono">{brl(p.valor)}</td>
                    <td className="p-2 border border-gray-200 text-right font-mono">{brl(p.valor_alvo)}</td>
                    <td className="p-2 border border-gray-200 break-words">{ARQUETIPOS_LABEL[p.arquetipo_id] || p.arquetipo_id || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* RODAPÉ */}
        <footer className="mt-12 pt-4 border-t border-gray-300 text-[10px] text-gray-500">
          <p><strong>mari · Equity Planner</strong> — documento gerado em {today}. Material confidencial e estritamente reservado ao(à) sócio(a) controlador(a) e seus assessores.</p>
          <p className="mt-1">Valores apurados por modelo proprietário multi-método (múltiplos comparáveis, DCF, SDE) sobre informações declaradas e documentos extraídos. Sujeito a refinamento em due diligence.</p>
        </footer>
      </div>
    </div>
  );
}
