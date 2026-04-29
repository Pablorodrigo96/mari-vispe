import { cn } from '@/lib/utils';
import lockupDark from '@/assets/mari-lockup-dark.png';
import lockupLight from '@/assets/mari-lockup-light.png';
import lockupTaglineLight from '@/assets/mari-lockup-tagline-light.png';
import lockupVoltOnDark from '@/assets/mari-lockup-volt-on-dark.png';
import symbolVolt from '@/assets/mari-symbol-volt.png';
import symbolCarbon from '@/assets/mari-symbol-carbon.png';

export type MariLogoVariant =
  | 'dark'           // horizontal lockup with volt symbol + bone wordmark — for carbon/black bg
  | 'light'          // horizontal lockup all carbon — for bone/white bg
  | 'tagline-light'  // lockup with "designed forward" tagline, all carbon — for light bg
  | 'volt'           // lockup variant with volt symbol + faint wordmark — alt for dark bg
  | 'symbol-dark'    // symbol only, volt — for dark bg
  | 'symbol-light';  // symbol only, carbon — for light bg

interface MariLogoProps {
  variant?: MariLogoVariant;
  /** Height in pixels for full lockup, or square size for symbol variants. */
  size?: number;
  className?: string;
  /** Force symbol-only render (defaults true for `symbol-*` variants). */
  symbolOnly?: boolean;
}

const LOCKUP: Record<'dark' | 'light' | 'tagline-light' | 'volt', string> = {
  dark: lockupDark,
  light: lockupLight,
  'tagline-light': lockupTaglineLight,
  volt: lockupVoltOnDark,
};

const SYMBOL: Record<'symbol-dark' | 'symbol-light', string> = {
  'symbol-dark': symbolVolt,
  'symbol-light': symbolCarbon,
};

/**
 * mari brand mark — uses the official transparent PNG assets.
 * Pick the variant that matches the surface:
 *   - `dark` / `volt` / `symbol-dark` → carbon/black backgrounds
 *   - `light` / `tagline-light` / `symbol-light` → bone/white backgrounds
 */
export function MariLogo({
  variant = 'dark',
  size = 32,
  className,
  symbolOnly,
}: MariLogoProps) {
  const isSymbolVariant = variant === 'symbol-dark' || variant === 'symbol-light';
  const showSymbolOnly = symbolOnly ?? isSymbolVariant;

  if (showSymbolOnly) {
    const key: 'symbol-dark' | 'symbol-light' = isSymbolVariant
      ? (variant as 'symbol-dark' | 'symbol-light')
      : variant === 'light' || variant === 'tagline-light'
        ? 'symbol-light'
        : 'symbol-dark';
    return (
      <img
        src={SYMBOL[key]}
        alt="mari"
        width={size}
        height={size}
        className={cn('block object-contain shrink-0', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const lockupKey: 'dark' | 'light' | 'tagline-light' | 'volt' =
    variant === 'symbol-dark'
      ? 'dark'
      : variant === 'symbol-light'
        ? 'light'
        : variant;

  return (
    <img
      src={LOCKUP[lockupKey]}
      alt="mari — designed forward"
      className={cn('block object-contain shrink-0', className)}
      style={{ height: size, width: 'auto' }}
    />
  );
}

/**
 * Oversized decorative symbol used as a magazine-cover style watermark.
 * Renders the official PNG with low opacity, pinned via absolute positioning.
 */
export function MariWatermark({
  className,
  color = 'volt',
  opacity = 0.06,
}: {
  className?: string;
  color?: 'volt' | 'carbon';
  opacity?: number;
}) {
  const src = color === 'volt' ? symbolVolt : symbolCarbon;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={cn('pointer-events-none select-none object-contain', className)}
      style={{ opacity }}
    />
  );
}
