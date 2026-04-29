import { cn } from '@/lib/utils';

export type MariLogoVariant =
  | 'dark'          // light wordmark for dark backgrounds, volt symbol
  | 'light'         // dark wordmark for light backgrounds, carbon symbol
  | 'volt'          // dark wordmark for volt backgrounds, carbon symbol
  | 'symbol-dark'   // volt symbol only
  | 'symbol-light'  // carbon symbol only
  | 'symbol-volt';  // carbon symbol only (on volt bg)

interface MariLogoProps {
  variant?: MariLogoVariant;
  /** Height in px for full lockup, or square size for symbol-only. */
  size?: number;
  className?: string;
  symbolOnly?: boolean;
  /** Show "designed forward" tagline under the wordmark */
  withTagline?: boolean;
}

/**
 * mari brand mark — vector, transparent background, theme-aware.
 * The symbol uses an organic donut (outer ring + central pupil dot) and the
 * wordmark is set in Inter Tight to match the brand reference.
 */
export function MariLogo({
  variant = 'dark',
  size = 32,
  className,
  symbolOnly,
  withTagline = false,
}: MariLogoProps) {
  const isSymbolVariant = variant.startsWith('symbol');
  const showSymbolOnly = symbolOnly ?? isSymbolVariant;

  // Resolve colors per variant
  const symbolColor =
    variant === 'dark' || variant === 'symbol-dark'
      ? 'text-volt'
      : 'text-carbon';

  const wordColor =
    variant === 'dark' ? 'text-bone' : 'text-carbon';

  const taglineColor =
    variant === 'dark' ? 'text-bone/60' : 'text-carbon/60';

  const Symbol = (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={cn('shrink-0', symbolColor)}
      fill="currentColor"
      aria-hidden={!showSymbolOnly}
    >
      <path
        fillRule="evenodd"
        d="M100 14C148 14 188 52 188 100C188 152 152 188 102 188C50 188 12 150 12 100C12 50 50 14 100 14ZM100 60C78 60 60 78 60 100C60 122 78 140 100 140C122 140 140 122 140 100C140 78 122 60 100 60Z"
      />
      <circle cx="100" cy="100" r="6" />
    </svg>
  );

  if (showSymbolOnly) {
    return (
      <span
        className={cn('inline-flex items-center justify-center', className)}
        aria-label="mari"
      >
        {Symbol}
      </span>
    );
  }

  return (
    <span
      className={cn('inline-flex items-center gap-2', className)}
      aria-label="mari — designed forward"
    >
      {Symbol}
      <span className="flex flex-col leading-none">
        <span
          className={cn('font-display font-bold tracking-tight', wordColor)}
          style={{ fontSize: size * 0.78, lineHeight: 1 }}
        >
          mari
        </span>
        {withTagline && (
          <span
            className={cn('font-sans tracking-[0.15em] uppercase mt-1', taglineColor)}
            style={{ fontSize: Math.max(size * 0.18, 8) }}
          >
            designed forward
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * Oversized decorative symbol used as a magazine-cover style watermark.
 * Pin to a corner with absolute positioning + low opacity.
 */
export function MariWatermark({
  className,
  color = 'volt',
  opacity = 0.06,
}: {
  className?: string;
  color?: 'volt' | 'carbon' | 'bone';
  opacity?: number;
}) {
  const colorClass =
    color === 'volt' ? 'text-volt' : color === 'bone' ? 'text-bone' : 'text-carbon';
  return (
    <svg
      viewBox="0 0 200 200"
      className={cn('pointer-events-none select-none', colorClass, className)}
      fill="currentColor"
      style={{ opacity }}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M100 14C148 14 188 52 188 100C188 152 152 188 102 188C50 188 12 150 12 100C12 50 50 14 100 14ZM100 60C78 60 60 78 60 100C60 122 78 140 100 140C122 140 140 122 140 100C140 78 122 60 100 60Z"
      />
      <circle cx="100" cy="100" r="6" />
    </svg>
  );
}
