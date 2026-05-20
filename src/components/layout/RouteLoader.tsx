import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Loader pequeno para usar dentro de um layout (sidebar/topbar continuam visíveis).
 * NÃO usa min-h-[100dvh] para não causar flash de "página inteira".
 */
export function ContentLoader({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <div className={cn('w-full h-full min-h-[40vh] flex items-center justify-center', className)}>
      <Loader2 className={cn('h-6 w-6 animate-spin', dark ? 'text-zinc-500' : 'text-accent')} />
    </div>
  );
}

/** Loader cheio só para o boot inicial da app. */
export function FullPageLoader() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background">
      <Loader2 className="h-7 w-7 animate-spin text-accent" />
    </div>
  );
}
