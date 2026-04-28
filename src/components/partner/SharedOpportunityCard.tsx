import { useState } from 'react';
import { MapPin, Building2, Banknote, ShieldCheck, Flame, Users, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export interface PoolOpportunity {
  id: string;
  title: string;
  category: string;
  description: string | null;
  city: string | null;
  state: string | null;
  asking_price: number | null;
  hide_price: boolean | null;
  annual_revenue: number | null;
  vdr_readiness: number | null;
  equity_score: number | null;
  foundation_year: number | null;
  originator_type: 'partner_accountant' | 'franchisee' | 'advisor' | 'bdr_internal' | 'direct_seller';
  originator_state: string | null;
  reservation_status: 'reserved' | 'exclusive' | 'expired' | 'closed_by_matrix' | 'available';
  interest_count: number;
  is_my_lead: boolean;
}

const ORIGINATOR_LABEL: Record<PoolOpportunity['originator_type'], { label: string; className: string }> = {
  partner_accountant: { label: 'Contador Parceiro', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  franchisee:         { label: 'Franqueado',        className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  advisor:            { label: 'Assessor M&A',      className: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30' },
  bdr_internal:       { label: 'BDR PME.B3',        className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  direct_seller:      { label: 'Vendedor direto',   className: 'bg-muted text-muted-foreground border-border' },
};

interface Props {
  opportunity: PoolOpportunity;
  /** True if the current user has already expressed interest. */
  alreadyInterested: boolean;
  onExpressInterest: (opp: PoolOpportunity) => void;
}

export function SharedOpportunityCard({ opportunity: o, alreadyInterested, onExpressInterest }: Props) {
  const orig = ORIGINATOR_LABEL[o.originator_type];
  const vdr = o.vdr_readiness ?? 0;
  const isReserved = o.reservation_status !== 'available' && o.reservation_status !== 'expired';

  return (
    <Card className="hover:border-accent/40 hover:shadow-sm transition-all">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">{o.title}</h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 flex-wrap">
              <Building2 className="w-3 h-3" />
              <span className="capitalize">{o.category}</span>
              {(o.city || o.state) && (
                <>
                  <span>·</span>
                  <MapPin className="w-3 h-3" />
                  <span>{[o.city, o.state].filter(Boolean).join('/')}</span>
                </>
              )}
            </div>
          </div>
          <Badge variant="outline" className={cn('text-[10px] shrink-0', orig.className)}>{orig.label}</Badge>
        </div>

        {o.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{o.description}</p>
        )}

        <div className="grid grid-cols-3 gap-3 text-center pt-2 border-t border-border">
          <div>
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase text-muted-foreground tracking-wide">
              <Banknote className="w-3 h-3" />Faturamento
            </div>
            <p className="text-xs font-bold text-foreground mt-0.5">
              {o.annual_revenue ? formatCurrency(o.annual_revenue) : '—'}
            </p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase text-muted-foreground tracking-wide">
              <FileText className="w-3 h-3" />Preço
            </div>
            <p className="text-xs font-bold text-foreground mt-0.5">
              {o.hide_price || !o.asking_price ? 'Sob consulta' : formatCurrency(o.asking_price)}
            </p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase text-muted-foreground tracking-wide">
              <ShieldCheck className="w-3 h-3" />VDR
            </div>
            <p className={cn(
              'text-xs font-bold mt-0.5',
              vdr === 100 ? 'text-emerald-600 dark:text-emerald-400' : vdr >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
            )}>
              {vdr}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {o.interest_count > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Flame className="w-3 h-3" />{o.interest_count} interessado{o.interest_count > 1 ? 's' : ''}
              </span>
            )}
            {isReserved && (
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
                {o.reservation_status === 'exclusive' ? 'Exclusivo' : 'Reservado'}
              </Badge>
            )}
          </div>
          {alreadyInterested ? (
            <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px]">
              <Users className="w-3 h-3 mr-1" />Interesse registrado
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8"
              onClick={() => onExpressInterest(o)}
            >
              Tenho comprador
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
