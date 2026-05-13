import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { Footer } from '@/components/layout/Footer';
import NewListingWizard from '@/components/sell/wizard/NewListingWizard';
import { AnonymityDisclaimer } from '@/components/sell/AnonymityDisclaimer';
import { MariBrandStamp } from '@/components/brand/MariBrandStamp';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeaderHint } from '@/components/ui/PageHeaderHint';
import { Seo } from '@/components/seo/Seo';

const Vender = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth?redirect=/vender');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16 relative overflow-hidden">
        <MariBrandStamp position="tr" tone="carbon" size={520} opacity={0.04} showWordmark={false} />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-[10px] uppercase tracking-[0.4em] text-accent mb-3">designed forward</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 inline-flex items-center justify-center">
                Anuncie sua Empresa<PageHeaderHint pageKey="vender" />
              </h1>
              <p className="text-muted-foreground">
                Preencha os dados abaixo para cadastrar sua empresa no marketplace
              </p>
            </div>

            <AnonymityDisclaimer variant="full" />

            <NewListingWizard />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Vender;
