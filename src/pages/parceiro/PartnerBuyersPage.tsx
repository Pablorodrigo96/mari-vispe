import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, Target, ArrowRight, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface AnonBuyer {
  id: string;
  match_score: number;
  buyer_archetype: string | null;
  buyer_uf: string | null;
  ticket_min: number | null;
  ticket_max: number | null;
  cnpj: string;
  codename: string | null;
}

/**
 * Possíveis compradores anonimizados — exclusivo do parceiro/indicador.
 * Filtra apenas matches de empresas que o parceiro indicou (via listings.user_id
 * ou partner_lead_reservations). Sem nome, sem contato — só arquétipo + ticket + UF.
 */
export default function PartnerBuyersPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AnonBuyer[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      // 1) CNPJs das empresas indicadas pelo parceiro
      const [listingsR, reservR] = await Promise.all([
        supabase.from('listings').select('cnpj').eq('user_id', user.id),
        supabase
          .from('partner_lead_reservations')
          .select('listing:listings(cnpj)')
          .eq('partner_user_id', user.id),
      ]);
      const cnpjs = new Set<string>();
      (listingsR.data ?? []).forEach((l: any) => l.cnpj && cnpjs.add(String(l.cnpj).replace(/\D/g, '')));
      (reservR.data ?? []).forEach((r: any) => {
        const c = r.listing?.cnpj;
        if (c) cnpjs.add(String(c).replace(/\D/g, ''));
      });
      if (cnpjs.size === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      // 2) Matches dessas empresas em equity_brain.matches (apenas current)
      const { data: matches } = await (supabase as any)
        .schema('equity_brain')
        .from('matches')
        .select('id, cnpj, buyer_id, match_score, buyer_archetype')
        .eq('is_current', true)
        .in('cnpj', Array.from(cnpjs))
        .order('match_score', { ascending: false })
        .limit(50);

      const matchRows = (matches ?? []) as any[];
      if (matchRows.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const buyerIds = Array.from(new Set(matchRows.map((m) => m.buyer_id)));
      const cnpjsArr = Array.from(new Set(matchRows.map((m) => m.cnpj)));
      const [buyersR, companiesR] = await Promise.all([
        (supabase as any)
          .schema('equity_brain')
          .from('buyers')
          .select('id, ufs_interesse, ticket_min, ticket_max')
          .in('id', buyerIds),
        (supabase as any)
          .schema('equity_brain')
          .from('companies')
          .select('cnpj, codename')
          .in('cnpj', cnpjsArr),
      ]);
      const bMap = new Map((buyersR.data ?? []).map((b: any) => [b.id, b]));
      const cMap = new Map((companiesR.data ?? []).map((c: any) => [c.cnpj, c]));

      setRows(
        matchRows.map((m) => {
          const b: any = bMap.get(m.buyer_id) ?? {};
          const c: any = cMap.get(m.cnpj) ?? {};
          return {
            id: m.id,
            match_score: Number(m.match_score ?? 0),
            buyer_archetype: m.buyer_archetype ?? null,
            buyer_uf: Array.isArray(b.ufs_interesse) ? b.ufs_interesse[0] : null,
            ticket_min: b.ticket_min ?? null,
            ticket_max: b.ticket_max ?? null,
            cnpj: m.cnpj,
            codename: c.codename ?? null,
          };
        })
      );
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground inline-flex items-center gap-2">
          <Target className="h-5 w-5 text-accent" /> Possíveis compradores
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Compradores que a Mari identificou como compatíveis com as empresas que
          você indicou. <strong>Identidade protegida por NDA</strong> — apenas
          advisors internos da Vispe veem o nome e contato.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Target className="h-6 w-6 text-accent" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Cadastre sua primeira empresa
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto break-words mb-5">
              A Mari só calcula compradores compatíveis depois que você cadastra
              uma empresa indicada. Sem indicação, não há base para comparar.
            </p>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/vender">Cadastrar empresa <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5 text-accent" />
            {rows.length} comprador{rows.length > 1 ? 'es' : ''} compatível{rows.length > 1 ? 'eis' : ''} ·
            identidades reveladas apenas pelo advisor interno após qualificação BANT
          </div>
          {rows.map((r) => (
            <Card key={r.id} className="hover:bg-muted/40 transition-colors">
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">
                      Buyer #{r.id.slice(0, 8).toUpperCase()}
                    </span>
                    {r.buyer_archetype && (
                      <Badge variant="outline" className="text-[10px]">{r.buyer_archetype}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Empresa: {r.codename ?? `CNPJ ****${r.cnpj.slice(-4)}`}
                    {r.buyer_uf ? ` · Atua em ${r.buyer_uf}` : ''}
                    {r.ticket_min && r.ticket_max
                      ? ` · Ticket ${formatCurrency(r.ticket_min)} – ${formatCurrency(r.ticket_max)}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</p>
                    <p className="text-2xl font-bold text-accent leading-none">{Math.round(r.match_score)}</p>
                  </div>
                  <Button size="sm" variant="outline" disabled className="opacity-60 cursor-not-allowed" title="Solicite ao seu advisor pessoal">
                    <Lock className="h-3 w-3 mr-1" /> Apresentar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-[11px] text-muted-foreground text-center pt-2">
            Para apresentar um comprador, fale com seu advisor pessoal Vispe pelo WhatsApp do menu lateral.
          </p>
        </div>
      )}
    </div>
  );
}
