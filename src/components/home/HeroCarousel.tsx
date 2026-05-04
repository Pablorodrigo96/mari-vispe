import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { motion, AnimatePresence } from 'framer-motion';
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
    body: `E a maioria dos empresários percebe isso tarde demais.
Recebe proposta ruim… vende fora de timing… ou simplesmente não percebe que era o melhor momento.

A Mari muda esse jogo.`,
    cta: 'Descobrir meu timing',
  },
  {
    badge: 'PARA TODO EMPRESÁRIO',
    headline: 'Todo empresário vai vender a empresa um dia.',
    highlight: 'Mas poucos sabem quanto ela realmente vale.',
    body: `E menos ainda sabem quem poderia comprar você AGORA.

Enquanto você segue operando o negócio, há compradores olhando para o seu mercado. Você não vê. Eles também não sabem que você existe.

Até a Mari conectar vocês dois.`,
    cta: 'Ver quem está olhando',
  },
  {
    badge: 'PARA TODO EMPRESÁRIO',
    headline: 'Você está perdendo dinheiro.',
    highlight: 'E nem sabe.',
    body: `Não é por falta de esforço. É por falta de informação.

Grandes fundos, bancos e players de M&A sempre souberam antes: quem vai vender, quando vender e por quanto vender.

Essa inteligência nunca foi acessível. Até agora.`,
    cta: 'Acessar essa inteligência',
  },
  {
    badge: 'INTELIGÊNCIA PREDITIVA',
    headline: 'Vender empresa não é sorte.',
    highlight: 'É timing, preparação e comprador certo.',
    body: `A Mari analisa sua empresa, seu mercado e possíveis compradores.

Ela mostra se você deveria vender agora, esperar, ou valorizar mais antes. Sem achismo. Sem tentativa e erro.

Resultado: decisão fundamentada, timing perfeito, comprador certo.`,
    cta: 'Calcular meu timing',
  },
  {
    badge: 'A DIFERENÇA MARI',
    headline: 'Eu estou olhando para a sua empresa.',
    highlight: 'Antes de você pedir.',
    body: `Mari não espera você se cadastrar. Não espera você pensar em vender. Não espera proposta chegar.

Mari está aqui agora, analisando os 21 milhões de CNPJs do Brasil, identificando quem está em janela.

Se é você, você descobre em 1 minuto. Sem compromisso.`,
    cta: 'Descobrir agora',
  },
];

export function HeroCarousel() {
  const autoplay = useRef(
    Autoplay({ delay: 5500, stopOnInteraction: false, stopOnMouseEnter: true })
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
      className="relative w-full max-w-5xl mx-auto"
      role="region"
      aria-label="Carrossel de mensagens da Mari"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {SLIDES.map((slide, i) => (
            <div key={i} className="min-w-0 flex-[0_0_100%] px-2">
              <SlideView slide={slide} active={i === selected} />
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-2 mt-8">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir para slide ${i + 1}`}
            onClick={() => emblaApi?.scrollTo(i)}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              i === selected
                ? 'w-8 bg-volt shadow-volt'
                : 'w-2 bg-white/25 hover:bg-white/50'
            )}
          />
        ))}
      </div>
    </div>
  );
}

function SlideView({ slide, active }: { slide: Slide; active: boolean }) {
  return (
    <div className="text-center max-w-4xl mx-auto py-2 min-h-[420px] md:min-h-[460px]">
      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={slide.headline}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-medium tracking-widest uppercase text-accent">
                {slide.badge}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1] tracking-tight text-balance break-words">
              {slide.headline}
            </h1>

            <p className="mb-8">
              <span className="inline-block text-2xl md:text-4xl lg:text-5xl text-gradient-gold bg-accent text-secondary-foreground border-secondary-foreground font-extrabold px-3 py-1 rounded-md leading-tight break-words">
                {slide.highlight}
              </span>
            </p>

            <p className="text-base md:text-lg text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed whitespace-pre-line break-words">
              {slide.body}
            </p>

            <Button
              asChild
              size="lg"
              className="bg-volt hover:bg-volt-light text-carbon shadow-volt h-12 px-7 text-base rounded-xl font-semibold"
            >
              <Link to="/mari">{slide.cta} →</Link>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
