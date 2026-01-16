import { useState } from 'react';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WizardProgress } from './WizardProgress';
import { StepCompanyProfile } from './StepCompanyProfile';
import { StepFinancialData } from './StepFinancialData';
import { StepIdentification } from './StepIdentification';
import { ValuationReportDialog } from './ValuationReportDialog';
import { toast } from 'sonner';
import { calculateValuation, parseCurrency, ValuationResult } from '@/lib/valuationCalculator';
import { Header } from '@/components/layout/Header';

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
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showReport, setShowReport] = useState(false);
  const [valuationResult, setValuationResult] = useState<ValuationResult | null>(null);

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

  const handleSubmit = () => {
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
    setValuationResult(result);
    setShowReport(true);
    toast.success('Valuation calculado com sucesso!');
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
                  className="bg-accent hover:bg-accent/90 text-accent-foreground min-w-[160px]"
                >
                  {currentStep === totalSteps - 1 ? (
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
        />
      )}
    </div>
  );
};
