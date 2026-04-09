import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CapitalSimulator } from '@/components/capital/CapitalSimulator';
import { MapPin, TrendingUp, Building2 } from 'lucide-react';

const cities: Record<string, {
  name: string; state: string; title: string; description: string;
  stats: { label: string; value: string }[];
}> = {
  'sao-paulo': {
    name: 'São Paulo',
    state: 'SP',
    title: 'Captação de Recursos em São Paulo',
    description: 'São Paulo é o maior centro financeiro da América Latina. Empresas paulistas têm acesso a uma ampla rede de bancos, fundos e investidores anjo através da Vispe.',
    stats: [
      { label: 'Provedores ativos', value: '25+' },
      { label: 'Captações realizadas', value: '150+' },
      { label: 'Ticket médio', value: 'R$ 1.5M' },
    ],
  },
  'rio-de-janeiro': {
    name: 'Rio de Janeiro',
    state: 'RJ',
    title: 'Captação de Recursos no Rio de Janeiro',
    description: 'O Rio de Janeiro possui um ecossistema vibrante de investidores e fundos focados em energia, turismo, tecnologia e serviços.',
    stats: [
      { label: 'Provedores ativos', value: '18+' },
      { label: 'Captações realizadas', value: '90+' },
      { label: 'Ticket médio', value: 'R$ 1.1M' },
    ],
  },
  'belo-horizonte': {
    name: 'Belo Horizonte',
    state: 'MG',
    title: 'Captação de Recursos em Belo Horizonte',
    description: 'BH é referência em startups e empresas de tecnologia. A Vispe conecta empresas mineiras com investidores locais e nacionais.',
    stats: [
      { label: 'Provedores ativos', value: '12+' },
      { label: 'Captações realizadas', value: '55+' },
      { label: 'Ticket médio', value: 'R$ 800K' },
    ],
  },
  curitiba: {
    name: 'Curitiba',
    state: 'PR',
    title: 'Captação de Recursos em Curitiba',
    description: 'Curitiba e região metropolitana têm forte presença industrial e de serviços. A plataforma Vispe facilita o acesso a capital para PMEs paranaenses.',
    stats: [
      { label: 'Provedores ativos', value: '10+' },
      { label: 'Captações realizadas', value: '40+' },
      { label: 'Ticket médio', value: 'R$ 700K' },
    ],
  },
};

export default function CapitalByCity() {
  const { slug } = useParams<{ slug: string }>();
  const city = cities[slug || ''];

  if (!city) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Cidade não encontrada</h1>
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
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
              <MapPin className="h-5 w-5" />
              <span>{city.name}, {city.state}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{city.title}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{city.description}</p>
          </div>
        </section>

        <section className="container max-w-4xl py-12">
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            {city.stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="p-6 text-center">
                  <p className="text-2xl font-bold text-primary">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-center mb-6">Simule sua captação em {city.name}</h2>
            <CapitalSimulator />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
