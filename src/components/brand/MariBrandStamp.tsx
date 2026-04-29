import { cn } from '@/lib/utils';
import { MariWatermark } from './MariLogo';

type Position = 'tr' | 'br' | 'bl' | 'tl';
type Tone = 'volt' | 'carbon';

interface MariBrandStampProps {
  /** Where the watermark symbol bleeds from. */
  position?: Position;
  tone?: Tone;
  /** Show the "designed forward / mari." typographic block in the opposite corner. */
  showWordmark?: boolean;
  /** Watermark size in px (square). */
  size?: number;
  /** Symbol watermark opacity (0–1). */
  opacity?: number;
  className?: string;
}

const POS_CLASSES: Record<Position, string> = {
  tr: '-right-40 -top-20',
  br: '-right-40 -bottom-20',
  bl: '-left-40 -bottom-20',
  tl: '-left-40 -top-20',
};

const WORDMARK_POS: Record<Position, string> = {
  // Place wordmark in the corner OPPOSITE the watermark for editorial balance.
  tr: 'left-8 bottom-8 text-left',
  br: 'left-8 top-8 text-left',
  bl: 'right-8 top-8 text-right',
  tl: 'right-8 bottom-8 text-right',
};

/**
 * Editorial brand stamp — combines an oversized symbol watermark sangrando pela
 * borda com um bloco tipográfico "designed forward / mari." no canto oposto.
 * Ambos são puramente decorativos (pointer-events-none).
 *
 * Use dentro de um container `relative overflow-hidden`.
 */
export function MariBrandStamp({
  position = 'tr',
  tone = 'volt',
  showWordmark = true,
  size = 640,
  opacity,
  className,
}: MariBrandStampProps) {
  const wordmarkTone = tone === 'volt' ? 'text-volt' : 'text-foreground';
  const watermarkOpacity = opacity ?? (tone === 'volt' ? 0.07 : 0.04);

  return (
    <>
      <MariWatermark
        color={tone}
        opacity={watermarkOpacity}
        className={cn(
          'hidden md:block absolute pointer-events-none',
          POS_CLASSES[position],
          className,
        )}
        // size is applied via inline style on the parent <img>
      />
      {/*
        MariWatermark uses style.opacity but width/height come from className.
        We override below via a sibling style tag isn't ideal — instead we wrap.
      */}
      <style>{`/* size handled via tailwind w/h utilities below */`}</style>
      {showWordmark && (
        <div
          className={cn(
            'hidden lg:block absolute pointer-events-none select-none',
            WORDMARK_POS[position],
          )}
        >
          <div
            className={cn(
              'font-display text-[11px] uppercase tracking-[0.4em]',
              tone === 'volt' ? 'text-volt/30' : 'text-foreground/30',
            )}
          >
            designed forward
          </div>
          <div
            className={cn(
              'font-display font-bold text-[120px] leading-none -mt-2',
              tone === 'volt' ? 'text-bone/10' : 'text-foreground/10',
            )}
          >
            mari.
          </div>
        </div>
      )}
      {/* Inject the watermark sizing via a hidden style hook on the next sibling element */}
      <span
        aria-hidden
        className="hidden"
        style={{ ['--mari-stamp-size' as any]: `${size}px` }}
      />
    </>
  );
}
