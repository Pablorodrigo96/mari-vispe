import { cn } from '@/lib/utils';
import symbolVolt from '@/assets/mari-symbol-volt.png';
import symbolCarbon from '@/assets/mari-symbol-carbon.png';

type Position = 'tr' | 'br' | 'bl' | 'tl';
type Tone = 'volt' | 'carbon';

interface MariBrandStampProps {
  position?: Position;
  tone?: Tone;
  showWordmark?: boolean;
  /** Watermark size in px (square). */
  size?: number;
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
  tr: 'left-8 bottom-8 text-left',
  br: 'left-8 top-8 text-left',
  bl: 'right-8 top-8 text-right',
  tl: 'right-8 bottom-8 text-right',
};

/**
 * Editorial brand stamp: oversized symbol watermark bleeding from one corner +
 * "designed forward / mari." typographic block in the opposite corner.
 * Place inside a `relative overflow-hidden` container.
 */
export function MariBrandStamp({
  position = 'tr',
  tone = 'volt',
  showWordmark = true,
  size = 640,
  opacity,
  className,
}: MariBrandStampProps) {
  const src = tone === 'volt' ? symbolVolt : symbolCarbon;
  const watermarkOpacity = opacity ?? (tone === 'volt' ? 0.07 : 0.04);

  return (
    <>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className={cn(
          'hidden md:block absolute pointer-events-none select-none object-contain',
          POS_CLASSES[position],
          className,
        )}
        style={{ width: size, height: size, opacity: watermarkOpacity }}
      />
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
    </>
  );
}
