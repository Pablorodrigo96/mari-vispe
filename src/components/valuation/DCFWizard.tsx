import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { WizardProgress, WizardStep } from './WizardProgress';
import { StepCompanyType } from './StepCompanyType';
import { StepFinancialData } from './StepFinancialData';
import { StepDCFPremises } from './StepDCFPremises';
import { StepIdentification } from './StepIdentification';
import { DCFReportDialog } from './DCFReportDialog';
import { ValuationPaymentModal } from './ValuationPaymentModal';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Calculator, TrendingUp, BarChart3, Wallet, User } from 'lucide-react';
import { toast } from 'sonner';
import { calculateDCF, parseCurrency, DCFResult, CompanyType } from '@/lib/dcfCalculator';
import { useAuth } from '@/contexts/AuthContext';
import { useValuationAccess } from '@/hooks/useValuationAccess';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface DCFWizardProps {
  onBack: () => void;
}

interface FormData {
  // Step 1 - Company Type
  companyType: CompanyType | '';
  // Step 2 - Financial Data
  annualRevenue: string;
  ebitdaMargin: string;
  netProfitMargin: string;
  // Step 3 - DCF Premises
  capex: string;
  debtPayment: string;
  // Step 4 - Identification
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  segment: string;
  acceptTerms: boolean;
}

const initialFormData: FormData = {
  companyType: '',
  annualRevenue: '',
  ebitdaMargin: '',
  netProfitMargin: '',
  capex: '',
  debtPayment: '',
  fullName: '',
  companyName: '',
  email: '',
  phone: '',
  segment: 'Outros',
  acceptTerms: false,
};

const TOTAL_STEPS = 4;

const dcfWizardSteps: WizardStep[] = [
  { icon: TrendingUp, label: 'Mercado e Estratégia' },
  { icon: BarChart3, label: 'Desempenho Financeiro' },
  { icon: Wallet, label: 'Investimentos e Dívida' },
  { icon: User, label: 'Identificação' },
];

export const DCFWizard = ({ onBack }: DCFWizardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canUseDCF, consumeDCFAccess, loading: accessLoading } = useValuationAccess();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showReport, setShowReport] = useState(false);
  const [dcfResult, setDcfResult] = useState<DCFResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.companyType) {
          toast.error('Selecione o tipo de empresa');
          return false;
        }
        return true;
      case 2:
        if (!formData.annualRevenue) {
          toast.error('Informe o faturamento anual');
          return false;
        }
        if (!formData.ebitdaMargin) {
          toast.error('Informe a margem EBITDA');
          return false;
        }
        return true;
      case 3:
        // CapEx and Debt Payment can be 0, so always valid
        return true;
      case 4:
        if (!formData.fullName.trim()) {
          toast.error('Informe seu nome completo');
          return false;
        }
        if (!formData.companyName.trim()) {
          toast.error('Informe o nome da empresa');
          return false;
        }
        if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          toast.error('Informe um email válido');
          return false;
        }
        if (!formData.acceptTerms) {
          toast.error('Aceite os termos para continuar');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const handleSubmit = async () => {
    // Verificar login
    if (!user) {
      toast.info('Faça login para acessar o Valuation DCF');
      navigate('/auth?redirect=/valuation');
      return;
    }

    // Verificar acesso
    if (!canUseDCF()) {
      setShowPaymentModal(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const inputs = {
        companyType: formData.companyType as CompanyType,
        annualRevenue: parseCurrency(formData.annualRevenue),
        ebitdaMargin: parseFloat(formData.ebitdaMargin) || 0,
        netProfitMargin: parseFloat(formData.netProfitMargin) || 0,
        capex: parseCurrency(formData.capex),
        debtPayment: parseCurrency(formData.debtPayment),
        fullName: formData.fullName,
        companyName: formData.companyName,
        email: formData.email,
        phone: formData.phone,
        segment: formData.segment,
      };

      const result = calculateDCF(inputs);
      
      // Salvar no histórico (bloqueado)
      await supabase.from('valuation_history').insert([{
        user_id: user.id,
        valuation_type: 'dcf',
        company_type: formData.companyType,
        segment: formData.segment,
        inputs: inputs as unknown as Json,
        result: result as unknown as Json,
        status: 'completed',
        locked_at: new Date().toISOString(),
      }]);

      // Consumir crédito
      await consumeDCFAccess();

      setDcfResult(result);
      setShowReport(true);
      toast.success('Valuation DCF calculado com sucesso!');
    } catch (error) {
      console.error('Error calculating DCF:', error);
      toast.error('Erro ao calcular o valuation. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToStart = () => {
    setShowReport(false);
    setDcfResult(null);
    setFormData(initialFormData);
    setCurrentStep(1);
  };

  const handleCloseReport = () => {
    setShowReport(false);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepCompanyType
            data={{ companyType: formData.companyType }}
            onChange={updateFormData}
          />
        );
      case 2:
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
      case 3:
        return (
          <StepDCFPremises
            data={{
              capex: formData.capex,
              debtPayment: formData.debtPayment,
            }}
            onChange={updateFormData}
          />
        );
      case 4:
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
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <WizardProgress currentStep={currentStep - 1} totalSteps={TOTAL_STEPS} steps={dcfWizardSteps} />
          </div>

          {/* Step Content */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-card">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium text-accent">Valuation DCF Profissional</span>
            </div>

            {renderStep()}

            {/* Navigation */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {currentStep === 1 ? 'Voltar' : 'Anterior'}
              </Button>
              <Button
                onClick={handleNext}
                disabled={isSubmitting}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {isSubmitting ? (
                  'Calculando...'
                ) : currentStep === TOTAL_STEPS ? (
                  <>
                    Calcular Valuation
                    <Calculator className="w-4 h-4 ml-2" />
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
      </main>

      {dcfResult && (
        <DCFReportDialog
          open={showReport}
          onClose={handleCloseReport}
          onBackToStart={handleBackToStart}
          result={dcfResult}
        />
      )}

      {/* Payment Modal */}
      <ValuationPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        type="dcf"
      />
    </div>
  );
};
