import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MatchingHero } from '@/components/matching/MatchingHero';
import { CompanySearchCard } from '@/components/matching/CompanySearchCard';

export default function Matching() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MatchingHero />
      <CompanySearchCard />
      <Footer />
    </div>
  );
}
