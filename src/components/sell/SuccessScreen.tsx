import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const SuccessScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="text-center py-8 animate-fade-in">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-12 h-12 text-green-600" />
      </div>

      <h2 className="text-3xl font-bold text-foreground mb-4">
        Anúncio Enviado com Sucesso!
      </h2>

      <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
        Sua empresa já está na fila para análise. Em breve você receberá um
        e-mail com a confirmação da publicação.
      </p>

      <div className="bg-gradient-to-r from-gold/10 to-amber-100/50 border border-gold/20 rounded-xl p-6 mb-8 max-w-lg mx-auto">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-gold" />
          <h3 className="text-lg font-semibold text-foreground">
            Destaque seu Anúncio
          </h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Anúncios em destaque recebem <strong>5x mais visualizações</strong> e
          aparecem no topo das buscas.
        </p>
        <Button className="gradient-gold text-white w-full sm:w-auto">
          Ver Planos Premium
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/sell')}
          className="w-full sm:w-auto"
        >
          Anunciar Outro Negócio
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate('/marketplace')}
          className="w-full sm:w-auto"
        >
          Explorar Marketplace
        </Button>
      </div>
    </div>
  );
};

export default SuccessScreen;
