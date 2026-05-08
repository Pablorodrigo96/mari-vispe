import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/Footer';
import { MariDifferentialCard } from '@/components/home/MariDifferentialCard';
import { ParticlesBackground } from '@/components/ui/particles-background';
import FeaturedListingsSection from '@/components/home/FeaturedListingsSection';
import { ConfidentialitySection } from '@/components/home/ConfidentialitySection';

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function HomeBelowFold() {
  return (
    <>
      <FeaturedListingsSection />

      {/* CTA Section */}
      <section className="relative py-24 md:py-32 gradient-navy-deep bg-grid-pattern overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_hsla(38,92%,50%,0.08)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_hsla(222,47%,30%,0.12)_0%,_transparent_50%)]" />
        <ParticlesBackground variant="dark" />

        <motion.div
          className="container mx-auto px-4 lg:px-8 text-center relative z-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
        >
          <p className="text-white/40 text-sm italic mb-6 max-w-lg mx-auto">
            "A mari nos conectou com o comprador ideal em menos de 60 dias. Processo transparente e profissional."
          </p>
          <p className="text-accent text-xs font-medium tracking-widest uppercase mb-8">— Carlos M., Empresário</p>
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 text-balance">Pronto para vender sua empresa?</h2>
          <p className="text-white/50 mb-10 max-w-2xl mx-auto leading-relaxed">
            Anuncie gratuitamente e alcance milhares de compradores e investidores qualificados.
          </p>
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold px-12 h-14 text-lg rounded-xl">
            <Link to="/vender">Anunciar Grátis</Link>
          </Button>
        </motion.div>
      </section>

      <ConfidentialitySection />

      <MariDifferentialCard />
      <Footer />
    </>
  );
}
