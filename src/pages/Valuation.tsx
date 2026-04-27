import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { ValuationTypeSelector } from '@/components/valuation/ValuationTypeSelector';
import { ValuationWhySection } from '@/components/valuation/ValuationWhySection';
import { ValuationHowItWorks } from '@/components/valuation/ValuationHowItWorks';
import { MethodologySection } from '@/components/valuation/MethodologySection';
import { ValuationBeforeAfter } from '@/components/valuation/ValuationBeforeAfter';
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
      {/* 1. Hero + Plans */}
      <ValuationTypeSelector 
        onSelectFree={handleSelectFree} 
        onSelectDCF={handleSelectDCF}
        onBuyMultiples={handleBuyMultiples}
        onBuyDCF={handleBuyDCF}
        onSubscribeMaster={handleSubscribeMaster}
        onOpenCertifier={handleOpenCertifier}
      />
      {/* 2. Why */}
      <ValuationWhySection />
      {/* 3. How it works */}
      <ValuationHowItWorks />
      {/* 4. Methodology */}
      <MethodologySection />
      {/* 5. Before vs After */}
      <ValuationBeforeAfter />
      {/* 6. Trust */}
      <TrustSection />
      {/* 7. Testimonials */}
      <ValuationTestimonials />
      {/* 8. Footer CTA */}
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
