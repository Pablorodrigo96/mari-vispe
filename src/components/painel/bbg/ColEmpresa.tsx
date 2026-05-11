import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { BBGPanel, BBGHeader, BBGEmpty } from './BBGPanel';
import type { ScoreMari } from '@/hooks/usePainelBloomberg';

interface Props {
  companyName?: string | null;
  segment?: string | null;
  score: ScoreMari;
  hasListing: boolean;
  listingsCount: number;
  lastListingUpdate?: Date | null;
}

export function ColEmpresa({
  companyName,
  segment,
  score,
  hasListing,
  listingsCount,
  lastListingUpdate,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Sua empresa */}
      <BBGPanel>
        <BBGHeader title="Sua empresa" />
        {companyName ? (
          <div>
            <p className="text-base font-bold text-foreground break-words leading-tight">
              {companyName}
            </p>
            {segment && (
              <p className="text-xs text-muted-foreground mt-0.5 break-words">{segment}</p>
            )}
          </div>
        ) : (
          <BBGEmpty
            title="Cadastre sua empresa para ativar este cockpit."
            cta="Cadastrar agora"
            to="/vender"
          />
        )}
      </BBGPanel>

      {/* Score Mari */}
      <BBGPanel>
        <BBGHeader title="Score Mari" />
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-mono font-black tabular-nums tracking-tight text-foreground leading-none">
            {score.score}
          </span>
          <span className="text-xs text-muted-foreground font-mono">/ 100</span>
        </div>
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-volt transition-all duration-700"
            style={{ width: `${score.score}%` }}
          />
        </div>
        <p className="mt-2 text-xs uppercase tracking-wider text-volt font-bold">
          {score.label}
        </p>
        <details className="mt-3 group">
          <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
            Como é calculado
          </summary>
          <ul className="mt-2 space-y-1">
            {score.breakdown.map((b) => (
              <li
                key={b.key}
                className="flex justify-between text-[11px] font-mono tabular-nums"
              >
                <span className="text-muted-foreground">{b.label}</span>
                <span className={b.value > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground/60'}>
                  {b.value}/{b.max}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </BBGPanel>

      {/* Janela de venda */}
      <BBGPanel>
        <BBGHeader title="Janela de venda" />
        <ul className="space-y-1.5 text-xs font-mono">
          <li className="flex justify-between">
            <span className="text-muted-foreground">Início</span>
            <span className="text-foreground tabular-nums">agora</span>
          </li>
          <li className="flex justify-between">
            <span className="text-muted-foreground">Ideal</span>
            <span className="text-volt tabular-nums font-bold">2027 (18m)</span>
          </li>
          <li className="flex justify-between">
            <span className="text-muted-foreground">Fim</span>
            <span className="text-foreground tabular-nums">fim 2028</span>
          </li>
        </ul>
      </BBGPanel>

      {/* Anúncios */}
      {hasListing && (
        <BBGPanel>
          <BBGHeader title="Anúncios" />
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-mono font-black tabular-nums text-foreground">
              {listingsCount}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              ativos
            </span>
          </div>
          {lastListingUpdate && (
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">
              Última atualização:{' '}
              {lastListingUpdate.toLocaleDateString('pt-BR')}
            </p>
          )}
          <Link
            to="/meus-anuncios"
            className="mt-3 inline-flex items-center gap-1 text-[11px] text-volt hover:underline font-semibold"
          >
            <ClipboardList className="h-3 w-3" /> Ver anúncios{' '}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </BBGPanel>
      )}
    </div>
  );
}
