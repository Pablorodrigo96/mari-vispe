import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const FinalCTA = () => {
  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 lg:px-8 text-center">
        <h2 className="text-2xl md:text-4xl font-bold mb-4">Pronto para vender sua empresa?</h2>
        <p className="text-primary-foreground/70 mb-8 max-w-2xl mx-auto">
          Anuncie gratuitamente e alcance milhares de compradores e investidores qualificados.
        </p>
        <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold">
          <Link to="/auth">Anunciar Grátis</Link>
        </Button>
      </div>
    </section>
  );
};
