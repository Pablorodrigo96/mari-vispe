import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const FinalCTA = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-gold/10 via-gold/5 to-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Pronto para vender sua empresa?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Crie sua conta gratuitamente e conecte-se com milhares de compradores
            qualificados. O processo é rápido, seguro e confidencial.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-gold hover:bg-gold/90 text-gold-foreground text-lg px-8"
            >
              <Link to="/auth/register">
                Criar Minha Conta Grátis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            É grátis e leva menos de 2 minutos
          </p>
        </div>
      </div>
    </section>
  );
};
