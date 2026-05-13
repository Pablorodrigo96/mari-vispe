import { useState } from 'react';
import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { PublicFooter as Footer } from '@/components/layout/PublicFooter';
import { CapitalSimulator } from '@/components/capital/CapitalSimulator';
import { CapitalSocialProof } from '@/components/capital/CapitalSocialProof';
import { CapitalComparison } from '@/components/capital/CapitalComparison';
import { CapitalHowItWorks } from '@/components/capital/CapitalHowItWorks';
import { CapitalFAQ } from '@/components/capital/CapitalFAQ';
import { CapitalFinalCTA } from '@/components/capital/CapitalFinalCTA';
import { CapitalLeadModal } from '@/components/capital/CapitalLeadModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, MessageCircle } from 'lucide-react';
import { MariBrandStamp } from '@/components/brand/MariBrandStamp';
import { PageHeaderHint } from '@/components/ui/PageHeaderHint';
import type { SimulatorInputs, ScoringResult } from '@/lib/capitalScoring';
import { Seo } from '@/components/seo/Seo';

export type CapitalObjective = 'giro' | 'expansao' | 'refinanciamento' | 'socio';

export default function Capital() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [simulatorInputs, setSimulatorInputs] = useState<SimulatorInputs | null>(null);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);

  const handleResult = (inputs: SimulatorInputs, result: ScoringResult) => {
    setSimulatorInputs(inputs);
    setScoringResult(result);
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Captação de Capital para PMEs — mari"
        description="Dívida, equity ou socio estratégico para sua empresa. Simule em 60 segundos e fale com um especialista."
        path="/capital"
      />
      <Header />
      <main>
        {/* Hero + Simulator */}
        <section className="relative py-16 lg:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-background to-primary/5" />
          <MariBrandStamp position="tr" tone="carbon" size={560} opacity={0.05} />
          <div className="container mx-auto px-4 lg:px-8 relative">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left: Copy */}
              <div className="space-y-6">
                <Badge variant="outline" className="text-accent border-accent">
                  Motor de Captação Vispe
                </Badge>
                <h1 className="text-4xl lg:text-5xl font-black text-foreground leading-tight">
                  Capte de R$ 10 mil a R$ 5 milhões{' '}
                  <span className="text-accent">sem sair do digital</span>
                  <PageHeaderHint pageKey="capital" className="ml-2 align-middle" />
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl">
                  Simule agora, descubra seu score de aprovação e receba propostas
                  de crédito ou investidores em minutos. Sem burocracia, sem fila de banco.
                </p>

                {/* CTA post-result */}
                {scoringResult && (
                  <div className="bg-card border border-accent/30 rounded-xl p-6 space-y-4 animate-fade-in">
                    <p className="font-semibold text-foreground">
                      Seu score: <span className="text-accent">{scoringResult.score}%</span> — {scoringResult.scoreLabel}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Receba o relatório completo em PDF com análise detalhada e converse com um especialista.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Receber relatório + falar com especialista
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Simulator */}
              <CapitalSimulator onResult={handleResult} />
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <CapitalSocialProof />

        {/* Comparison chart - only show if we have results */}
        {scoringResult && simulatorInputs && (
          <CapitalComparison amount={simulatorInputs.amount} score={scoringResult.score} />
        )}

        {/* How it works */}
        <CapitalHowItWorks />

        {/* FAQ */}
        <CapitalFAQ />

        {/* Final CTA */}
        <CapitalFinalCTA />
      </main>
      <Footer />

      <CapitalLeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialAmount={simulatorInputs?.amount || 500000}
        initialObjective={(simulatorInputs?.objective as CapitalObjective) || 'giro'}
        simulatorData={simulatorInputs && scoringResult ? {
          sector: simulatorInputs.sector,
          companyAge: simulatorInputs.companyAge,
          approvalScore: scoringResult.score,
          monthlyRevenue: simulatorInputs.monthlyRevenue,
        } : undefined}
      />
    </div>
  );
}
