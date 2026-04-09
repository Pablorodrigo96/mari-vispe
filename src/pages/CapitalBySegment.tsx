import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CapitalSimulator } from '@/components/capital/CapitalSimulator';
import { TrendingUp, Users, DollarSign } from 'lucide-react';

const segments: Record<string, {
  name: string; title: string; description: string;
  stats: { label: string; value: string; icon: any }[];
  avgTicket: string; avgApproval: string;
}> = {
  tech: {
    name: 'Tecnologia',
    title: 'Captação de Recursos para Empresas de Tecnologia',
    description: 'O setor de tecnologia é um dos que mais recebe investimentos no Brasil. Startups e scale-ups de software, SaaS, fintechs e healthtechs encontram na Vispe o caminho mais rápido para conectar com investidores e linhas de crédito especializadas.',
    stats: [
      { label: 'Ticket médio captado', value: 'R$ 1.8M', icon: DollarSign },
      { label: 'Taxa de aprovação', value: '78%', icon: TrendingUp },
      { label: 'Providers especializados', value: '12+', icon: Users },
    ],
    avgTicket: 'R$ 1.8M',
    avgApproval: '78%',
  },
  saude: {
    name: 'Saúde',
    title: 'Captação de Recursos para o Setor de Saúde',
    description: 'Clínicas, hospitais, laboratórios e healthtechs encontram na Vispe acesso a linhas de crédito e investidores especializados no setor de saúde. O segmento conta com taxas preferenciais e prazos estendidos.',
    stats: [
      { label: 'Ticket médio captado', value: 'R$ 1.2M', icon: DollarSign },
      { label: 'Taxa de aprovação', value: '82%', icon: TrendingUp },
      { label: 'Providers especializados', value: '8+', icon: Users },
    ],
    avgTicket: 'R$ 1.2M',
    avgApproval: '82%',
  },
  varejo: {
    name: 'Varejo',
    title: 'Captação de Recursos para o Varejo',
    description: 'Redes de lojas, franquias e e-commerces podem acessar antecipação de recebíveis, capital de giro e financiamento para expansão através da plataforma Vispe.',
    stats: [
      { label: 'Ticket médio captado', value: 'R$ 600K', icon: DollarSign },
      { label: 'Taxa de aprovação', value: '85%', icon: TrendingUp },
      { label: 'Providers especializados', value: '15+', icon: Users },
    ],
    avgTicket: 'R$ 600K',
    avgApproval: '85%',
  },
  industria: {
    name: 'Indústria',
    title: 'Captação de Recursos para a Indústria',
    description: 'Indústrias de transformação, manufatura e agroindústria encontram na Vispe acesso a linhas BNDES, FINAME e investidores de private equity especializados em ativos reais.',
    stats: [
      { label: 'Ticket médio captado', value: 'R$ 2.5M', icon: DollarSign },
      { label: 'Taxa de aprovação', value: '72%', icon: TrendingUp },
      { label: 'Providers especializados', value: '10+', icon: Users },
    ],
    avgTicket: 'R$ 2.5M',
    avgApproval: '72%',
  },
};

export default function CapitalBySegment() {
  const { slug } = useParams<{ slug: string }>();
  const segment = segments[slug || ''];

  if (!segment) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Setor não encontrado</h1>
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
        <section className="bg-gradient-to-br from-primary/10 to-primary/5 py-16">
          <div className="container max-w-4xl text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{segment.title}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{segment.description}</p>
          </div>
        </section>

        <section className="container max-w-4xl py-12">
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            {segment.stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="p-6 text-center">
                  <s.icon className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-center mb-6">Simule sua captação para {segment.name}</h2>
            <CapitalSimulator />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
