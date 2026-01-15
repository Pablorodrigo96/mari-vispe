import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { ValuationHero } from '@/components/valuation/ValuationHero';
import { MethodologySection } from '@/components/valuation/MethodologySection';
import { TrustSection } from '@/components/valuation/TrustSection';
import { ValuationTestimonials } from '@/components/valuation/ValuationTestimonials';
import { ValuationFooterCTA } from '@/components/valuation/ValuationFooterCTA';
import { ValuationWizard } from '@/components/valuation/ValuationWizard';

const Valuation = () => {
  const [showWizard, setShowWizard] = useState(false);

  const handleStartDiagnostic = () => {
    setShowWizard(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLanding = () => {
    setShowWizard(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (showWizard) {
    return <ValuationWizard onBack={handleBackToLanding} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ValuationHero onStartDiagnostic={handleStartDiagnostic} />
      <MethodologySection />
      <TrustSection />
      <ValuationTestimonials />
      <ValuationFooterCTA onStartDiagnostic={handleStartDiagnostic} />
    </div>
  );
};

export default Valuation;
