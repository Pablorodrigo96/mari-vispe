import { X, Check, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const comparisons = [
  { without: 'Dados financeiros expostos a curiosos', with: 'Informações sigilosas, acesso controlado por você' },
  { without: 'Negocia no escuro, sem dados reais', with: 'Negocia com laudo e dados de mercado' },
  { without: 'Aceita a primeira oferta por insegurança', with: 'Argumenta com múltiplos comparáveis' },
  { without: 'Perde 30-50% do valor por falta de preparo', with: 'Valoriza até +78% com diagnóstico e consultoria' },
  { without: 'Não sabe o momento certo de vender', with: 'Planeja saída estratégica com clareza' },
  { without: 'Documentação desorganizada atrasa negociação', with: 'Cofre Digital organiza tudo previamente' },
];

export const ValuationBeforeAfter = () => {
  return (
    <section className="py-14 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Antes vs. Depois do Valuation
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Veja a diferença que um valuation profissional faz na hora de negociar.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <span className="inline-block px-4 py-2 rounded-full bg-destructive/10 text-destructive font-semibold text-sm">
                ❌ Sem Valuation
              </span>
            </div>
            <div className="text-center">
              <span className="inline-block px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold text-sm">
                ✅ Com mari
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {comparisons.map((item, index) => (
              <motion.div
                key={index}
                className="grid grid-cols-2 gap-4"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="bg-card border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
                  <X className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">{item.without}</p>
                </div>
                <div className="bg-card border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground font-medium">{item.with}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
