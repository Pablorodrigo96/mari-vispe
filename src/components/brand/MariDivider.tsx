import { cn } from '@/lib/utils';
import { MariLogo } from './MariLogo';

interface MariDividerProps {
  /** Visual tone of the centered symbol. */
  tone?: 'volt' | 'carbon';
  className?: string;
  /** Vertical padding utility. */
  spacing?: 'sm' | 'md' | 'lg';
}

const SPACING: Record<NonNullable<MariDividerProps['spacing']>, string> = {
  sm: 'py-6',
  md: 'py-10',
  lg: 'py-16',
};

/**
 * Editorial divider: thin gradient line with the mari symbol centered on top.
 * Use between marketing sections to add brand rhythm.
 */
export function MariDivider({
  tone = 'volt',
  className,
  spacing = 'md',
}: MariDividerProps) {
  const variant = tone === 'volt' ? 'symbol-dark' : 'symbol-light';
  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        SPACING[spacing],
        className,
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          'absolute inset-x-0 top-1/2 h-px',
          tone === 'volt'
            ? 'bg-gradient-to-r from-transparent via-volt/30 to-transparent'
            : 'bg-gradient-to-r from-transparent via-foreground/15 to-transparent',
        )}
      />
      <div
        className={cn(
          'relative z-10 px-4',
          tone === 'volt' ? 'bg-background' : 'bg-background',
        )}
      >
        <MariLogo variant={variant} size={28} />
      </div>
    </div>
  );
}
