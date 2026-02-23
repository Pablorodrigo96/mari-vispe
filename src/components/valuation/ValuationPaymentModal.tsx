import { useState } from 'react';
import { Crown, CreditCard, Check, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { VALUATION_PRICES } from '@/hooks/useValuationAccess';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ValuationPaymentModalProps {
  open: boolean;
  onClose: () => void;
  type: 'multiples' | 'dcf';
  onSubscribeMaster?: () => void;
  onBuySingle?: () => void;
}

const formatPrice = (cents: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
};

export const ValuationPaymentModal = ({
  open,
  onClose,
  type,
}: ValuationPaymentModalProps) => {
  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingMaster, setLoadingMaster] = useState(false);
  
  const price = VALUATION_PRICES[type];
  const typeName = type === 'multiples' ? 'Múltiplos de Mercado' : 'Fluxo de Caixa Descontado';

  const masterFeatures = [
    '5 Valuations por Múltiplos/mês',
    '3 Valuations DCF/mês',
    'Relatórios em PDF',
    'Suporte prioritário',
    'Histórico completo',
  ];

  const handleBuySingle = async () => {
    setLoadingSingle(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { type },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        onClose();
      }
    } catch (err) {
      console.error('Error creating checkout:', err);
      toast.error('Erro ao iniciar pagamento. Tente novamente.');
    } finally {
      setLoadingSingle(false);
    }
  };

  const handleSubscribeMaster = async () => {
    setLoadingMaster(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { type: 'master' },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        onClose();
      }
    } catch (err) {
      console.error('Error creating checkout:', err);
      toast.error('Erro ao iniciar pagamento. Tente novamente.');
    } finally {
      setLoadingMaster(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            Acesso ao Valuation
          </DialogTitle>
          <DialogDescription className="text-center">
            Você não tem créditos disponíveis para {typeName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Single Purchase Option */}
          <div className="border border-border rounded-xl p-5 hover:border-muted-foreground/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Compra Avulsa</h3>
                <p className="text-sm text-muted-foreground">{typeName}</p>
              </div>
            </div>

            <div className="mb-4">
              <span className="text-2xl font-bold text-foreground">{formatPrice(price)}</span>
              <span className="text-muted-foreground ml-1">único</span>
            </div>

            <ul className="space-y-2 mb-4">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                1 Valuation completo
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                Relatório em PDF
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                Acesso imediato
              </li>
            </ul>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleBuySingle}
              disabled={loadingSingle || loadingMaster}
            >
              {loadingSingle ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                `Comprar por ${formatPrice(price)}`
              )}
            </Button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-background px-3 text-sm text-muted-foreground">
              ou
            </span>
          </div>

          {/* Master Plan Option */}
          <div className="border-2 border-accent rounded-xl p-5 relative bg-gradient-to-b from-accent/5 to-transparent">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                MELHOR CUSTO-BENEFÍCIO
              </span>
            </div>

            <div className="flex items-center gap-3 mb-3 mt-2">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">Plano Master</h3>
                <p className="text-sm text-muted-foreground">Acesso completo</p>
              </div>
            </div>

            <div className="mb-4">
            <span className="text-2xl font-bold text-foreground">R$ 697</span>
            <span className="text-muted-foreground">/mês</span>
            </div>

            <ul className="space-y-2 mb-4">
              {masterFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-accent" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={handleSubscribeMaster}
              disabled={loadingSingle || loadingMaster}
            >
              {loadingMaster ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Assinar Plano Master'
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-2">
          Pagamento seguro processado pelo Stripe
        </p>
      </DialogContent>
    </Dialog>
  );
};
