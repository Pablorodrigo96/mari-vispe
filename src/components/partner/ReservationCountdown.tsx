import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReservationCountdownProps {
  expiresAt: string;
  reservedAt: string;
  status: 'reserved' | 'exclusive' | 'expired' | 'closed_by_matrix';
  compact?: boolean;
}

export function ReservationCountdown({ expiresAt, reservedAt, status, compact }: ReservationCountdownProps) {
  const now = Date.now();
  const expires = new Date(expiresAt).getTime();
  const reserved = new Date(reservedAt).getTime();
  const totalDuration = expires - reserved;
  const elapsed = now - reserved;
  const daysLeft = Math.max(0, Math.ceil((expires - now) / (1000 * 60 * 60 * 24)));
  const progressPct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

  if (status === 'exclusive') {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Exclusivo
      </Badge>
    );
  }

  if (status === 'expired') {
    return (
      <Badge className="bg-muted text-muted-foreground gap-1">
        <XCircle className="w-3 h-3" />
        Expirado
      </Badge>
    );
  }

  if (status === 'closed_by_matrix') {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1">
        <AlertTriangle className="w-3 h-3" />
        Fechado pela Matriz
      </Badge>
    );
  }

  // status === 'reserved'
  const colorClass =
    daysLeft > 15 ? 'text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/15'
    : daysLeft > 7 ? 'text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/15'
    : 'text-red-700 dark:text-red-400 border-red-500/30 bg-red-500/15';

  const progressColor =
    daysLeft > 15 ? 'bg-emerald-500'
    : daysLeft > 7 ? 'bg-amber-500'
    : 'bg-red-500';

  if (compact) {
    return (
      <Badge variant="outline" className={cn('gap-1', colorClass)}>
        <Clock className="w-3 h-3" />
        Reservado · {daysLeft}d
      </Badge>
    );
  }

  return (
    <div className="space-y-1.5 min-w-[160px]">
      <div className="flex items-center justify-between text-xs">
        <span className={cn('flex items-center gap-1 font-medium', colorClass.split(' ')[0])}>
          <Clock className="w-3 h-3" />
          {daysLeft} dias restantes
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all', progressColor)}
          style={{ width: `${100 - progressPct}%` }}
        />
      </div>
    </div>
  );
}
