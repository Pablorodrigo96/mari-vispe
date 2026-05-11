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
            <p className="text-base font-semibold text-zinc-100 break-words leading-tight">
              {companyName}
            </p>
            {segment && (
              <p className="text-xs text-zinc-400 mt-0.5 break-words">{segment}</p>
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
          <span className="text-4xl font-mono font-bold tabular-nums tracking-tight text-zinc-100">
            {score.score}
          </span>
          <span className="text-xs text-zinc-500 font-mono">/ 100</span>
        </div>
        <div className="mt-3 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-volt transition-all duration-700"
            style={{ width: `${score.score}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] uppercase tracking-wider text-volt font-medium">
          {score.label}
        </p>
        <details className="mt-3 group">
          <summary className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-300">
            Como é calculado
          </summary>
          <ul className="mt-2 space-y-1">
            {score.breakdown.map((b) => (
              <li
                key={b.key}
                className="flex justify-between text-[11px] font-mono tabular-nums"
              >
                <span className="text-zinc-400">{b.label}</span>
                <span className={b.value > 0 ? 'text-zinc-200' : 'text-zinc-600'}>
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
            <span className="text-zinc-500">Início</span>
            <span className="text-zinc-200 tabular-nums">agora</span>
          </li>
          <li className="flex justify-between">
            <span className="text-zinc-500">Ideal</span>
            <span className="text-volt tabular-nums font-semibold">2027 (18m)</span>
          </li>
          <li className="flex justify-between">
            <span className="text-zinc-500">Fim</span>
            <span className="text-zinc-200 tabular-nums">fim 2028</span>
          </li>
        </ul>
      </BBGPanel>

      {/* Anúncios */}
      {hasListing && (
        <BBGPanel>
          <BBGHeader title="Anúncios" />
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold tabular-nums text-zinc-100">
              {listingsCount}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              ativos
            </span>
          </div>
          {lastListingUpdate && (
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">
              Última atualização:{' '}
              {lastListingUpdate.toLocaleDateString('pt-BR')}
            </p>
          )}
          <Link
            to="/meus-anuncios"
            className="mt-3 inline-flex items-center gap-1 text-[11px] text-volt hover:underline font-medium"
          >
            <ClipboardList className="h-3 w-3" /> Ver anúncios{' '}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </BBGPanel>
      )}
    </div>
  );
}
