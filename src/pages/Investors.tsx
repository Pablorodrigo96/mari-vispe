import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { InvestorsHero } from '@/components/investors/InvestorsHero';
import { InvestorBenefits } from '@/components/investors/InvestorBenefits';
import { InvestmentTypes } from '@/components/investors/InvestmentTypes';
import { InvestorTestimonials } from '@/components/investors/InvestorTestimonials';
import { InvestorCTA } from '@/components/investors/InvestorCTA';
import { Seo } from '@/components/seo/Seo';

export default function Investors() {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Para Investidores — Oportunidades de M&A — mari"
        description="Acesse empresas qualificadas em janela de venda. Filtre por setor, ticket e geografia."
        path="/investors"
      />
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
