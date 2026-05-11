import { CheckCircle, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface ValuationSuccessProps {
  onBackToStart: () => void;
}

export const ValuationSuccess = ({ onBackToStart }: ValuationSuccessProps) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6 animate-fade-in">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
          Seu laudo está sendo processado!
        </h2>

        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-6">
          <Mail className="w-5 h-5" />
          <span>Chegará no seu e-mail em instantes.</span>
        </div>

        <p className="text-muted-foreground mb-8">
          Enquanto isso, você pode explorar nossa plataforma e conhecer empresas disponíveis no marketplace.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            onClick={onBackToStart}
          >
            Voltar ao início
          </Button>
          <Button
            asChild
            className="bg-gold hover:bg-gold/90 text-gold-foreground"
          >
            <Link to="/marketplace">
              Explorar Marketplace
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
