import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import SellWizard from '@/components/sell/SellWizard';

const Vender = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Anuncie sua Empresa
              </h1>
              <p className="text-muted-foreground">
                Preencha os dados abaixo para cadastrar sua empresa no marketplace
              </p>
            </div>
            
            <SellWizard />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Vender;
