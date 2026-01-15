import { ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const mediaItems = [
  {
    source: 'Exame',
    title: 'DealFlow conecta PMEs a investidores e revoluciona o mercado de M&A',
    date: '15 Jan 2024',
  },
  {
    source: 'Valor Econômico',
    title: 'Startup facilita acesso a crédito para pequenas empresas',
    date: '08 Dez 2023',
  },
  {
    source: 'InfoMoney',
    title: 'Plataforma de M&A cresce 300% e atrai investidores institucionais',
    date: '22 Nov 2023',
  },
];

export function MediaSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            DealFlow na Mídia
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            O que os principais veículos de comunicação dizem sobre nós.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {mediaItems.map((item, index) => (
            <Card 
              key={index} 
              className="bg-card border-border hover:border-accent/30 transition-all duration-300 group cursor-pointer"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-accent uppercase tracking-wider">
                    {item.source}
                  </span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
                
                <h3 className="text-foreground font-medium leading-relaxed mb-4 group-hover:text-accent transition-colors">
                  {item.title}
                </h3>
                
                <span className="text-sm text-muted-foreground">
                  {item.date}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
