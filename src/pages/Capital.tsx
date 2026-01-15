import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CapitalHero } from '@/components/capital/CapitalHero';
import { CapitalHowItWorks } from '@/components/capital/CapitalHowItWorks';
import { EquitySection } from '@/components/capital/EquitySection';
import { TrustLogos } from '@/components/capital/TrustLogos';
import { MediaSection } from '@/components/capital/MediaSection';
import { CapitalLeadModal } from '@/components/capital/CapitalLeadModal';

export type CapitalObjective = 'giro' | 'expansao' | 'refinanciamento' | 'socio';

export default function Capital() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(500000);
  const [objective, setObjective] = useState<CapitalObjective>('giro');

  const handleOpenModal = (obj?: CapitalObjective, amount?: number) => {
    if (obj) setObjective(obj);
    if (amount) setSelectedAmount(amount);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <CapitalHero 
          onRequestProposal={handleOpenModal} 
          selectedAmount={selectedAmount}
          setSelectedAmount={setSelectedAmount}
        />
        <CapitalHowItWorks />
        <EquitySection onOpenModal={handleOpenModal} />
        <TrustLogos />
        <MediaSection />
      </main>
      <Footer />
      
      <CapitalLeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        initialAmount={selectedAmount}
        initialObjective={objective}
      />
    </div>
  );
}
