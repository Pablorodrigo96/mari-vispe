import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, FileText, Sparkles, TrendingUp } from 'lucide-react';
import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanosPerfeitos } from '@/hooks/usePlanosPerfeitos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCompact = (n: number | null) => {
  if (!n) return 'N/D';
  if (n >= 1_000_000_000) return `R$ ${(n / 1_000_000_000).toFixed(2).replace('.', ',')} Bi`;
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')} Mi`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)} mil`;
  return `R$ ${n.toFixed(0)}`;
};

const viabBadge: Record<string, string> = {
  green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  yellow: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  red: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

const MeusPlanosPerfeitos = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: planos = [], isLoading } = usePlanosPerfeitos();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth?redirect=/meus-planos-perfeitos');
  }, [authLoading, user, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 container mx-auto px-4 text-center text-muted-foreground animate-pulse">Carregando…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/valuation')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para Valuation
          </button>

          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-accent" />
                <p className="text-xs uppercase tracking-widest text-accent font-bold">O Plano Perfeito</p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Meus Planos</h1>
              <p className="text-sm text-muted-foreground mt-1">Histórico das suas simulações.</p>
            </div>
            <Button onClick={() => navigate('/valuation/plano-perfeito?novo=1')}>
              Novo Plano
            </Button>
          </div>

          {planos.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum Plano Perfeito ainda</h3>
              <p className="text-muted-foreground mb-6">Crie seu primeiro plano para ver o histórico aqui.</p>
              <Button onClick={() => navigate('/valuation/plano-perfeito?novo=1')}>Traçar Meu Plano</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {planos.map((p) => (
                <div key={p.id} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-accent/15 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-foreground break-words">
                            Meta {formatCompact(p.valuation_meta)}
                          </h3>
                          {p.viabilidade && (
                            <Badge variant="outline" className={`${viabBadge[p.viabilidade] || ''} text-xs`}>
                              {p.viabilidade === 'green' ? 'Viável' : p.viabilidade === 'yellow' ? 'Atenção' : 'Reavaliar'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(p.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          {' · Valuation atual '}{formatCompact(p.valuation_atual)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Investimento mensal</p>
                      <p className="text-lg font-bold text-accent tabular-nums">
                        {formatCompact(p.investimento_mensal)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MeusPlanosPerfeitos;
