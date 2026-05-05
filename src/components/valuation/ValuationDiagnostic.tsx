import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, ShieldCheck, AlertTriangle, Check, X } from 'lucide-react';
import {
  DiagnosticAnswers,
  diagnosticItems,
  categoryLabels,
  categoryIcons,
  getDefaultAnswers,
} from '@/lib/diagnosticCalculator';

interface ValuationDiagnosticProps {
  onComplete: (answers: DiagnosticAnswers) => void;
}

// step layout: 0 = intro title, 1 = subtítulo, 2..N+1 = perguntas, N+2 = summary
export const ValuationDiagnostic = ({ onComplete }: ValuationDiagnosticProps) => {
  const [answers, setAnswers] = useState<DiagnosticAnswers>(getDefaultAnswers());
  const [step, setStep] = useState(0);

  const totalQuestionSteps = diagnosticItems.length;
  const introSteps = 2;
  const summaryStepIndex = introSteps + totalQuestionSteps;
  const totalSteps = summaryStepIndex + 1;

  const isIntroTitle = step === 0;
  const isIntroSubtitle = step === 1;
  const isSummary = step === summaryStepIndex;
  const isQuestion = !isIntroTitle && !isIntroSubtitle && !isSummary;

  const questionIndex = step - introSteps;
  const currentItem = isQuestion ? diagnosticItems[questionIndex] : null;

  const noCount = diagnosticItems.filter((item) => !answers[item.key]).length;

  const goNext = () => setStep((s) => Math.min(s + 1, summaryStepIndex));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const answerCurrent = (value: boolean) => {
    if (!currentItem) return;
    setAnswers((prev) => ({ ...prev, [currentItem.key]: value }));
    setTimeout(goNext, 180);
  };

  const progressPct = isIntroTitle
    ? 0
    : isIntroSubtitle
    ? 5
    : isSummary
    ? 100
    : 10 + ((questionIndex + 1) / totalQuestionSteps) * 85;

  return (
    <div className="space-y-6 max-w-2xl mx-auto px-4 py-8 min-h-[420px] flex flex-col">
      {/* Top progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-700">
            DIAGNÓSTICO DE VALOR
          </Badge>
          <span>
            {isQuestion
              ? `Pergunta ${questionIndex + 1} de ${totalQuestionSteps}`
              : isSummary
              ? 'Resultado'
              : `${step + 1} / ${totalSteps}`}
          </span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isIntroTitle && (
            <motion.div
              key="intro-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-6"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                Sua empresa está preparada para gerar o máximo valor?
              </h2>
              <Button size="lg" onClick={goNext} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Começar diagnóstico
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {isIntroSubtitle && (
            <motion.div
              key="intro-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-6 max-w-xl"
            >
              <p className="text-lg md:text-xl text-foreground leading-relaxed">
                Responda honestamente: cada <strong>"Não"</strong> reduz o valor real da sua empresa.
              </p>
              <p className="text-muted-foreground">
                Esse diagnóstico revela o <strong className="text-foreground">Valor Verdadeiro</strong> — o que um comprador ou investidor pagaria hoje.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="ghost" onClick={goBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button size="lg" onClick={goNext} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {isQuestion && currentItem && (
            <motion.div
              key={`q-${currentItem.key}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="w-full space-y-6"
            >
              <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                <span className="text-lg">{categoryIcons[currentItem.category]}</span>
                <span>{categoryLabels[currentItem.category]}</span>
              </div>

              <div className="text-center space-y-3">
                <h3 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                  {currentItem.label}
                </h3>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                  {currentItem.description}
                </p>
                <Badge variant="destructive" className="text-[10px]">
                  Impacto se "Não": -{(currentItem.penalty * 100).toFixed(0)}%
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                <Button
                  size="lg"
                  variant={answers[currentItem.key] === false ? 'default' : 'outline'}
                  onClick={() => answerCurrent(false)}
                  className={
                    answers[currentItem.key] === false
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-transparent'
                  }
                >
                  <X className="w-4 h-4 mr-2" />
                  Não
                </Button>
                <Button
                  size="lg"
                  variant={answers[currentItem.key] === true ? 'default' : 'outline'}
                  onClick={() => answerCurrent(true)}
                  className={
                    answers[currentItem.key] === true
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-transparent'
                  }
                >
                  <Check className="w-4 h-4 mr-2" />
                  Sim
                </Button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={goBack}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={answers[currentItem.key]}
                    onCheckedChange={(v) => setAnswers((prev) => ({ ...prev, [currentItem.key]: v }))}
                  />
                  <span>{answers[currentItem.key] ? 'Sim' : 'Não'}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={goNext}>
                  Pular
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {isSummary && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-xl p-8 text-center text-white space-y-3"
            >
              {noCount > 0 ? (
                <>
                  <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-amber-400" />
                  <p className="text-white/70 text-sm">
                    Você identificou <strong className="text-amber-400">{noCount}</strong> ponto
                    {noCount > 1 ? 's' : ''} de degradação
                  </p>
                  <p className="text-xl font-semibold text-white">
                    Veja agora o impacto real no valor da sua empresa
                  </p>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                  <p className="text-emerald-300 text-sm">Nenhum ponto de degradação identificado</p>
                  <p className="text-xl font-semibold text-white">
                    Parabéns! Sua empresa está bem estruturada
                  </p>
                </>
              )}
              <div className="flex items-center justify-center gap-3 pt-3">
                <Button variant="ghost" onClick={goBack} className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Revisar
                </Button>
                <Button
                  size="lg"
                  onClick={() => onComplete(answers)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Revelar Valor Verdadeiro
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
