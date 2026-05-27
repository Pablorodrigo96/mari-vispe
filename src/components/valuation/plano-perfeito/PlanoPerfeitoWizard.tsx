import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { StepCompanyProfile } from '@/components/valuation/StepCompanyProfile';
import { StepFinancialData } from '@/components/valuation/StepFinancialData';
import { StepMetaValuation } from './StepMetaValuation';
import { StepPrazo } from './StepPrazo';
import { StepCacArpu } from './StepCacArpu';
import { StepLeadCapture, type LeadFormData } from './StepLeadCapture';
import { PlanoPerfeitoResultView } from './PlanoPerfeitoResult';

import { useAuth } from '@/contexts/AuthContext';
import { useValuationAccess } from '@/hooks/useValuationAccess';
import { usePlanosPerfeitos } from '@/hooks/usePlanosPerfeitos';
import { supabase } from '@/integrations/supabase/client';
import { parseCurrency } from '@/lib/valuationCalculator';
import { calcularPlanoPerfeito, type PlanoPerfeitoResult } from '@/lib/planoPerfeitoCalculator';

interface FormData {
  // Bloco A — reuso
  companyType: string;
  segment: string;
  annualRevenue: string;
  ebitdaMargin: string;
  netProfitMargin: string;
  // Bloco B — novo
  metaValuation: number;
  prazoAnos: number;
  cac: number;
  arpu: number;
  churnPercent: number;
  // Lead
  lead: LeadFormData;
}

const initial: FormData = {
  companyType: '',
  segment: '',
  annualRevenue: '',
  ebitdaMargin: '',
  netProfitMargin: '',
  metaValuation: 100_000_000,
  prazoAnos: 10,
  cac: 0,
  arpu: 0,
  churnPercent: 5,
  lead: { fullName: '', email: '', phone: '', companyName: '', password: '', passwordConfirm: '' },
};

const STEPS = ['Perfil', 'Financeiro', 'Meta', 'Prazo', 'CAC & ARPU', 'Contato'] as const;

export const PlanoPerfeitoWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forceNew = searchParams.get('novo') === '1';
  const { user } = useAuth();
  const { canUseMultiples, consumeMultiplesAccess, isMasterPlan, isAdmin } = useValuationAccess();
  const { data: planosSalvos, isLoading: planosLoading } = usePlanosPerfeitos();

  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(initial);
  const [result, setResult] = useState<PlanoPerfeitoResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hidrata último plano salvo quando o usuário entra pelo menu
  useEffect(() => {
    if (hydrated || forceNew || !user || planosLoading) return;
    const ultimo = planosSalvos?.[0];
    if (ultimo?.result) {
      setResult(ultimo.result as PlanoPerfeitoResult);
    }
    setHydrated(true);
  }, [user, planosSalvos, planosLoading, forceNew, hydrated]);

  // Logged-in user pode pular o lead step (já temos os dados)
  const needsLeadStep = !user;
  const lastStep = needsLeadStep ? STEPS.length - 1 : STEPS.length - 2;

  const update = <K extends keyof FormData>(field: K, value: FormData[K]) =>
    setData((d) => ({ ...d, [field]: value }));

  const updateLead = (field: keyof LeadFormData, value: string) =>
    setData((d) => ({ ...d, lead: { ...d.lead, [field]: value } }));

  const validate = (): boolean => {
    switch (step) {
      case 0:
        if (!data.companyType) return toast.error('Selecione o tipo de empresa'), false;
        if (!data.segment) return toast.error('Selecione o segmento'), false;
        return true;
      case 1:
        if (!data.annualRevenue) return toast.error('Informe o faturamento'), false;
        if (!data.ebitdaMargin) return toast.error('Informe a margem EBITDA'), false;
        if (!data.netProfitMargin) return toast.error('Informe a margem líquida'), false;
        return true;
      case 2:
        if (!data.metaValuation || data.metaValuation < 1_000_000)
          return toast.error('Defina uma meta de valuation'), false;
        return true;
      case 3:
        if (!data.prazoAnos) return toast.error('Defina o prazo'), false;
        return true;
      case 4:
        if (!data.cac) return toast.error('Informe seu CAC'), false;
        if (!data.arpu) return toast.error('Informe seu ticket médio anual'), false;
        return true;
      case 5:
        if (!data.lead.fullName.trim()) return toast.error('Informe seu nome'), false;
        if (!data.lead.email.includes('@')) return toast.error('Informe um e-mail válido'), false;
        if (data.lead.phone.replace(/\D/g, '').length < 10) return toast.error('Informe um WhatsApp válido'), false;
        if (!data.lead.companyName.trim()) return toast.error('Informe sua empresa'), false;
        if (data.lead.password.length < 8) return toast.error('A senha precisa ter no mínimo 8 caracteres'), false;
        if (data.lead.password !== data.lead.passwordConfirm) return toast.error('As senhas não coincidem'), false;
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validate()) return;
    if (step < lastStep) {
      setStep(step + 1);
      return;
    }
    await handleSubmit();
  };

  const handlePrev = () => {
    if (step === 0) navigate('/valuation');
    else setStep(step - 1);
  };

  const waitForSession = async (maxTries = 8, delayMs = 250): Promise<string | null> => {
    for (let i = 0; i < maxTries; i++) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) return session.user.id;
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return null;
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    // Sempre calcula PRIMEIRO — não dependemos de auth pra mostrar o resultado
    const valuationInputs = {
      companyType: data.companyType,
      segment: data.segment,
      annualRevenue: parseCurrency(data.annualRevenue),
      ebitdaMargin: parseFloat(data.ebitdaMargin) || 0,
      netProfitMargin: parseFloat(data.netProfitMargin) || 0,
      fullName: data.lead.fullName || user?.email || '',
      companyName: data.lead.companyName || '',
      email: data.lead.email || user?.email || '',
      phone: data.lead.phone || '',
    };
    const planoInputs = {
      metaValuation: data.metaValuation,
      prazoAnos: data.prazoAnos,
      cac: data.cac,
      arpu: data.arpu,
      churnAnual: (data.churnPercent || 5) / 100,
    };

    let calc: PlanoPerfeitoResult;
    try {
      calc = calcularPlanoPerfeito(valuationInputs, planoInputs);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar o Plano Perfeito.');
      setSubmitting(false);
      return;
    }

    try {
      // 1. Garantir conta — se não logado, criar via edge function
      let userId = user?.id;
      if (!userId) {
        const { data: signup, error: signErr } = await supabase.functions.invoke('plano-perfeito-signup', {
          body: {
            fullName: data.lead.fullName,
            email: data.lead.email,
            phone: data.lead.phone,
            companyName: data.lead.companyName,
            password: data.lead.password,
          },
        });
        if (signErr || !signup?.success) {
          toast.error(signup?.error || 'Não conseguimos criar sua conta. Tente novamente.');
          setSubmitting(false);
          return;
        }
        // Auto-login com a senha temporária
        if (signup.tempPassword) {
          const { error: loginErr } = await supabase.auth.signInWithPassword({
            email: data.lead.email,
            password: signup.tempPassword,
          });
          if (loginErr) {
            console.warn('auto-login falhou', loginErr);
          }
        }
        // Aguarda propagação da sessão (até 2s)
        userId = (await waitForSession()) ?? undefined;
      }

      // 2. Se temos sessão: checa crédito + persiste
      if (userId) {
        if (!canUseMultiples()) {
          // Mostra resultado mesmo assim, mas avisa
          setResult(calc);
          toast.warning('Você já usou seu Plano grátis. Resultado mostrado em modo prévia.');
          setSubmitting(false);
          return;
        }

        const { error: insertError } = await supabase
          .from('planos_perfeitos' as any)
          .insert({
            user_id: userId,
            valuation_inputs: valuationInputs as any,
            plano_inputs: planoInputs as any,
            result: calc as any,
            valuation_atual: calc.valuationAtual,
            valuation_meta: calc.valuationMeta,
            investimento_mensal: calc.investimentoMensal,
            viabilidade: calc.viabilidade,
            lead_tag: 'plano_perfeito',
          });

        if (insertError) {
          console.error('Erro ao salvar plano perfeito', insertError);
          // Mostra o resultado mesmo sem persistir — usuário não perde o cálculo
          setResult(calc);
          toast.warning('Mostrando seu plano, mas não conseguimos salvá-lo agora.');
          setSubmitting(false);
          return;
        }

        // Consumir crédito só após persistir
        if (!isAdmin && !isMasterPlan) {
          await consumeMultiplesAccess();
        }

        setResult(calc);
        toast.success('Conta criada e Plano Perfeito pronto! Guarde seu e-mail e senha.');
      } else {
        // Conta criada mas sessão não propagou — mostra resultado direto
        setResult(calc);
        toast.success('Plano Perfeito pronto! Conta criada — use seu e-mail e senha para acessar depois.');
      }
    } catch (err) {
      console.error(err);
      // Mesmo com erro, mostra o cálculo — só não persistimos
      setResult(calc);
      toast.warning('Mostrando seu plano. Não conseguimos salvar agora.');
    } finally {
      setSubmitting(false);
    }
  };

  // RESULTADO
  if (result) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12 container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <PlanoPerfeitoResultView
              result={result}
              isLoggedIn={!!user}
              onAcessarRelatorio={() => navigate(user ? '/meus-planos-perfeitos' : '/auth')}
              onRestart={() => {
                setResult(null);
                setStep(0);
                setData(initial);
                navigate('/valuation/plano-perfeito?novo=1', { replace: true });
              }}
              onConsultoria={() => navigate('/capital')}
            />
          </div>
        </main>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <StepCompanyProfile
            data={{ companyType: data.companyType, segment: data.segment }}
            onChange={(f, v) => update(f as any, v as any)}
          />
        );
      case 1:
        return (
          <StepFinancialData
            data={{
              annualRevenue: data.annualRevenue,
              ebitdaMargin: data.ebitdaMargin,
              netProfitMargin: data.netProfitMargin,
            }}
            onChange={(f, v) => update(f as any, v as any)}
          />
        );
      case 2:
        return <StepMetaValuation value={data.metaValuation} onChange={(v) => update('metaValuation', v)} />;
      case 3:
        return <StepPrazo value={data.prazoAnos} onChange={(v) => update('prazoAnos', v)} />;
      case 4:
        return (
          <StepCacArpu
            cac={data.cac} arpu={data.arpu} churnPercent={data.churnPercent}
            onChangeCac={(v) => update('cac', v)}
            onChangeArpu={(v) => update('arpu', v)}
            onChangeChurn={(v) => update('churnPercent', v)}
          />
        );
      case 5:
        return <StepLeadCapture data={data.lead} onChange={updateLead} />;
      default:
        return null;
    }
  };

  const totalRender = lastStep + 1;
  const progress = ((step + 1) / totalRender) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handlePrev}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 0 ? 'Voltar para Valuation' : 'Passo anterior'}
          </button>

          {/* Header + progress */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <p className="text-xs uppercase tracking-widest text-accent font-bold">O Plano Perfeito</p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight break-words">
              Construa a ponte da sua empresa até o bilhão
            </h1>
            <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Passo {step + 1} de {totalRender} · {STEPS[step]}
            </p>
          </div>

          {/* Step */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-card">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border">
              <Button
                onClick={handleNext}
                disabled={submitting}
                className="bg-accent hover:bg-accent/90 text-accent-foreground min-w-[180px]"
              >
                {submitting ? 'Gerando…' : step === lastStep ? (
                  <>Gerar Plano Perfeito <Send className="ml-2 h-4 w-4" /></>
                ) : (
                  <>Próximo <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
