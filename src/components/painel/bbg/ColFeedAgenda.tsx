import { Link } from 'react-router-dom';
import { Calculator, ClipboardList, UserSearch, DollarSign, Sparkles, Calendar, ArrowRight } from 'lucide-react';
import { BBGPanel, BBGHeader, BBGEmpty } from './BBGPanel';
import type { FeedItem } from '@/hooks/usePainelBloomberg';

const ICONS = {
  valuation: Calculator,
  listing: ClipboardList,
  buyer: UserSearch,
  capital: DollarSign,
  welcome: Sparkles,
};

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `há ${days}d`;
  return d.toLocaleDateString('pt-BR');
}

interface Props {
  feed: FeedItem[];
}

export function ColFeedAgenda({ feed }: Props) {
  return (
    <div className="space-y-4">
      {/* Feed de atividade */}
      <BBGPanel>
        <BBGHeader title="Feed de atividade" />
        {feed.length === 0 ? (
          <BBGEmpty title="Suas atividades aparecerão aqui conforme você usa a plataforma." />
        ) : (
          <ul className="space-y-3">
            {feed.map((item, idx) => {
              const Icon = ICONS[item.icon];
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-2.5 animate-fade-in"
                  style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'backwards' }}
                >
                  <span className="h-6 w-6 rounded border border-zinc-800 bg-zinc-900/50 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-3 w-3 text-zinc-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-200 leading-snug break-words">
                      {item.label}
                    </p>
                    {item.detail && (
                      <p className="text-[10px] text-zinc-500 truncate">
                        {item.detail}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-600 font-mono tabular-nums mt-0.5">
                      {formatRelative(item.date)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </BBGPanel>

      {/* Agenda */}
      <BBGPanel>
        <BBGHeader title="Agenda" />
        <BBGEmpty title="Sem eventos esta semana." />
        <Link
          to="/matching"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-volt hover:underline mt-1"
        >
          <Calendar className="h-3.5 w-3.5" />
          Agendar call com advisor <ArrowRight className="h-3 w-3" />
        </Link>
      </BBGPanel>
    </div>
  );
}
