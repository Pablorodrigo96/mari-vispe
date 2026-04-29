import { cn } from '@/lib/utils';
import logoDark from '@/assets/mari-logo-dark.png';
import logoLight from '@/assets/mari-logo-light.png';
import logoVolt from '@/assets/mari-logo-volt.png';
import symbolDark from '@/assets/mari-symbol-dark.png';
import symbolVolt from '@/assets/mari-symbol-volt.png';

export type MariLogoVariant =
  | 'dark'          // logo + tagline on dark backgrounds (volt symbol + bone wordmark)
  | 'light'         // logo + tagline on light/bone backgrounds (carbon everything)
  | 'volt'          // logo + tagline on volt backgrounds (carbon everything)
  | 'symbol-dark'   // symbol only on dark bg (volt symbol)
  | 'symbol-volt';  // symbol only on volt bg (carbon symbol)

interface MariLogoProps {
  variant?: MariLogoVariant;
  /** Height in pixels for full lockups, or square size for symbol variants. */
  size?: number;
  className?: string;
  /** Hide the wordmark (forces symbol-only). Defaults true for `symbol-*` variants. */
  symbolOnly?: boolean;
}

const FULL_LOGOS: Record<'dark' | 'light' | 'volt', string> = {
  dark: logoDark,
  light: logoLight,
  volt: logoVolt,
};

const SYMBOLS: Record<'symbol-dark' | 'symbol-volt', string> = {
  'symbol-dark': symbolDark,
  'symbol-volt': symbolVolt,
};

/**
 * mari brand mark — uses the official PNG assets.
 * Pick the variant that matches the background:
 *   - `dark`  → carbon/black backgrounds
 *   - `light` → bone/white backgrounds
 *   - `volt`  → volt-green backgrounds
 *   - `symbol-dark` / `symbol-volt` → symbol only (collapsed sidebar, favicons, badges)
 */
export function MariLogo({
  variant = 'dark',
  size = 32,
  className,
  symbolOnly,
}: MariLogoProps) {
  const isSymbolOnlyVariant = variant === 'symbol-dark' || variant === 'symbol-volt';
  const showSymbolOnly = symbolOnly ?? isSymbolOnlyVariant;

  if (showSymbolOnly) {
    const src = isSymbolOnlyVariant
      ? SYMBOLS[variant as 'symbol-dark' | 'symbol-volt']
      : variant === 'volt'
        ? SYMBOLS['symbol-volt']
        : SYMBOLS['symbol-dark'];
    return (
      <img
        src={src}
        alt="mari"
        width={size}
        height={size}
        className={cn('block object-contain shrink-0', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const fullKey: 'dark' | 'light' | 'volt' =
    variant === 'light' ? 'light' : variant === 'volt' ? 'volt' : 'dark';

  return (
    <img
      src={FULL_LOGOS[fullKey]}
      alt="mari — designed forward"
      className={cn('block object-contain shrink-0', className)}
      style={{ height: size, width: 'auto' }}
    />
  );
}
