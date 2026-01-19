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
import { ValuationPaymentModal } from '@/components/valuation/ValuationPaymentModal';
import { useAuth } from '@/contexts/AuthContext';
import { useValuationAccess } from '@/hooks/useValuationAccess';
import { toast } from 'sonner';

type ViewState = 'landing' | 'free-wizard' | 'dcf-wizard';

const Valuation = () => {
  const [view, setView] = useState<ViewState>('landing');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'multiples' | 'dcf'>('multiples');
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canUseMultiples, canUseDCF, loading } = useValuationAccess();

  const handleSelectFree = () => {
    // Verificar login
    if (!user) {
      toast.info('Faça login para fazer seu valuation');
      navigate('/auth?redirect=/valuation');
      return;
    }

    // Verificar acesso
    if (!canUseMultiples()) {
      setPaymentType('multiples');
      setShowPaymentModal(true);
      return;
    }

    setView('free-wizard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectDCF = () => {
    // Verificar login
    if (!user) {
      toast.info('Faça login para acessar o Valuation DCF');
      navigate('/auth?redirect=/valuation');
      return;
    }

    // Verificar acesso
    if (!canUseDCF()) {
      setPaymentType('dcf');
      setShowPaymentModal(true);
      return;
    }

    setView('dcf-wizard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLanding = () => {
    setView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBuyMultiples = () => {
    setPaymentType('multiples');
    setShowPaymentModal(true);
  };

  const handleBuyDCF = () => {
    setPaymentType('dcf');
    setShowPaymentModal(true);
  };

  const handleSubscribeMaster = () => {
    // Stripe não configurado ainda
    toast.info('Assinatura do Plano Master em breve!');
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
      <ValuationTypeSelector 
        onSelectFree={handleSelectFree} 
        onSelectDCF={handleSelectDCF}
        onBuyMultiples={handleBuyMultiples}
        onBuyDCF={handleBuyDCF}
        onSubscribeMaster={handleSubscribeMaster}
      />
      <MethodologySection />
      <TrustSection />
      <ValuationTestimonials />
      <ValuationFooterCTA onStartDiagnostic={handleSelectFree} />

      {/* Payment Modal */}
      <ValuationPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        type={paymentType}
        onSubscribeMaster={handleSubscribeMaster}
      />
    </div>
  );
};

export default Valuation;
