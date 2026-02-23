import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { ValuationTypeSelector } from '@/components/valuation/ValuationTypeSelector';
import { MethodologySection } from '@/components/valuation/MethodologySection';
import { TrustSection } from '@/components/valuation/TrustSection';
import { ValuationTestimonials } from '@/components/valuation/ValuationTestimonials';
import { ValuationFooterCTA } from '@/components/valuation/ValuationFooterCTA';
import { ValuationPaymentModal } from '@/components/valuation/ValuationPaymentModal';
import { useAuth } from '@/contexts/AuthContext';
import { useValuationAccess } from '@/hooks/useValuationAccess';
import { toast } from 'sonner';

const Valuation = () => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'multiples' | 'dcf'>('multiples');
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canUseMultiples, canUseDCF } = useValuationAccess();

  const handleSelectFree = () => {
    if (!user) {
      toast.info('Faça login para fazer seu valuation');
      navigate('/auth?redirect=/valuation/multiplos');
      return;
    }
    if (!canUseMultiples()) {
      setPaymentType('multiples');
      setShowPaymentModal(true);
      return;
    }
    navigate('/valuation/multiplos');
  };

  const handleSelectDCF = () => {
    if (!user) {
      toast.info('Faça login para acessar o Valuation DCF');
      navigate('/auth?redirect=/valuation/dcf');
      return;
    }
    if (!canUseDCF()) {
      setPaymentType('dcf');
      setShowPaymentModal(true);
      return;
    }
    navigate('/valuation/dcf');
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
    setPaymentType('multiples');
    setShowPaymentModal(true);
  };

  const handleOpenCertifier = () => {
    if (!user) {
      toast.info('Faça login para usar o Certificador');
      navigate('/auth?redirect=/valuation/certificador');
      return;
    }
    navigate('/valuation/certificador');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ValuationTypeSelector 
        onSelectFree={handleSelectFree} 
        onSelectDCF={handleSelectDCF}
        onBuyMultiples={handleBuyMultiples}
        onBuyDCF={handleBuyDCF}
        onSubscribeMaster={handleSubscribeMaster}
        onOpenCertifier={handleOpenCertifier}
      />
      <MethodologySection />
      <TrustSection />
      <ValuationTestimonials />
      <ValuationFooterCTA onStartDiagnostic={handleSelectFree} />

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
