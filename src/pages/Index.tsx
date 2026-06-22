import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Clock, Wallet, Users, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { MariWatermark } from '@/components/brand/MariLogo';
import { MariDivider } from '@/components/brand/MariDivider';
import { SearchBar } from '@/components/home/SearchBar';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { ParticlesBackground } from '@/components/ui/particles-background';
import { stats, categories } from '@/data/mockData';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';

const HomeBelowFold = lazy(() => import('@/components/home/HomeBelowFold'));
import { EquityPlannerSection } from '@/components/home/EquityPlannerSection';

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const Index = () => {
  const { user, loading } = useAuth();
  const { viewAs } = useViewAs();
  const [showBelowFold, setShowBelowFold] = useState(false);

  // Defer below-the-fold mount until idle/scroll, so hero paints fast.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setShowBelowFold(true);
    };
    const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, opts?: { timeout: number }) => number);
    const handle = ric ? ric(trigger, { timeout: 1500 }) : window.setTimeout(trigger, 600);
    const onScroll = () => trigger();
    window.addEventListener('scroll', onScroll, { passive: true, once: true });
    return () => {
      if (ric && typeof handle === 'number') (window as any).cancelIdleCallback?.(handle);
      else window.clearTimeout(handle as number);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Logged-in users get their personal panel — unless admin is impersonating "visitante".
  if (!loading && user && viewAs !== 'visitante') {
    return <Navigate to="/painel" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-40 md:pb-36 gradient-navy-deep bg-grid-pattern overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,_hsla(38,92%,50%,0.08)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,_hsla(222,47%,30%,0.15)_0%,_transparent_50%)]" />

        <MariWatermark
          color="volt"
          opacity={0.07}
          className="hidden md:block absolute -right-40 -top-20 w-[720px] h-[720px]"
        />
        <div className="hidden lg:block absolute right-8 bottom-8 text-right pointer-events-none select-none">
          <div className="text-volt/30 font-display text-[11px] uppercase tracking-[0.4em]">designed forward</div>
          <div className="text-bone/10 font-display font-bold text-[120px] leading-none -mt-2">mari.</div>
        </div>

        <ParticlesBackground variant="dark" />

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
          <HeroCarousel />

          <motion.div
            className="mt-20 lg:mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
          >
            {[
              { icon: Clock, label: 'Janela', text: 'Se sua empresa está em janela de venda nos próximos 12 meses.' },
              { icon: Wallet, label: 'Valor', text: 'Quanto ela pode valer no mercado de M&A hoje.' },
              { icon: Users, label: 'Comprador', text: 'Quem são os compradores prováveis olhando para o seu setor.' },
              { icon: EyeOff, label: 'Sigilo', text: 'Sócios, concorrentes e funcionários nunca saberão que você está aqui. Tudo anônimo.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease, delay: i * 0.1 }}
                className="glass-card rounded-xl p-6 border border-white/10 hover:border-volt/30 transition-colors group"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-volt/10 border border-volt/20 flex items-center justify-center text-volt">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-volt/80">{item.label}</span>
                </div>
                <p className="text-sm md:text-base text-white/75 leading-relaxed break-words">{item.text}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="mt-10 flex flex-col items-center"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease, delay: 0.4 }}
          >
            <Button
              asChild
              size="lg"
              className="bg-volt hover:bg-volt-light text-carbon shadow-volt h-12 sm:h-14 px-6 sm:px-10 text-sm sm:text-base md:text-lg rounded-xl font-bold w-full sm:w-auto max-w-full whitespace-normal text-center leading-tight"
            >
              <Link to="/mari">Analisar minha empresa AGORA →</Link>
            </Button>
            <p className="text-xs text-white/40 mt-4 tracking-wide">Sem cadastro obrigatório · Resultado em 60 segundos</p>
          </motion.div>

          <motion.div
            className="mt-20"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.4 }}
          >
            <p className="text-center text-white/40 text-xs tracking-[0.3em] uppercase mb-4">Encontre o negócio ideal</p>
            <SearchBar />
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-16">
            {[
              { label: 'Empresas em janela', value: formatNumber(stats.totalListings) },
              { label: 'Deals fechados', value: formatNumber(stats.totalTransactions) },
              { label: 'Volume transacionado', value: formatCurrency(stats.totalVolume) },
              { label: 'Tempo médio até oferta', value: `${stats.averageTime} dias` },
            ].map((stat, i) => (
              <motion.div
                key={i}
                className="glass-card rounded-lg px-4 py-4 border border-white/10 hover:border-volt/30 transition-all duration-300"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease, delay: 0.5 + i * 0.06 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1 h-1 rounded-full bg-volt animate-pulse" />
                  <p className="text-[9px] text-white/40 uppercase tracking-[0.25em] truncate">{stat.label}</p>
                </div>
                <p className="text-base sm:text-xl md:text-2xl font-bold text-white font-mono tracking-tight tabular-nums break-words">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section (kept eager — visible content) */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 mb-12 max-w-6xl mx-auto items-end">
            <div className="lg:col-span-7">
              <p className="text-xs font-semibold tracking-[0.3em] uppercase text-accent mb-4">Está procurando comprar?</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-[1.05] tracking-[-0.02em] break-words">
                É um investidor e quer encontrar a melhor empresa para alocar seu capital?
              </h2>
              <div className="w-12 h-1 bg-accent rounded-full mt-5" />
            </div>
            <div className="lg:col-span-5">
              <p className="text-muted-foreground leading-relaxed break-words">
                Mari mostra as empresas com maior probabilidade de fechar deal nos próximos 12 meses — ranqueadas por <span className="text-foreground font-medium">assimetria de valor</span> (não só disponibilidade). Filtre por setor, valor e localização. Mari faz o resto.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/marketplace?sector=${cat.id}`}
                className="group relative rounded-xl overflow-hidden shadow-card h-44 md:h-56"
              >
                <img
                  src={cat.image}
                  alt={cat.label}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                  <h3 className="font-semibold text-white text-sm md:text-base">{cat.label}</h3>
                  <ArrowRight className="h-4 w-4 text-white/0 group-hover:text-white/80 transition-all duration-300 translate-x-[-4px] group-hover:translate-x-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <MariDivider tone="carbon" spacing="sm" />

      <EquityPlannerSection />

      {/* Below the fold: featured listings + CTA + differential + footer — lazy */}
      {showBelowFold && (
        <Suspense fallback={<div className="h-[40vh]" />}>
          <HomeBelowFold />
        </Suspense>
      )}
    </div>
  );
};

export default Index;
