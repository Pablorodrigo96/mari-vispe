import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Trophy, ArrowRight, User, Building2, Calculator, Banknote, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  userId: string;
  profileCompletion: number;
}

interface Quest {
  key: string;
  title: string;
  description: string;
  reward: string;
  icon: typeof User;
  done: boolean;
  ctaLabel: string;
  ctaTo: string;
}

export function ProfileQuests({ userId, profileCompletion }: Props) {
  const [counts, setCounts] = useState({ listings: 0, valuations: 0, capital: 0, equityPlanners: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [l, v, c, ep] = await Promise.all([
          supabase.from('listings').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('valuation_history' as any).select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('capital_requests').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('equity_assessments' as any).select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'computado'),
        ]);
        if (cancelled) return;
        setCounts({ listings: l.count || 0, valuations: v.count || 0, capital: c.count || 0, equityPlanners: ep.count || 0 });
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const quests: Quest[] = [
    {
      key: 'profile',
      title: 'Complete seu perfil',
      description: 'Foto, nome, telefone, CPF/CNPJ e bio',
      reward: '+ Selo Verificado',
      icon: User,
      done: profileCompletion >= 80,
      ctaLabel: profileCompletion >= 80 ? 'Concluído' : `Continuar (${profileCompletion}%)`,
      ctaTo: '#card-personal',
    },
    {
      key: 'listing',
      title: 'Anuncie sua empresa',
      description: 'Cadastre seu negócio (anonimizado por padrão)',
      reward: '+ Selo Empresarial',
      icon: Building2,
      done: counts.listings > 0,
      ctaLabel: counts.listings > 0 ? `${counts.listings} anúncio(s)` : 'Anunciar agora',
      ctaTo: '/vender',
    },
    {
      key: 'valuation',
      title: 'Faça um Valuation',
      description: 'Descubra quanto sua empresa vale hoje',
      reward: '+ Selo Estratégico',
      icon: Calculator,
      done: counts.valuations > 0,
      ctaLabel: counts.valuations > 0 ? `${counts.valuations} valuation(s)` : 'Calcular agora',
      ctaTo: '/valuation',
    },
    {
      key: 'capital',
      title: 'Solicite Captação',
      description: 'Receba propostas de crédito ou investidores',
      reward: '+ Selo Investidor',
      icon: Banknote,
      done: counts.capital > 0,
      ctaLabel: counts.capital > 0 ? 'Acompanhar' : 'Simular agora',
      ctaTo: counts.capital > 0 ? '/minhas-captacoes' : '/capital',
    },
    {
      key: 'equity-planner',
      title: 'Faça seu Equity Planner',
      description: 'Diagnóstico 360° + plano pra fechar o gap pro topo do setor',
      reward: '+ Selo Estrategista',
      icon: Target,
      done: counts.equityPlanners > 0,
      ctaLabel: counts.equityPlanners > 0 ? `${counts.equityPlanners} diagnóstico(s)` : 'Começar',
      ctaTo: counts.equityPlanners > 0 ? '/meus-equity-planners' : '/equity-planner/novo',
    },
  ];

  const doneCount = quests.filter((q) => q.done).length;
  const pct = Math.round((doneCount / quests.length) * 100);

  return (
    <Card className="border-border bg-gradient-to-br from-card to-muted/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              Sua jornada na mari
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Complete missões para subir de nível e ganhar selos.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-accent">{doneCount}/{quests.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">missões</div>
          </div>
        </div>
        <div className="pt-2">
          <Progress value={pct} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {quests.map((q) => {
          const Icon = q.icon;
          const isAnchor = q.ctaTo.startsWith('#');
          const btn = (
            <Button
              size="sm"
              variant={q.done ? 'outline' : 'default'}
              className={q.done ? 'bg-transparent' : 'bg-accent text-accent-foreground hover:bg-accent/90'}
              disabled={loading}
            >
              {q.ctaLabel}
              {!q.done && <ArrowRight className="w-3 h-3 ml-1" />}
            </Button>
          );
          return (
            <div
              key={q.key}
              className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                q.done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-background hover:border-accent/40'
              }`}
            >
              <div className={`shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                q.done ? 'bg-emerald-500/10 text-emerald-500' : 'bg-accent/10 text-accent'
              }`}>
                {q.done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground text-sm break-words">{q.title}</span>
                  <span className="text-[10px] uppercase tracking-wider text-accent/80">{q.reward}</span>
                </div>
                <p className="text-xs text-muted-foreground break-words">{q.description}</p>
              </div>
              <div className="shrink-0">
                {isAnchor ? <a href={q.ctaTo}>{btn}</a> : <Link to={q.ctaTo}>{btn}</Link>}
              </div>
            </div>
          );
        })}
        {doneCount === quests.length && (
          <div className="text-center py-2 text-sm text-emerald-500 font-medium flex items-center justify-center gap-2">
            <Trophy className="h-4 w-4" /> Todas missões concluídas — você é Embaixador mari!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
