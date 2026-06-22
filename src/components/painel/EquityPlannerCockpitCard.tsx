import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, ArrowRight, TrendingUp, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';

export function EquityPlannerCockpitCard() {
  const { user } = useAuth();

  const { data: latest, isLoading } = useQuery({
    queryKey: ['equity-planner-latest', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('equity_assessments' as any)
        .select('id, status, ipe_score, valuation_estimado, valuation_potencial, promoted_mandate_id, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
    enabled: !!user,
  });

  if (isLoading) return null;

  const hasAssessment = !!latest?.id;
  const isComputed = latest?.status === 'computado';
  const gap =
    isComputed && latest?.valuation_potencial && latest?.valuation_estimado
      ? Number(latest.valuation_potencial) - Number(latest.valuation_estimado)
      : 0;

  return (
    <Card className="border-volt/30 bg-gradient-to-br from-volt/10 via-card to-card overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-lg bg-volt/15 text-volt flex items-center justify-center shrink-0">
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground text-base break-words">Equity Planner</h3>
                <Badge variant="outline" className="text-[10px] border-volt/50 text-volt uppercase tracking-wider">
                  Diagnóstico 360°
                </Badge>
                {latest?.promoted_mandate_id && (
                  <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-600 uppercase tracking-wider">
                    Mandato ativo
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 break-words">
                12 pilares, benchmark setorial e plano de 12 meses para você sair de "quanto vale hoje" para "quanto pode valer".
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {hasAssessment ? (
              <>
                <Button size="sm" asChild className="bg-volt text-carbon hover:bg-volt/90">
                  <Link to={latest.promoted_mandate_id ? `/equity-brain/crm/mandate/${latest.promoted_mandate_id}` : `/equity-planner/${latest.id}`}>
                    {latest.promoted_mandate_id ? 'Abrir mandato' : 'Continuar diagnóstico'}
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild className="bg-transparent">
                  <Link to="/meus-equity-planners">Histórico</Link>
                </Button>
              </>
            ) : (
              <Button size="sm" asChild className="bg-volt text-carbon hover:bg-volt/90">
                <Link to="/equity-planner/novo">
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Iniciar diagnóstico
                </Link>
              </Button>
            )}
          </div>
        </div>

        {isComputed && (
          <div className="grid grid-cols-3 gap-px bg-border mt-4 border border-border rounded-md overflow-hidden">
            <MiniKpi label="IPE" value={latest.ipe_score != null ? `${Number(latest.ipe_score).toFixed(0)}` : '—'} suffix="/100" />
            <MiniKpi label="Valor hoje" value={latest.valuation_estimado ? formatCurrency(Number(latest.valuation_estimado)) : '—'} />
            <MiniKpi
              label="Gap pro topo"
              value={gap > 0 ? formatCurrency(gap) : '—'}
              icon={gap > 0 ? TrendingUp : undefined}
              tone={gap > 0 ? 'emerald' : 'muted'}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniKpi({
  label,
  value,
  suffix,
  icon: Icon,
  tone = 'muted',
}: {
  label: string;
  value: string;
  suffix?: string;
  icon?: any;
  tone?: 'muted' | 'emerald';
}) {
  return (
    <div className="bg-card p-3">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p
        className={`text-sm md:text-base font-bold font-mono mt-1 flex items-center gap-1 break-words ${
          tone === 'emerald' ? 'text-emerald-500' : 'text-foreground'
        }`}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {value}
        {suffix && <span className="text-[10px] text-muted-foreground font-normal">{suffix}</span>}
      </p>
    </div>
  );
}
