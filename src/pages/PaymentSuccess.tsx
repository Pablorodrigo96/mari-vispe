import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, XCircle, ArrowRight, Calculator, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type PaymentStatus = 'loading' | 'success' | 'error';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [paymentType, setPaymentType] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const sessionId = searchParams.get('session_id');
  const type = searchParams.get('type');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId || !user) {
        setStatus('error');
        setErrorMessage('Sessão de pagamento inválida');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { session_id: sessionId },
        });

        if (error) throw error;

        if (data.success) {
          setStatus('success');
          setPaymentType(data.type);
        } else {
          setStatus('error');
          setErrorMessage(data.message || 'Pagamento não confirmado');
        }
      } catch (err) {
        console.error('Error verifying payment:', err);
        setStatus('error');
        setErrorMessage('Erro ao verificar pagamento');
      }
    };

    if (user) {
      verifyPayment();
    }
  }, [sessionId, user]);

  const getTypeLabel = () => {
    switch (paymentType) {
      case 'multiples':
        return 'Valuation por Múltiplos';
      case 'dcf':
        return 'Valuation DCF Profissional';
      case 'master':
        return 'Plano Master';
      default:
        return 'Valuation';
    }
  };

  const getTypeIcon = () => {
    if (paymentType === 'dcf') return <TrendingUp className="w-6 h-6" />;
    return <Calculator className="w-6 h-6" />;
  };

  const handleStartValuation = () => {
    navigate('/valuation');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-2xl mx-auto px-4 py-20">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Verificando pagamento...</h1>
              <p className="text-muted-foreground">
                Aguarde enquanto confirmamos seu pagamento.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Pagamento Confirmado!</h1>
              <p className="text-muted-foreground mb-6">
                Seu acesso ao <strong>{getTypeLabel()}</strong> foi liberado com sucesso.
              </p>

              <div className="bg-muted/50 rounded-xl p-6 mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                    {getTypeIcon()}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{getTypeLabel()}</p>
                    <p className="text-sm text-muted-foreground">
                      {paymentType === 'master' 
                        ? 'Assinatura mensal ativa' 
                        : '1 crédito disponível'}
                    </p>
                  </div>
                </div>

                {paymentType === 'master' && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>✓ 5 Valuations por Múltiplos/mês</p>
                    <p>✓ 3 Valuations DCF/mês</p>
                    <p>✓ Relatórios em PDF</p>
                    <p>✓ Suporte prioritário</p>
                  </div>
                )}
              </div>

              <Button onClick={handleStartValuation} size="lg" className="gap-2">
                Fazer Valuation Agora
                <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Erro no Pagamento</h1>
              <p className="text-muted-foreground mb-6">
                {errorMessage || 'Não foi possível confirmar seu pagamento.'}
              </p>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate('/valuation')}>
                  Voltar para Valuation
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Tentar Novamente
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default PaymentSuccess;
