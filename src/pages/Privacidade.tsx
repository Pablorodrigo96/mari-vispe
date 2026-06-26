import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Seo } from '@/components/seo/Seo';

const sections = [
  {
    t: '1. Quem somos',
    p: 'Esta Política de Privacidade descreve como a Vispe Capital ("mari", "Vispe Capital", "nós") coleta, utiliza, compartilha e protege os dados pessoais de seus usuários, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).',
  },
  {
    t: '2. Dados que coletamos',
    p: 'Coletamos dados que você fornece diretamente (nome, CPF/CNPJ, e-mail, telefone, endereço, dados bancários, documentos de identificação), dados de uso da plataforma (páginas visitadas, cliques, dispositivo, IP) e dados obtidos de terceiros autorizados (bureaus de crédito, listas de PEP, sistemas antifraude, Receita Federal).',
  },
  {
    t: '3. Finalidades',
    p: 'Utilizamos seus dados para: (i) cumprir obrigações regulatórias (KYC, Suitability, prevenção à lavagem); (ii) operar a plataforma e executar suas operações; (iii) comunicar atualizações de oportunidades; (iv) prevenir fraudes; (v) aprimorar produtos e atendimento.',
  },
  {
    t: '4. Compartilhamento',
    p: 'Compartilhamos dados com: parceiros operacionais (gateways de pagamento, bureaus de crédito, provedores de assinatura eletrônica), autoridades reguladoras (CVM, BACEN, COAF) quando exigido por lei, e prestadores de tecnologia (hospedagem, e-mail, analytics) sempre sob contrato de confidencialidade.',
  },
  {
    t: '5. Seus direitos (LGPD)',
    p: 'Você pode, a qualquer momento: confirmar a existência de tratamento, acessar seus dados, corrigir dados incompletos, solicitar anonimização ou eliminação (quando aplicável), portar dados para outro fornecedor, revogar consentimento. Solicitações por privacidade@vispe.com.br.',
  },
  {
    t: '6. Retenção',
    p: 'Mantemos seus dados pelo prazo necessário ao cumprimento das finalidades e das obrigações regulatórias (em geral, mínimo de 5 anos após o encerramento da relação, conforme exigências da CVM e BACEN).',
  },
  {
    t: '7. Segurança',
    p: 'Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito (TLS), controle de acesso baseado em função (RLS no banco), registro de auditoria e revisão periódica de fornecedores.',
  },
  {
    t: '8. Cookies',
    p: 'Utilizamos cookies essenciais (autenticação) e analíticos (medir uso). Você gerencia suas preferências pelo banner de cookies. Para detalhes, consulte nossa Política de Cookies.',
  },
  {
    t: '9. Encarregado (DPO)',
    p: 'Para qualquer questão sobre o tratamento dos seus dados, entre em contato com nosso Encarregado em dpo@vispe.com.br.',
  },
];

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Política de Privacidade e LGPD — Vispe Capital / mari"
        description="Como a Vispe Capital coleta, usa e protege os dados pessoais de seus usuários, em conformidade com a LGPD."
        path="/privacidade"
      />
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Política de Privacidade e LGPD
        </h1>
        <p className="text-center text-sm text-muted-foreground mb-12">
          Versão 2.0 — Junho de 2026 · VISPE CAPITAL CONSULTORIA EMPRESARIAL LTDA · CNPJ 31.526.112/0001-04
        </p>

        <div className="space-y-8 text-muted-foreground">
          {sections.map((s) => (
            <section key={s.t}>
              <h2 className="text-xl font-semibold text-foreground mb-3">{s.t}</h2>
              <p className="leading-relaxed break-words">{s.p}</p>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
