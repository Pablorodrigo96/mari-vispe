import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  { q: 'Qual o valor mínimo e máximo de captação?', a: 'Trabalhamos com captações de R$ 10 mil a R$ 5 milhões. Para valores acima, entre em contato com nossa equipe para uma análise personalizada.' },
  { q: 'Quanto tempo leva para receber o recurso?', a: 'Via crédito, o prazo médio é de 7 a 15 dias úteis após aprovação. Para equity, depende da rodada com investidores, geralmente entre 30 e 90 dias.' },
  { q: 'Preciso ter CNPJ para solicitar?', a: 'Sim, é necessário ter CNPJ ativo. Aceitamos MEI, ME, EPP e demais portes empresariais.' },
  { q: 'O que é captação via Equity?', a: 'É quando você vende uma participação da sua empresa para um investidor em troca de capital. O investidor se torna sócio e compartilha os riscos e resultados do negócio.' },
  { q: 'Qual a diferença entre Crédito e Equity?', a: 'No crédito, você toma dinheiro emprestado e paga com juros. No equity, você vende uma fatia da empresa sem gerar dívida. A escolha depende do momento e perfil da empresa.' },
  { q: 'Como é calculado o Score de Aprovação?', a: 'O score considera faturamento vs valor solicitado, tempo de empresa, setor de atuação e objetivo da captação. É uma estimativa que orienta a análise.' },
  { q: 'Quais documentos são necessários?', a: 'Básico: CNPJ, faturamento dos últimos 12 meses e DRE/Balancete. Para valores maiores, podemos solicitar documentos adicionais.' },
  { q: 'A plataforma cobra alguma taxa?', a: 'A simulação e análise inicial são gratuitas. Cobramos uma taxa de sucesso apenas quando o recurso é efetivamente liberado.' },
  { q: 'Meus dados estão seguros?', a: 'Sim. Seguimos rigorosamente a LGPD e utilizamos criptografia de ponta a ponta. Seus dados financeiros nunca são compartilhados sem autorização.' },
  { q: 'Posso usar para refinanciar dívidas existentes?', a: 'Sim, o refinanciamento é uma das opções. Ajudamos a trocar dívidas caras por linhas mais baratas, reduzindo o custo financeiro da empresa.' },
];

export function CapitalFAQ() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-lg text-muted-foreground">
            Tudo o que você precisa saber sobre captação de recursos
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-xl px-6">
              <AccordionTrigger className="text-left text-foreground hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
