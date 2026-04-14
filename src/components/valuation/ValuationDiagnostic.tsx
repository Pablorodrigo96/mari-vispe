import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  DiagnosticAnswers,
  DiagnosticItem,
  diagnosticItems,
  categoryLabels,
  categoryIcons,
  getDefaultAnswers,
} from '@/lib/diagnosticCalculator';

interface ValuationDiagnosticProps {
  onComplete: (answers: DiagnosticAnswers) => void;
}

export const ValuationDiagnostic = ({ onComplete }: ValuationDiagnosticProps) => {
  const [answers, setAnswers] = useState<DiagnosticAnswers>(getDefaultAnswers());

  const toggle = (key: keyof DiagnosticAnswers) => {
    setAnswers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const categories = ['fiscal', 'financial', 'governance', 'operational'] as const;

  const itemsByCategory = categories.map((cat) => ({
    category: cat,
    label: categoryLabels[cat],
    icon: categoryIcons[cat],
    items: diagnosticItems.filter((i) => i.category === cat),
  }));

  const noCount = diagnosticItems.filter((item) => !answers[item.key]).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-700">
          DIAGNÓSTICO DE VALOR
        </Badge>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          Sua empresa está preparada para gerar o máximo valor?
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Responda honestamente: cada "Não" reduz o valor real da sua empresa. Esse diagnóstico revela o <strong>Valor Verdadeiro</strong> — o que um comprador ou investidor pagaria hoje.
        </p>
      </motion.div>

      {/* Category Groups */}
      {itemsByCategory.map((group, gi) => (
        <motion.div
          key={group.category}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.1 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">{group.icon}</span>
            <h3 className="font-semibold text-foreground">{group.label}</h3>
          </div>
          <div className="space-y-3">
            {group.items.map((item) => (
              <DiagnosticRow
                key={item.key}
                item={item}
                value={answers[item.key]}
                onToggle={() => toggle(item.key)}
              />
            ))}
          </div>
        </motion.div>
      ))}

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-xl p-6 text-center text-white"
      >
        {noCount > 0 ? (
          <>
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
            <p className="text-white/70 text-sm mb-1">
              Você identificou <strong className="text-amber-400">{noCount}</strong> ponto{noCount > 1 ? 's' : ''} de degradação
            </p>
            <p className="text-lg font-semibold text-white mb-4">
              Veja agora o impacto real no valor da sua empresa
            </p>
          </>
        ) : (
          <>
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
            <p className="text-emerald-300 text-sm mb-1">Nenhum ponto de degradação identificado</p>
            <p className="text-lg font-semibold text-white mb-4">
              Parabéns! Sua empresa está bem estruturada
            </p>
          </>
        )}
        <Button
          size="lg"
          onClick={() => onComplete(answers)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          Revelar Valor Verdadeiro
        </Button>
      </motion.div>
    </div>
  );
};

function DiagnosticRow({ item, value, onToggle }: { item: DiagnosticItem; value: boolean; onToggle: () => void }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg p-3 transition-colors cursor-pointer ${
        value
          ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50'
          : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50'
      }`}
      onClick={onToggle}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{item.label}</p>
        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {!value && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
            -{(item.penalty * 100).toFixed(0)}%
          </Badge>
        )}
        <Switch checked={value} onCheckedChange={onToggle} />
      </div>
    </div>
  );
}
