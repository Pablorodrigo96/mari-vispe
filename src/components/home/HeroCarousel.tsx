import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Activity, Eye, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Slide = {
  badge: string;
  headline: string;
  highlight: string;
  body: string;
  cta: string;
};

const SLIDES: Slide[] = [
  {
    badge: 'PARA TODO EMPRESÁRIO',
    headline: 'Você não decide quando vender sua empresa.',
    highlight: 'O mercado decide.',
    body: `E a maioria dos empresários percebe isso tarde demais. Recebe proposta ruim, vende fora de timing, ou simplesmente não percebe que era o melhor momento.\n\nA Mari muda esse jogo.`,
    cta: 'Descobrir meu timing',
  },
  {
    badge: 'PARA TODO EMPRESÁRIO',
    headline: 'Todo empresário vai vender a empresa um dia.',
    highlight: 'Mas poucos sabem quanto ela vale.',
    body: `E menos ainda sabem quem poderia comprar você AGORA.\n\nEnquanto você opera o negócio, há compradores olhando para o seu mercado. Você não vê. Eles também não sabem que você existe — até a Mari conectar vocês.`,
    cta: 'Ver quem está olhando',
  },
  {
    badge: 'INTELIGÊNCIA DE MERCADO',
    headline: 'Você está perdendo dinheiro.',
    highlight: 'E nem sabe.',
    body: `Não é por falta de esforço. É por falta de informação.\n\nGrandes fundos, bancos e players de M&A sempre souberam antes: quem vai vender, quando vender e por quanto. Essa inteligência nunca foi acessível. Até agora.`,
    cta: 'Acessar essa inteligência',
  },
  {
    badge: 'INTELIGÊNCIA PREDITIVA',
    headline: 'Vender empresa não é sorte.',
    highlight: 'É timing, preparação e comprador certo.',
    body: `A Mari analisa sua empresa, seu mercado e os possíveis compradores. Mostra se você deveria vender agora, esperar, ou valorizar mais antes.\n\nSem achismo. Sem tentativa e erro.`,
    cta: 'Calcular meu timing',
  },
  {
    badge: 'A DIFERENÇA MARI',
    headline: 'Eu estou olhando para a sua empresa.',
    highlight: 'Antes de você pedir.',
    body: `Mari não espera você se cadastrar. Não espera proposta chegar.\n\nEla está aqui agora, analisando 21 milhões de CNPJs do Brasil, identificando quem está em janela. Se é você, descobre em 1 minuto.`,
    cta: 'Descobrir agora',
  },
];

const AUTOPLAY_DELAY = 6500;

export function HeroCarousel() {
  const autoplay = useRef(
    Autoplay({ delay: AUTOPLAY_DELAY, stopOnInteraction: false, stopOnMouseEnter: true })
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [autoplay.current]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  return (
    <div
      className="relative w-full"
      role="region"
      aria-label="Carrossel de mensagens da Mari"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* LEFT: Slide content */}
        <div className="lg:col-span-7 relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {SLIDES.map((slide, i) => (
                <div key={i} className="min-w-0 flex-[0_0_100%]">
                  <SlideView slide={slide} active={i === selected} />
                </div>
              ))}
            </div>
          </div>

          {/* Controls row */}
          <div className="mt-10 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Ir para slide ${i + 1}`}
                    aria-current={i === selected}
                    onClick={() => emblaApi?.scrollTo(i)}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      i === selected
                        ? 'w-10 bg-volt shadow-volt'
                        : 'w-1.5 bg-white/20 hover:bg-white/40'
                    )}
                  />
                ))}
              </div>
              <div
                className="font-mono text-xs text-white/40 tracking-widest tabular-nums"
                aria-live="polite"
              >
                {String(selected + 1).padStart(2, '0')}
                <span className="mx-1 text-white/20">/</span>
                {String(SLIDES.length).padStart(2, '0')}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1">
              <button
                type="button"
                aria-label="Slide anterior"
                onClick={() => emblaApi?.scrollPrev()}
                className="h-9 w-9 rounded-full border border-white/15 hover:border-volt hover:text-volt text-white/60 flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Próximo slide"
                onClick={() => emblaApi?.scrollNext()}
                className="h-9 w-9 rounded-full border border-white/15 hover:border-volt hover:text-volt text-white/60 flex items-center justify-center transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-px w-full bg-white/5 overflow-hidden">
            <motion.div
              key={selected}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: AUTOPLAY_DELAY / 1000, ease: 'linear' }}
              className="h-full bg-volt/60"
            />
          </div>
        </div>

        {/* RIGHT: Persistent rail */}
        <div className="lg:col-span-5">
          <HeroRightRail />
        </div>
      </div>
    </div>
  );
}

function SlideView({ slide, active }: { slide: Slide; active: boolean }) {
  return (
    <div className="text-left min-h-[440px] md:min-h-[480px] flex flex-col justify-center">
      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={slide.headline}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-volt/25 bg-volt/5 mb-7">
              <span className="w-1 h-1 rounded-full bg-volt" />
              <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-volt/90">
                {slide.badge}
              </span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-5 leading-[0.98] tracking-[-0.03em] text-balance break-words">
              {slide.headline}
            </h1>

            <p className="mb-8">
              <span className="inline-block text-2xl md:text-3xl lg:text-4xl xl:text-5xl bg-volt text-carbon font-extrabold px-2 py-0.5 leading-tight tracking-[-0.02em] break-words">
                {slide.highlight}
              </span>
            </p>

            <p className="text-base md:text-lg text-white/65 mb-9 max-w-[560px] leading-relaxed whitespace-pre-line break-words">
              {slide.body}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-volt hover:bg-volt-light text-carbon shadow-volt h-12 px-7 text-base rounded-xl font-semibold"
              >
                <Link to="/mari">
                  {slide.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="text-white/70 hover:text-white hover:bg-white/5 h-12 px-5 text-base"
              >
                <Link to="/marketplace">Explorar empresas</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HeroRightRail() {
  const [scanned, setScanned] = useState(21_438_217);
  const [windowed, setWindowed] = useState(1_247);

  useEffect(() => {
    const t = setInterval(() => {
      setScanned((s) => s + Math.floor(Math.random() * 7) + 1);
      if (Math.random() > 0.7) setWindowed((w) => w + 1);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  const fmt = (n: number) => n.toLocaleString('pt-BR');

  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-6 bg-[radial-gradient(circle_at_center,_hsla(74,85%,68%,0.08)_0%,_transparent_70%)] pointer-events-none" />

      <div className="relative glass-card rounded-2xl p-6 md:p-7 border border-white/10 backdrop-blur-xl bg-white/[0.02]">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 pb-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-volt animate-ping opacity-60" />
              <span className="relative block w-2 h-2 rounded-full bg-volt" />
            </div>
            <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-white/70">
              Mari · ao vivo
            </span>
          </div>
          <span className="font-mono text-[10px] text-white/30 tracking-widest">SCAN.01</span>
        </div>

        {/* Live ticker */}
        <div className="space-y-4">
          <TickerRow
            icon={<Eye className="h-3.5 w-3.5" />}
            label="CNPJs analisados"
            value={fmt(scanned)}
          />
          <TickerRow
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Em janela de venda"
            value={fmt(windowed)}
            highlight
          />
          <TickerRow
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Volume mapeado"
            value="R$ 4,2 bi"
          />
        </div>

        {/* Status card */}
        <div className="mt-6 pt-6 border-t border-white/5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 relative shrink-0">
              <span className="absolute inset-0 rounded-full bg-volt/40 animate-ping" />
              <span className="relative block w-2.5 h-2.5 rounded-full bg-volt" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white leading-snug">
                Mari está olhando para a sua empresa <span className="text-volt">agora</span>.
              </p>
              <p className="text-xs text-white/45 mt-1.5 leading-relaxed">
                Descubra em 60 segundos se você está em janela. Sem cadastro obrigatório.
              </p>
              <Link
                to="/mari"
                className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-volt hover:text-volt-light transition-colors"
              >
                Analisar meu CNPJ
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TickerRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={cn('shrink-0', highlight ? 'text-volt' : 'text-white/30')}>{icon}</span>
        <span className="text-xs text-white/55 truncate">{label}</span>
      </div>
      <motion.span
        key={value}
        initial={{ opacity: 0.4, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'font-mono text-sm tabular-nums tracking-tight',
          highlight ? 'text-volt font-semibold' : 'text-white/85'
        )}
      >
        {value}
      </motion.span>
    </div>
  );
}
