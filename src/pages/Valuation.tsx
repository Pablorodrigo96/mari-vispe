import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { ValuationTypeSelector } from '@/components/valuation/ValuationTypeSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useValuationAccess } from '@/hooks/useValuationAccess';
import { toast } from 'sonner';
import { Seo } from '@/components/seo/Seo';

// Heavy below-the-fold sections — lazy
const ValuationWhySection = lazy(() => import('@/components/valuation/ValuationWhySection').then(m => ({ default: m.ValuationWhySection })));
const ValuationHowItWorks = lazy(() => import('@/components/valuation/ValuationHowItWorks').then(m => ({ default: m.ValuationHowItWorks })));
const MethodologySection = lazy(() => import('@/components/valuation/MethodologySection').then(m => ({ default: m.MethodologySection })));
const ValuationBeforeAfter = lazy(() => import('@/components/valuation/ValuationBeforeAfter').then(m => ({ default: m.ValuationBeforeAfter })));
const TrustSection = lazy(() => import('@/components/valuation/TrustSection').then(m => ({ default: m.TrustSection })));
const ValuationTestimonials = lazy(() => import('@/components/valuation/ValuationTestimonials').then(m => ({ default: m.ValuationTestimonials })));
const ValuationFooterCTA = lazy(() => import('@/components/valuation/ValuationFooterCTA').then(m => ({ default: m.ValuationFooterCTA })));
const ValuationPaymentModal = lazy(() => import('@/components/valuation/ValuationPaymentModal').then(m => ({ default: m.ValuationPaymentModal })));

const Valuation = () => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'multiples' | 'dcf'>('multiples');
  const [showBelowFold, setShowBelowFold] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { canUseMultiples, canUseDCF } = useValuationAccess();

  useEffect(() => {
    let triggered = false;
    const trigger = () => { if (triggered) return; triggered = true; setShowBelowFold(true); };
    const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, opts?: { timeout: number }) => number);
    const handle = ric ? ric(trigger, { timeout: 1500 }) : window.setTimeout(trigger, 600);
    const onScroll = () => trigger();
    window.addEventListener('scroll', onScroll, { passive: true, once: true });
    return () => {
      if (ric && typeof handle === 'number') (window as any).cancelIdleCallback?.(handle);
      else window.clearTimeout(handle as number);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

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

  const handleBuyMultiples = () => { setPaymentType('multiples'); setShowPaymentModal(true); };
  const handleBuyDCF = () => { setPaymentType('dcf'); setShowPaymentModal(true); };
  const handleSubscribeMaster = () => { setPaymentType('multiples'); setShowPaymentModal(true); };

  const handleOpenCertifier = () => {
    if (!user) {
      toast.info('Faça login para usar o Certificador');
      navigate('/auth?redirect=/valuation/certificador');
      return;
    }
    navigate('/valuation/certificador');
  };

  const handleStartPlanoPerfeito = () => {
    navigate('/valuation/plano-perfeito');
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Valuation de Empresas — Diagnóstico Real e Potencial"
        description="Calcule o valor real, estimado e potencial da sua empresa com 3 metodologias (múltiplos, DCF e diagnóstico)."
        path="/valuation"
      />
      <Header />
      <ValuationTypeSelector
        onSelectFree={handleSelectFree}
        onSelectDCF={handleSelectDCF}
        onBuyMultiples={handleBuyMultiples}
        onBuyDCF={handleBuyDCF}
        onSubscribeMaster={handleSubscribeMaster}
        onOpenCertifier={handleOpenCertifier}
        onStartPlanoPerfeito={handleStartPlanoPerfeito}
      />


      {showBelowFold && (
        <Suspense fallback={<div className="h-[40vh]" />}>
          <ValuationWhySection />
          <ValuationHowItWorks />
          <MethodologySection />
          <ValuationBeforeAfter />
          <TrustSection />
          <ValuationTestimonials />
          <ValuationFooterCTA onStartDiagnostic={handleSelectFree} />
        </Suspense>
      )}

      {showPaymentModal && (
        <Suspense fallback={null}>
          <ValuationPaymentModal
            open={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            type={paymentType}
            onSubscribeMaster={handleSubscribeMaster}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Valuation;
