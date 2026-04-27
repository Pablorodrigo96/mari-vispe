import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { CertifierWizard } from '@/components/valuation/CertifierWizard';

const ValuationCertifier = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <CertifierWizard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValuationCertifier;
