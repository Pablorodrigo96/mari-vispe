import { useMemo, useState } from "react";
import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";
import { Search } from "lucide-react";

const termos: { termo: string; def: string }[] = [
  { termo: "Aporte", def: "Valor que o investidor coloca em um ativo ou oferta." },
  { termo: "Ativo", def: "Bem ou direito de valor econômico — ações, cotas, tokens, recebíveis." },
  { termo: "Blockchain", def: "Rede descentralizada que registra transações de forma imutável e auditável." },
  { termo: "CDB", def: "Certificado de Depósito Bancário, título de dívida emitido por bancos." },
  { termo: "Compliance", def: "Conformidade com leis, normas e políticas regulatórias." },
  { termo: "Custódia", def: "Serviço de guarda e registro dos ativos em nome do investidor." },
  { termo: "CVM", def: "Comissão de Valores Mobiliários, órgão regulador do mercado de capitais brasileiro." },
  { termo: "CVM 88", def: "Resolução que regula crowdfunding de investimento no Brasil." },
  { termo: "Debênture", def: "Título de dívida emitido por empresas para captar recursos." },
  { termo: "Diversificação", def: "Estratégia de distribuir o capital entre diferentes ativos para reduzir risco." },
  { termo: "Dívida", def: "Modalidade de investimento em que você empresta capital e recebe juros." },
  { termo: "Due diligence", def: "Processo de análise detalhada de uma empresa antes do investimento." },
  { termo: "Equity", def: "Participação societária em uma empresa." },
  { termo: "Iliquidez", def: "Dificuldade de transformar um ativo em dinheiro rapidamente." },
  { termo: "IR", def: "Imposto de Renda incidente sobre rendimentos." },
  { termo: "KYC", def: "Know Your Customer — processo regulatório de identificação do investidor." },
  { termo: "Liquidez", def: "Facilidade de converter um ativo em dinheiro." },
  { termo: "Lock-up", def: "Período em que o ativo não pode ser vendido." },
  { termo: "Marcação a mercado", def: "Atualização do valor do ativo conforme o mercado." },
  { termo: "Oferta primária", def: "Primeira vez que o ativo é ofertado ao público." },
  { termo: "Oferta secundária", def: "Negociação de ativo entre investidores após emissão primária." },
  { termo: "Patrimônio líquido", def: "Diferença entre ativos e passivos da empresa." },
  { termo: "Pix", def: "Sistema brasileiro de pagamentos instantâneos." },
  { termo: "Rentabilidade", def: "Retorno percentual obtido sobre o valor investido." },
  { termo: "Risco", def: "Probabilidade de perda total ou parcial do capital investido." },
  { termo: "Suitability", def: "Análise do perfil do investidor para adequação de produtos." },
  { termo: "Token", def: "Representação digital de um ativo em rede blockchain." },
  { termo: "Valuation", def: "Processo de estimar o valor econômico de uma empresa." },
  { termo: "Volatilidade", def: "Intensidade da variação de preço de um ativo ao longo do tempo." },
  { termo: "Yield", def: "Rendimento anual de um investimento em relação ao seu preço." },
];

export default function InvestirDicionario() {
  const [q, setQ] = useState("");
  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return termos;
    return termos.filter((t) => t.termo.toLowerCase().includes(s) || t.def.toLowerCase().includes(s));
  }, [q]);

  const grupos = useMemo(() => {
    const g: Record<string, typeof termos> = {};
    filtrados.forEach((t) => {
      const l = t.termo[0].toUpperCase();
      (g[l] ||= []).push(t);
    });
    return g;
  }, [filtrados]);

  return (
    <InstitutionalPage
      kicker="Dicionário de finanças"
      title="O mercado em linguagem simples."
      subtitle="Mais de 30 termos do universo de investimentos explicados sem juridiquês."
      crumbs={[{ label: "Ajuda", to: "/investir/ajuda" }, { label: "Dicionário" }]}
      cta={false}
    >
      <SectionBand tone="bone">
        <div className="max-w-3xl mx-auto">
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-carbon/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              placeholder="Buscar termo..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-carbon/10 text-carbon placeholder:text-carbon/40 focus:outline-none focus:border-carbon/40"
            />
          </div>
          {Object.keys(grupos).sort().map((letra) => (
            <div key={letra} className="mb-8">
              <div className="text-2xl font-semibold text-carbon border-b border-carbon/10 pb-2 mb-4">
                {letra}
              </div>
              <dl className="space-y-4">
                {grupos[letra].map((t) => (
                  <div key={t.termo}>
                    <dt className="font-semibold text-carbon">{t.termo}</dt>
                    <dd className="text-sm text-carbon/70 mt-1 leading-relaxed">{t.def}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          {filtrados.length === 0 && (
            <div className="text-center text-carbon/50 py-12">Nenhum termo encontrado.</div>
          )}
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}
