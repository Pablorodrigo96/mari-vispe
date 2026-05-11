import { Link } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import { BBGPanel, BBGHeader, BBGEmpty } from './BBGPanel';
import { brl } from '@/lib/painelExecutive';
import type { ValuationSnapshot } from '@/lib/painelExecutive';

interface Props {
  snapshot: ValuationSnapshot | null;
  buyersCount?: number;
}

const BUYER_BREAKDOWN = [
  { label: 'Consolidadores', pct: 60 },
  { label: 'Strategic', pct: 30 },
  { label: 'PE / LBO', pct: 10 },
];

export function ColValuationBuyers({ snapshot, buyersCount = 8 }: Props) {
  return (
    <div className="space-y-4">
      {/* Valuation */}
      <BBGPanel>
        <BBGHeader title="Valuation" />
        {snapshot ? (
          <>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Atual estimado
            </p>
            <p className="text-5xl font-mono font-bold tabular-nums tracking-tight text-zinc-100 leading-none">
              {brl(snapshot.valorAtual, { compact: true })}
            </p>

            <div className="mt-5 border border-volt/30 bg-gradient-to-br from-volt/5 to-transparent rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wider text-volt font-semibold mb-1">
                Potencial · pico 2027
              </p>
              <p className="text-3xl font-mono font-bold tabular-nums tracking-tight text-volt leading-none">
                {brl(snapshot.valorPotencial, { compact: true })}
              </p>
              <div className="h-px bg-volt/20 my-3" />
              <p className="text-xs text-zinc-300 font-mono">
                +{brl(snapshot.gap, { compact: true })} de oportunidade
                <span className="text-zinc-500">
                  {' '}
                  ({snapshot.gapPct.toFixed(0)}%)
                </span>
              </p>
            </div>

            <Link
              to="/meus-valuations"
              className="mt-3 inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-volt"
            >
              Detalhes técnicos <ArrowRight className="h-3 w-3" />
            </Link>
          </>
        ) : (
          <BBGEmpty
            title="Calcule seu valuation para ver projeção e gap até 2027."
            cta="Calcular valuation"
            to="/valuation"
          />
        )}
      </BBGPanel>

      {/* Compradores ativos */}
      <BBGPanel>
        <BBGHeader title="Compradores ativos" />
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-mono font-bold tabular-nums text-zinc-100">
            {buyersCount}
          </span>
          <span className="text-xs text-zinc-500">
            possíveis compradores
          </span>
        </div>

        <ul className="space-y-2">
          {BUYER_BREAKDOWN.map((b) => (
            <li key={b.label} className="flex items-center gap-3 text-xs">
              <div className="flex-1 h-4 bg-zinc-900 rounded-sm overflow-hidden relative">
                <div
                  className="h-full bg-volt/70 transition-all"
                  style={{ width: `${b.pct}%` }}
                />
              </div>
              <span className="w-10 text-right font-mono tabular-nums text-zinc-300">
                {b.pct}%
              </span>
              <span className="w-28 text-zinc-400 truncate">{b.label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-1.5 text-[10px] text-zinc-500">
          <Lock className="h-3 w-3" />
          Identidade protegida por NDA
        </div>

        <Link
          to="/matching"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-volt hover:underline"
        >
          Falar com advisor <ArrowRight className="h-3 w-3" />
        </Link>
      </BBGPanel>
    </div>
  );
}
