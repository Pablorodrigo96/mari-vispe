import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Building2, DollarSign, User, ArrowRight, ArrowLeft, Check,
  Sparkles, ShieldCheck, Clock, Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  {
    icon: Building2,
    eyebrow: 'Etapa 1 de 3 · ~20s',
    title: 'Conte sobre a empresa',
    description:
      'Seu segmento e tipo de negócio. Usamos isso para escolher os múltiplos certos do mercado brasileiro.',
    bullets: ['Segmento (ex: SaaS, Varejo, Indústria)', 'Tipo da empresa (LTDA, MEI, S.A.)'],
  },
  {
    icon: DollarSign,
    eyebrow: 'Etapa 2 de 3 · ~25s',
    title: 'Números essenciais',
    description:
      'Receita anual, margem EBITDA e margem de lucro. Pode ser estimativa — você refina depois.',
    bullets: ['Faturamento dos últimos 12 meses', 'Margem EBITDA aproximada', 'Margem líquida aproximada'],
  },
  {
    icon: User,
    eyebrow: 'Etapa 3 de 3 · ~15s',
    title: 'Para enviar seu relatório',
    description:
      'Nome e contato para gerar o relatório completo com 3 valores: estimado, verdadeiro e potencial.',
    bullets: ['Nome e empresa', 'Email para receber o PDF'],
  },
];

export function ValuationOnboardingDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  const handleStart = () => {
    onOpenChange(false);
    setStep(0);
    navigate('/valuation/multiplos');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setStep(0); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-2 border-accent/30 bg-gradient-to-br from-card via-card to-accent/5">
        <div className="px-6 pt-6">
          <div className="flex items-center gap-2 mb-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  i <= step ? 'bg-accent' : 'bg-muted'
                )}
              />
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
            Passo guiado · Valuation em 60s
          </p>
        </div>

        <div className="p-6 md:p-8 pt-4">
          <div className="flex items-start gap-4 mb-5">
            <div className="h-14 w-14 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
              <Icon className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-bold mb-1">
                {current.eyebrow}
              </p>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight leading-tight break-words">
                {current.title}
              </h3>
            </div>
          </div>

          <p className="text-sm md:text-base text-muted-foreground mb-5 leading-relaxed break-words">
            {current.description}
          </p>

          <ul className="space-y-2.5 mb-6">
            {current.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <div className="h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-accent" strokeWidth={3} />
                </div>
                <span className="break-words">{b}</span>
              </li>
            ))}
          </ul>

          {isLast && (
            <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/40 border border-border mb-6">
              {[
                { icon: Clock, label: '60 segundos' },
                { icon: ShieldCheck, label: 'Dados seguros' },
                { icon: Sparkles, label: 'Grátis' },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground justify-center">
                  <t.icon className="h-3.5 w-3.5 text-accent" />
                  <span className="font-medium">{t.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>

            {!isLast ? (
              <Button
                size="lg"
                onClick={() => setStep((s) => s + 1)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
              >
                Próximo <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleStart}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-lg shadow-accent/30"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Começar agora <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            )}
          </div>

          {!isLast && (
            <div className="text-center mt-4">
              <button
                onClick={handleStart}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Pular guia e ir direto para o formulário
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
