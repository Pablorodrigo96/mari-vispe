import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { InvestorsHero } from '@/components/investors/InvestorsHero';
import { InvestorBenefits } from '@/components/investors/InvestorBenefits';
import { InvestmentTypes } from '@/components/investors/InvestmentTypes';
import { InvestorTestimonials } from '@/components/investors/InvestorTestimonials';
import { InvestorCTA } from '@/components/investors/InvestorCTA';

export default function Investors() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <InvestorsHero />
        <InvestorBenefits />
        <InvestmentTypes />
        <InvestorTestimonials />
        <InvestorCTA />
      </main>
      <Footer />
    </div>
  );
}
