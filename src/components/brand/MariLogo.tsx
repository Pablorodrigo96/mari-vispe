import { cn } from '@/lib/utils';

interface MariLogoProps {
  className?: string;
  /** Size of the symbol in pixels (square). Default 32. */
  size?: number;
  /** Show the "mari" wordmark next to the symbol. */
  showWordmark?: boolean;
  /** Color of the symbol disc + wordmark. Defaults to currentColor. */
  symbolColor?: string;
  /** Inner egg color (defaults to volt). */
  innerColor?: string;
}

/**
 * mari brand mark.
 * Vinyl-like organic disc with an inner egg-shaped opening and a center dot.
 * Symbol uses currentColor for the outer disc so it adapts to context;
 * the inner opening defaults to Volt accent.
 */
export function MariLogo({
  className,
  size = 32,
  showWordmark = true,
  symbolColor,
  innerColor = 'hsl(var(--volt))',
}: MariLogoProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-2 select-none', className)}
      style={symbolColor ? { color: symbolColor } : undefined}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Outer organic disc */}
        <path
          d="M100 14c-46 0-82 38-82 86 0 50 38 86 82 86 50 0 86-40 86-88 0-46-36-84-86-84z"
          fill="currentColor"
        />
        {/* Inner egg-shaped opening */}
        <ellipse cx="100" cy="102" rx="32" ry="42" fill={innerColor} />
        {/* Center dot */}
        <circle cx="100" cy="104" r="4.5" fill="currentColor" />
      </svg>
      {showWordmark && (
        <span
          className="font-display font-medium leading-none lowercase"
          style={{ fontSize: size * 0.7, letterSpacing: '-0.04em' }}
        >
          mari
        </span>
      )}
    </span>
  );
}
