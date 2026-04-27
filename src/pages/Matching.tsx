import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { Footer } from '@/components/layout/Footer';
import { MatchingHero } from '@/components/matching/MatchingHero';
import { CompanySearchCard } from '@/components/matching/CompanySearchCard';
import { NationalSearchPanel } from '@/components/matching/NationalSearchPanel';

export default function Matching() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MatchingHero />
      <CompanySearchCard />

      {/* Base Nacional de Empresas */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Base Nacional de Empresas</h2>
            <p className="text-muted-foreground mt-1">
              Pesquise entre mais de 5 milhões de empresas ativas da Receita Federal
            </p>
          </div>
          <NationalSearchPanel />
        </div>
      </section>

      <Footer />
    </div>
  );
}
