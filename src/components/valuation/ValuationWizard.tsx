import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WizardProgress } from './WizardProgress';
import { StepCompanyProfile } from './StepCompanyProfile';
import { StepFinancialData } from './StepFinancialData';
import { StepIdentification } from './StepIdentification';
import { ValuationReportDialog } from './ValuationReportDialog';
import { ValuationPaymentModal } from './ValuationPaymentModal';
import { toast } from 'sonner';
import { calculateValuation, parseCurrency, ValuationResult } from '@/lib/valuationCalculator';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useValuationAccess } from '@/hooks/useValuationAccess';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface ValuationWizardProps {
  onBack: () => void;
}

interface FormData {
  // Step 1 - Perfil
  companyType: string;
  segment: string;
  // Step 2 - Financeiro
  annualRevenue: string;
  ebitdaMargin: string;
  netProfitMargin: string;
  // Step 3 - Lead
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  acceptTerms: boolean;
}

const initialFormData: FormData = {
  companyType: '',
  segment: '',
  annualRevenue: '',
  ebitdaMargin: '',
  netProfitMargin: '',
  fullName: '',
  companyName: '',
  email: '',
  phone: '',
  acceptTerms: false,
};

export const ValuationWizard = ({ onBack }: ValuationWizardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canUseMultiples, consumeMultiplesAccess, loading: accessLoading } = useValuationAccess();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showReport, setShowReport] = useState(false);
  const [valuationResult, setValuationResult] = useState<ValuationResult | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastValuationId, setLastValuationId] = useState<string | null>(null);

  const totalSteps = 3;

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (): boolean => {
    switch (currentStep) {
      case 0:
        if (!formData.companyType) {
          toast.error('Selecione o tipo de empresa');
          return false;
        }
        if (!formData.segment) {
          toast.error('Selecione o segmento da empresa');
          return false;
        }
        return true;
      case 1:
        if (!formData.annualRevenue) {
          toast.error('Informe o faturamento bruto');
          return false;
        }
        if (!formData.ebitdaMargin) {
          toast.error('Informe a margem EBITDA');
          return false;
        }
        if (!formData.netProfitMargin) {
          toast.error('Informe a margem de lucro líquido');
          return false;
        }
        return true;
      case 2:
        if (!formData.fullName.trim()) {
          toast.error('Informe seu nome completo');
          return false;
        }
        if (!formData.companyName.trim()) {
          toast.error('Informe o nome da empresa');
          return false;
        }
        if (!formData.email.trim() || !formData.email.includes('@')) {
          toast.error('Informe um email válido');
          return false;
        }
        if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length < 10) {
          toast.error('Informe um telefone válido');
          return false;
        }
        if (!formData.acceptTerms) {
          toast.error('Você precisa aceitar os termos e condições');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const handleSubmit = async () => {
    // Verificar login
    if (!user) {
      toast.info('Faça login para continuar');
      navigate('/auth?redirect=/valuation');
      return;
    }

    // Verificar acesso
    if (!canUseMultiples()) {
      setShowPaymentModal(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const inputs = {
        companyType: formData.companyType,
        segment: formData.segment,
        annualRevenue: parseCurrency(formData.annualRevenue),
        ebitdaMargin: parseFloat(formData.ebitdaMargin) || 0,
        netProfitMargin: parseFloat(formData.netProfitMargin) || 0,
        fullName: formData.fullName,
        companyName: formData.companyName,
        email: formData.email,
        phone: formData.phone,
      };

      const result = calculateValuation(inputs);
      
      // Salvar no histórico ANTES de consumir crédito
      const { data: insertedValuation, error: insertError } = await supabase
        .from('valuation_history')
        .insert([{
          user_id: user.id,
          valuation_type: 'multiples',
          segment: formData.segment,
          inputs: inputs as unknown as Json,
          result: result as unknown as Json,
          status: 'completed',
          locked_at: new Date().toISOString(),
        }])
        .select('id')
        .single();

      if (insertError || !insertedValuation) {
        console.error('Falha ao salvar valuation', insertError);
        toast.error('Não conseguimos salvar seu valuation. Seu crédito foi preservado, tente novamente.');
        setIsSubmitting(false);
        return;
      }

      setLastValuationId(insertedValuation.id);
      // Consumir crédito SOMENTE após persistir
      await consumeMultiplesAccess();

      setValuationResult(result);
      setShowReport(true);
      toast.success('Valuation calculado com sucesso!');
    } catch (error) {
      console.error('Error calculating valuation:', error);
      toast.error('Erro ao calcular o valuation. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToStart = () => {
    setFormData(initialFormData);
    setCurrentStep(0);
    setShowReport(false);
    setValuationResult(null);
    onBack();
  };

  const handleCloseReport = () => {
    setShowReport(false);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <StepCompanyProfile
            data={{
              companyType: formData.companyType,
              segment: formData.segment,
            }}
            onChange={updateFormData}
          />
        );
      case 1:
        return (
          <StepFinancialData
            data={{
              annualRevenue: formData.annualRevenue,
              ebitdaMargin: formData.ebitdaMargin,
              netProfitMargin: formData.netProfitMargin,
            }}
            onChange={updateFormData}
          />
        );
      case 2:
        return (
          <StepIdentification
            data={{
              fullName: formData.fullName,
              companyName: formData.companyName,
              email: formData.email,
              phone: formData.phone,
              acceptTerms: formData.acceptTerms,
            }}
            onChange={updateFormData}
          />
        );
      default:
        return null;
    }
  };

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-8 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-8">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Back button */}
            <button
              onClick={handlePrevious}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {currentStep === 0 ? 'Voltar' : 'Passo anterior'}
            </button>

            {/* Progress */}
            <WizardProgress currentStep={currentStep} totalSteps={totalSteps} />

            {/* Form Card */}
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-card">
              {renderStep()}

              {/* Navigation */}
              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-border">
                <Button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground min-w-[160px]"
                >
                  {isSubmitting ? (
                    'Calculando...'
                  ) : currentStep === totalSteps - 1 ? (
                    <>
                      Gerar Valuation Agora
                      <Send className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Próximo
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Valuation Report Dialog */}
      {valuationResult && (
        <ValuationReportDialog
          open={showReport}
          onClose={handleCloseReport}
          onBackToStart={handleBackToStart}
          result={valuationResult}
          valuationId={lastValuationId || undefined}
        />
      )}

      {/* Payment Modal */}
      <ValuationPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        type="multiples"
      />
    </div>
  );
};
