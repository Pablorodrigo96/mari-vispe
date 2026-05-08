import { motion } from 'framer-motion';
import { EyeOff, FileSignature, ShieldCheck, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const pillars = [
  {
    Icon: EyeOff,
    title: 'Codinome anônimo',
    body: 'Sua empresa aparece apenas como MARI-XXX-1234. Razão social, CNPJ, endereço e fotos identificáveis nunca são públicos.',
  },
  {
    Icon: FileSignature,
    title: 'NDA obrigatório',
    body: 'Compradores só veem dados reais após assinarem NDA digital. E só se você aprovar a liberação — caso a caso.',
  },
  {
    Icon: Lock,
    title: 'Você no controle',
    body: 'Cada acesso aos seus dados é registrado e auditado (LGPD). Sócios, concorrentes, funcionários e bancos jamais saberão que você está aqui.',
  },
];

export function ConfidentialitySection() {
  return (
    <section className="relative py-24 gradient-navy-deep bg-grid-pattern overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsla(74,85%,68%,0.06)_0%,_transparent_60%)]" />
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-volt/25 bg-volt/5 mb-5">
            <ShieldCheck className="h-3.5 w-3.5 text-volt" />
            <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-volt/90">
              Sigilo absoluto
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5 leading-[1.05] tracking-[-0.02em] break-words">
            A plataforma mais sigilosa do mercado brasileiro de M&A.
          </h2>
          <p className="text-base md:text-lg text-white/65 leading-relaxed break-words">
            Nenhum concorrente, sócio, funcionário ou banco vai saber que você está aqui.
            Todos os dados são <span className="text-volt font-semibold">anônimos por padrão</span> —
            sua identidade só é revelada quando VOCÊ autorizar.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto mb-12">
          {pillars.map(({ Icon, title, body }, i) => (
            <motion.div
              key={title}
              className="glass-card rounded-xl p-6 border border-white/10 hover:border-volt/30 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease, delay: i * 0.1 }}
            >
              <div className="h-10 w-10 rounded-lg bg-volt/10 border border-volt/20 flex items-center justify-center text-volt mb-4">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/65 leading-relaxed break-words">{body}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Button
            asChild
            size="lg"
            className="bg-volt hover:bg-volt-light text-carbon shadow-volt h-12 px-8 text-base rounded-xl font-semibold"
          >
            <Link to="/sell">Anunciar com sigilo total →</Link>
          </Button>
          <p className="text-xs text-white/40 mt-4 tracking-wide">
            Codinome anônimo · NDA obrigatório · Conformidade LGPD
          </p>
        </div>
      </div>
    </section>
  );
}
