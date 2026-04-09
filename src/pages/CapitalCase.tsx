import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, TrendingUp, Clock, DollarSign, Quote } from 'lucide-react';


const cases: Record<string, {
  title: string; sector: string; amount: string; timeline: string;
  description: string; testimonial: string; metrics: { label: string; value: string }[];
}> = {
  'tech-saas-sp': {
    title: 'SaaS de Gestão — São Paulo',
    sector: 'Tecnologia',
    amount: 'R$ 2.5M',
    timeline: '45 dias',
    description: 'Empresa SaaS B2B com 8 anos de mercado buscava capital de giro para expansão comercial. Através da plataforma Vispe, foi conectada a 3 fundos de investimento e fechou uma operação de crédito estruturado.',
    testimonial: 'A Vispe simplificou todo o processo. Em menos de 2 meses tínhamos o capital necessário para dobrar nossa equipe comercial.',
    metrics: [
      { label: 'Propostas recebidas', value: '5' },
      { label: 'Taxa obtida', value: '1.2% a.m.' },
      { label: 'Crescimento pós-captação', value: '+120%' },
    ],
  },
  'varejo-rj': {
    title: 'Rede de Varejo — Rio de Janeiro',
    sector: 'Varejo',
    amount: 'R$ 800K',
    timeline: '30 dias',
    description: 'Rede com 5 lojas no RJ precisava de antecipação de recebíveis para renovação de estoque sazonal. A plataforma Vispe identificou a melhor opção entre 4 provedores.',
    testimonial: 'Processo transparente e rápido. A calculadora de score nos deu confiança de que seríamos aprovados.',
    metrics: [
      { label: 'Propostas recebidas', value: '4' },
      { label: 'Economia vs banco', value: 'R$ 45K' },
      { label: 'ROI do estoque', value: '3.2x' },
    ],
  },
  'saude-mg': {
    title: 'Clínica Médica — Minas Gerais',
    sector: 'Saúde',
    amount: 'R$ 1.2M',
    timeline: '60 dias',
    description: 'Clínica multiespecialidades buscava equity para expansão com nova unidade. A Vispe conectou com investidores anjo do setor de saúde.',
    testimonial: 'Encontramos investidores que realmente entendiam nosso mercado. A Vispe fez o match perfeito.',
    metrics: [
      { label: 'Investidores matched', value: '7' },
      { label: 'Valuation', value: 'R$ 8M' },
      { label: 'Novas unidades', value: '2' },
    ],
  },
};

export default function CapitalCase() {
  const { slug } = useParams<{ slug: string }>();
  const caseData = cases[slug || ''];

  if (!caseData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Case não encontrado</h1>
            <Button asChild><Link to="/capital">Voltar para Capital</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-emerald-900 to-emerald-700 text-primary-foreground py-16">
          <div className="container max-w-4xl">
            <Link to="/capital" className="inline-flex items-center gap-1 text-sm opacity-80 hover:opacity-100 mb-6">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
            <Badge className="bg-primary-foreground/20 text-primary-foreground mb-4">{caseData.sector}</Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{caseData.title}</h1>
            <div className="flex gap-6 text-lg">
              <span className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> {caseData.amount}</span>
              <span className="flex items-center gap-2"><Clock className="h-5 w-5" /> {caseData.timeline}</span>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="container max-w-4xl py-12 space-y-10">
          <p className="text-lg text-muted-foreground leading-relaxed">{caseData.description}</p>

          <div className="grid md:grid-cols-3 gap-4">
            {caseData.metrics.map((m) => (
              <Card key={m.label}>
                <CardContent className="p-6 text-center">
                  <p className="text-3xl font-bold text-emerald-600">{m.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{m.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-muted/30">
            <CardContent className="p-8">
              <Quote className="h-8 w-8 text-emerald-600 mb-4" />
              <p className="text-lg italic leading-relaxed">{caseData.testimonial}</p>
              <p className="text-sm text-muted-foreground mt-4">— Empreendedor(a), {caseData.title}</p>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button size="lg" asChild>
              <Link to="/capital">Simular minha captação</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
