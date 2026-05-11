import { Bell } from 'lucide-react';
import { MariLogo } from '@/components/brand/MariLogo';

interface Props {
  userName: string;
  roles: string[];
  lastSyncMinutes: number | null;
}

function formatSync(min: number | null): string {
  if (min === null) return 'Aguardando primeira sync';
  if (min < 1) return 'Sync agora';
  if (min < 60) return `Última sync há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Última sync há ${h}h`;
  return `Última sync há ${Math.floor(h / 24)}d`;
}

export function BloombergTopBar({ userName, roles, lastSyncMinutes }: Props) {
  return (
    <div className="h-12 border-b border-zinc-800 px-3 sm:px-4 flex items-center justify-between text-xs bg-zinc-950/60">
      <div className="flex items-center gap-3 min-w-0">
        <MariLogo className="h-5 w-auto shrink-0" />
        <span className="text-zinc-600 hidden sm:inline">·</span>
        <span className="font-medium text-zinc-200 truncate max-w-[140px] sm:max-w-none">
          {userName}
        </span>
        {roles.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5">
            {roles.slice(0, 3).map((r) => (
              <span
                key={r}
                className="text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-400"
              >
                {r}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 font-mono text-[11px] text-zinc-500 tabular-nums">
        <span className="hidden sm:inline">{formatSync(lastSyncMinutes)}</span>
        <button
          aria-label="Notificações"
          className="relative h-7 w-7 flex items-center justify-center rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Bell className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
