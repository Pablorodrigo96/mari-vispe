import { Check, FileText, Download, Shield } from 'lucide-react';

import { Lock } from 'lucide-react';

const benefits = [
  { icon: Lock, text: 'Dados criptografados e sigilosos' },
  { icon: Shield, text: 'Aceito por fundos de VC' },
  { icon: Check, text: 'Metodologia auditável' },
  { icon: Download, text: 'Download imediato em PDF' },
];

export const TrustSection = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* PDF Mockup */}
          <div className="relative flex justify-center">
            <div className="relative w-72 h-96 bg-card rounded-lg border border-border shadow-card overflow-hidden">
              {/* PDF Header */}
              <div className="bg-primary p-4 flex items-center gap-3">
                <FileText className="w-8 h-8 text-gold" />
                <div>
                  <p className="text-primary-foreground font-semibold text-sm">Laudo de Valuation</p>
                  <p className="text-primary-foreground/70 text-xs">mari</p>
                </div>
              </div>
              
              {/* PDF Content Lines */}
              <div className="p-6 space-y-4">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-4/5" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-3/5" />
                <div className="mt-6 h-20 bg-gold/10 rounded border border-gold/20" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>

              {/* Stamp */}
              <div className="absolute bottom-4 right-4 w-16 h-16 rounded-full border-2 border-gold flex items-center justify-center bg-gold/10">
                <Check className="w-8 h-8 text-gold" />
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -z-10 top-4 left-4 w-72 h-96 bg-gold/20 rounded-lg" />
          </div>

          {/* Content */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Receba um Laudo Assinado para apresentar a investidores.
            </h2>
            <p className="text-muted-foreground mb-8">
              Nosso relatório é aceito pelos principais fundos e investidores do mercado, 
              com metodologia transparente e dados auditáveis.
            </p>

            <ul className="space-y-4">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-5 h-5 text-gold" />
                  </div>
                  <span className="text-foreground font-medium">{benefit.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
