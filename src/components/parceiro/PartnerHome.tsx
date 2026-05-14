import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase, ArrowRight, Calculator, Plus, CheckCircle2, AlertTriangle,
  Loader2, Target, FileText, Wallet, TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface IndicacaoRow {
  id: string;
  title: string;
  category: string;
  city: string | null;
  state: string | null;
  cnpj: string | null;
  status: string | null;
  annual_revenue: number | null;
  asking_price: number | null;
  created_at: string;
  // computed
  valuationValue: number | null;
  valuationStage: 'none' | 'multiplos' | 'completo';
  buyersCount: number;
  commissionStage: 'indicado' | 'bant' | 'valuation_anuncio' | 'fechado';
}

const COMMISSION_PCT = {
  indicado: 0.05,
  bant: 0.10,
  valuation_anuncio: 0.15,
  fechado: 0.15,
} as const;

const COMMISSION_LABEL = {
  indicado: '5% · só indicação',
  bant: '10% · reunião BANT',
  valuation_anuncio: '15% · valuation + anúncio',
  fechado: '15% · fechado 🎉',
} as const;

export function PartnerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null; company_name: string | null } | null>(null);
  const [rows, setRows] = useState<IndicacaoRow[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [profileR, listingsR] = await Promise.all([
        supabase.from('profiles').select('full_name, phone, company_name').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('listings')
          .select('id, title, category, city, state, cnpj, status, annual_revenue, asking_price, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
      setProfile(profileR.data ?? null);
      const listings = (listingsR.data ?? []) as any[];

      // Carrega valuations (pelo CNPJ ou pelo user_id) para enriquecer
      const cnpjs = listings.map(l => l.cnpj).filter(Boolean);
      const valByCnpj = new Map<string, { value: number; type: string }>();
      if (cnpjs.length > 0) {
        const { data: vals } = await supabase
          .from('valuation_history')
          .select('cnpj, valuation_type, result, created_at')
          .eq('user_id', user.id)
          .in('cnpj', cnpjs)
          .order('created_at', { ascending: false });
        (vals ?? []).forEach((v: any) => {
          if (!v.cnpj) return;
          if (valByCnpj.has(v.cnpj)) return; // mantém o mais recente
          const r: any = v.result ?? {};
          const value = Number(r.mashupValue ?? r.estimatedValue ?? r.value ?? 0);
          valByCnpj.set(v.cnpj, { value, type: v.valuation_type });
        });
      }

      // Buyers count por CNPJ (matches)
      const buyersByCnpj = new Map<string, number>();
      if (cnpjs.length > 0) {
        const { data: matches } = await (supabase as any)
          .schema('equity_brain')
          .from('matches')
          .select('cnpj')
          .eq('is_current', true)
          .in('cnpj', cnpjs);
        (matches ?? []).forEach((m: any) => {
          buyersByCnpj.set(m.cnpj, (buyersByCnpj.get(m.cnpj) ?? 0) + 1);
        });
      }

      const enriched: IndicacaoRow[] = listings.map((l) => {
        const val = l.cnpj ? valByCnpj.get(l.cnpj) : undefined;
        const valuationValue = val?.value ?? null;
        const valuationStage: IndicacaoRow['valuationStage'] =
          !val ? 'none' : val.type === 'mashup' || val.type === 'completo' ? 'completo' : 'multiplos';
        const buyersCount = l.cnpj ? buyersByCnpj.get(l.cnpj) ?? 0 : 0;
        const isPublished = l.status === 'active';
        const commissionStage: IndicacaoRow['commissionStage'] =
          isPublished && valuationStage !== 'none' ? 'valuation_anuncio'
          : valuationStage !== 'none' ? 'bant'
          : 'indicado';
        return {
          id: l.id,
          title: l.title,
          category: l.category,
          city: l.city,
          state: l.state,
          cnpj: l.cnpj,
          status: l.status,
          annual_revenue: l.annual_revenue,
          asking_price: l.asking_price,
          created_at: l.created_at,
          valuationValue,
          valuationStage,
          buyersCount,
          commissionStage,
        };
      });
      setRows(enriched);
      setLoading(false);
    })();
  }, [user]);

  // Checklist
  const checks = [
    { id: 'profile', label: 'Complete seu perfil (nome, telefone, empresa)', done: !!(profile?.full_name && profile?.phone), action: { label: 'Ajustar perfil', to: '/meu-perfil' } },
    { id: 'company', label: 'Cadastre sua primeira empresa indicada', done: rows.length > 0, action: { label: 'Cadastrar empresa', to: '/vender' } },
    { id: 'valuation', label: 'Rode um valuation por múltiplos', done: rows.some(r => r.valuationStage !== 'none'), action: { label: 'Novo valuation', to: '/valuation/multiplos' } },
    { id: 'publish', label: 'Publique o anúncio para receber matches', done: rows.some(r => r.status === 'active'), action: { label: 'Meus anúncios', to: '/meus-anuncios' } },
  ];
  const doneCount = checks.filter(c => c.done).length;
  const checklistDone = doneCount === checks.length;

  // Comissão potencial total
  const commissionPotential = useMemo(() => {
    return rows.reduce((acc, r) => {
      const base = r.valuationValue ?? r.asking_price ?? (r.annual_revenue ? r.annual_revenue * 1.5 : 0);
      const pct = COMMISSION_PCT[r.commissionStage];
      return acc + base * pct * 0.20; // assume 20% take rate Vispe nominal — ajuste depois
    }, 0);
  }, [rows]);

  // Próximos passos sugeridos
  const nextSteps = useMemo(() => {
    const steps: { row: IndicacaoRow; label: string; cta: string; to: string }[] = [];
    rows.forEach((r) => {
      if (r.valuationStage === 'none') {
        steps.push({ row: r, label: `Faça o valuation de ${r.title}`, cta: 'Calcular agora', to: '/valuation/multiplos' });
      } else if (r.status !== 'active') {
        steps.push({ row: r, label: `Publique o anúncio de ${r.title}`, cta: 'Publicar', to: `/editar-anuncio/${r.id}` });
      }
    });
    return steps.slice(0, 3);
  }, [rows]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1300px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="h-12 w-12 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
          <Briefcase className="w-6 h-6 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <Badge variant="outline" className="bg-accent/10 border-accent/30 text-accent text-[10px] tracking-widest mb-1.5">
            PARCERIA · INDICADOR
          </Badge>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight">
            Olá{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl break-words">
            Indique empresas para a Mari, rode valuations e acompanhe sua comissão potencial.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/valuation/multiplos"><Calculator className="w-4 h-4 mr-1" /> Novo valuation</Link>
          </Button>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
            <Link to="/vender"><Plus className="w-4 h-4 mr-1" /> Cadastrar empresa</Link>
          </Button>
        </div>
      </div>

      {/* Onboarding checklist */}
      {!checklistDone && (
        <Card className="border-l-4 border-l-accent">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-semibold text-foreground inline-flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-accent" />
                Complete seu setup para destravar a plataforma
              </h2>
              <span className="text-xs font-mono text-muted-foreground">{doneCount}/{checks.length}</span>
            </div>
            <ul className="space-y-2">
              {checks.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 flex-wrap">
                  <span className={cn('text-sm flex items-center gap-2', c.done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                    <span className={cn('h-4 w-4 rounded-full border flex items-center justify-center text-[10px] shrink-0',
                      c.done ? 'border-accent bg-accent text-accent-foreground' : 'border-border')}>
                      {c.done && '✓'}
                    </span>
                    {c.label}
                  </span>
                  {!c.done && (
                    <Button size="sm" variant="outline" asChild>
                      <Link to={c.action.to}>{c.action.label} <ArrowRight className="h-3 w-3 ml-1" /></Link>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Stats / comissão */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Briefcase className="w-5 h-5" />} label="Indicações" value={rows.length} />
        <StatCard icon={<FileText className="w-5 h-5" />} label="Com valuation" value={rows.filter(r => r.valuationStage !== 'none').length} />
        <StatCard icon={<Target className="w-5 h-5" />} label="Compradores compatíveis" value={rows.reduce((a, r) => a + r.buyersCount, 0)} />
        <StatCard icon={<Wallet className="w-5 h-5" />} label="Comissão potencial" value={commissionPotential > 0 ? formatCurrency(commissionPotential) : '—'} accent />
      </div>

      {/* Próximos passos */}
      {nextSteps.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold text-foreground mb-3 inline-flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> Próximos passos sugeridos
            </h2>
            <ul className="space-y-2">
              {nextSteps.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-2 flex-wrap p-2 rounded-md hover:bg-muted/50">
                  <span className="text-sm text-foreground">{s.label}</span>
                  <Button size="sm" asChild>
                    <Link to={s.to}>{s.cta} <ArrowRight className="h-3 w-3 ml-1" /></Link>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Minhas indicações */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-semibold text-foreground text-lg">Minhas indicações</h2>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/parceiro/compradores">Ver compradores compatíveis <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </div>
          {rows.length === 0 ? (
            <div className="text-center py-10">
              <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-6 h-6 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto break-words">
                Você ainda não indicou nenhuma empresa. Cadastre a primeira para
                a Mari começar a calcular valuation, mercado e compradores compatíveis.
              </p>
              <Button onClick={() => navigate('/vender')} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="w-4 h-4 mr-1" /> Cadastrar empresa
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => {
                const base = r.valuationValue ?? r.asking_price ?? (r.annual_revenue ? r.annual_revenue * 1.5 : 0);
                const commission = base * COMMISSION_PCT[r.commissionStage] * 0.20;
                return (
                  <div key={r.id} className="border border-border rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-[220px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground break-words">{r.title}</h3>
                          <Badge variant="outline" className="text-xs">{r.category}</Badge>
                          <Badge className={cn(
                            'text-xs border',
                            r.status === 'active' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' :
                            'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                          )}>
                            {r.status === 'active' ? 'Anúncio publicado' : 'Cadastro iniciado'}
                          </Badge>
                          <Badge className="bg-accent/15 text-accent border-accent/30 text-xs">
                            {COMMISSION_LABEL[r.commissionStage]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 break-words">
                          {r.city && r.state ? `${r.city}/${r.state} · ` : ''}
                          {r.valuationValue ? `Valuation: ${formatCurrency(r.valuationValue)} · ` : 'Valuation pendente · '}
                          {r.buyersCount > 0 ? `${r.buyersCount} comprador${r.buyersCount > 1 ? 'es' : ''} compatí${r.buyersCount > 1 ? 'veis' : 'vel'}` : 'Sem matches ainda'}
                        </p>
                        {commission > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Comissão potencial estimada: <span className="text-accent font-semibold">{formatCurrency(commission)}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {r.valuationStage === 'none' && (
                          <Button size="sm" variant="outline" asChild>
                            <Link to="/valuation/multiplos"><Calculator className="w-3 h-3 mr-1" /> Fazer valuation</Link>
                          </Button>
                        )}
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/meus-anuncios/${r.id}`}>Abrir <ArrowRight className="w-3 h-3 ml-1" /></Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer comissão */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground inline-flex items-start gap-2 break-words">
            <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
            <span>
              <strong>Modelo de comissão Vispe:</strong> 5% se você só indica · 10% se
              agendar reunião qualificada (BANT) · 15% se concluir valuation + anúncio.
              Valores estimados sobre o ticket de venda projetado.
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: any; accent?: boolean }) {
  return (
    <Card className={cn(accent && 'border-accent/40 bg-accent/5')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
            <p className={cn('text-xl font-bold mt-0.5 break-words', accent ? 'text-accent' : 'text-foreground')}>{value}</p>
          </div>
          <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', accent ? 'bg-accent/15 text-accent' : 'bg-muted text-muted-foreground')}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
