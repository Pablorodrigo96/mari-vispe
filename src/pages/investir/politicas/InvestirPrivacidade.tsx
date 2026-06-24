import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";

const sections = [
  {
    t: "1. Quem somos",
    p: "Esta Política de Privacidade descreve como a mari (mari.invest, parte do Grupo Vispe) coleta, utiliza, compartilha e protege os dados pessoais de seus usuários, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).",
  },
  {
    t: "2. Dados que coletamos",
    p: "Coletamos dados que você fornece diretamente (nome, CPF, e-mail, telefone, endereço, dados bancários, documentos de identificação), dados de uso da plataforma (páginas visitadas, cliques, dispositivo, IP) e dados obtidos de terceiros autorizados (bureaus de crédito, listas de PEP, sistemas antifraude).",
  },
  {
    t: "3. Finalidades",
    p: "Utilizamos seus dados para: (i) cumprir obrigações regulatórias (KYC, Suitability, prevenção à lavagem); (ii) operar a plataforma e executar suas ordens; (iii) comunicar atualizações de ofertas e oportunidades; (iv) prevenir fraudes; (v) aprimorar produtos e atendimento.",
  },
  {
    t: "4. Compartilhamento",
    p: "Compartilhamos dados com: parceiros operacionais (Capitare, bureaus de crédito, gateways de pagamento), autoridades reguladoras (CVM, BACEN, COAF) quando exigido por lei, e prestadores de tecnologia (hospedagem, e-mail, analytics) sempre sob contrato de confidencialidade.",
  },
  {
    t: "5. Seus direitos",
    p: "Você pode, a qualquer momento: confirmar a existência de tratamento, acessar seus dados, corrigir dados incompletos, solicitar anonimização ou eliminação (quando aplicável), portar dados para outro fornecedor, revogar consentimento. Solicitações por privacidade@mari.invest.",
  },
  {
    t: "6. Retenção",
    p: "Mantemos seus dados pelo prazo necessário ao cumprimento das finalidades e das obrigações regulatórias (em geral, mínimo de 5 anos após o encerramento da relação, conforme exigências da CVM e BACEN).",
  },
  {
    t: "7. Segurança",
    p: "Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito (TLS), controle de acesso baseado em função, registro de auditoria e revisão periódica de fornecedores.",
  },
  {
    t: "8. Encarregado (DPO)",
    p: "Para qualquer questão sobre o tratamento dos seus dados, entre em contato com nosso Encarregado em dpo@mari.invest.",
  },
];

export default function InvestirPrivacidade() {
  return (
    <InstitutionalPage
      kicker="Privacidade"
      title="Política de Privacidade"
      subtitle="Última atualização: 24 de junho de 2026. Texto institucional — versão final sujeita a revisão jurídica."
      crumbs={[{ label: "Políticas", to: "/investir/politicas" }, { label: "Privacidade" }]}
      cta={false}
    >
      <SectionBand tone="bone">
        <div className="max-w-3xl space-y-8">
          {sections.map((s) => (
            <div key={s.t}>
              <h2 className="text-xl md:text-2xl font-semibold text-carbon">{s.t}</h2>
              <p className="mt-3 text-carbon/70 leading-relaxed">{s.p}</p>
            </div>
          ))}
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}
