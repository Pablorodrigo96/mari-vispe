import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { ValuationTypeSelector } from '@/components/valuation/ValuationTypeSelector';
import { MethodologySection } from '@/components/valuation/MethodologySection';
import { TrustSection } from '@/components/valuation/TrustSection';
import { ValuationTestimonials } from '@/components/valuation/ValuationTestimonials';
import { ValuationFooterCTA } from '@/components/valuation/ValuationFooterCTA';
import { ValuationWizard } from '@/components/valuation/ValuationWizard';
import { DCFWizard } from '@/components/valuation/DCFWizard';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

type ViewState = 'landing' | 'free-wizard' | 'dcf-wizard';

const Valuation = () => {
  const [view, setView] = useState<ViewState>('landing');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPaidPlan, canUseDCF } = useSubscription();

  const handleSelectFree = () => {
    setView('free-wizard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectDCF = () => {
    if (!user) {
      toast.info('Faça login para acessar o Valuation DCF');
      navigate('/auth');
      return;
    }

    if (!hasPaidPlan) {
      toast.error('O Valuation DCF está disponível apenas para assinantes dos planos Standard ou Premium.');
      return;
    }

    if (!canUseDCF()) {
      toast.error('Você atingiu o limite de valuations DCF do seu plano este mês.');
      return;
    }

    setView('dcf-wizard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLanding = () => {
    setView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (view === 'free-wizard') {
    return <ValuationWizard onBack={handleBackToLanding} />;
  }

  if (view === 'dcf-wizard') {
    return <DCFWizard onBack={handleBackToLanding} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ValuationTypeSelector onSelectFree={handleSelectFree} onSelectDCF={handleSelectDCF} />
      <MethodologySection />
      <TrustSection />
      <ValuationTestimonials />
      <ValuationFooterCTA onStartDiagnostic={handleSelectFree} />
    </div>
  );
};

export default Valuation;
