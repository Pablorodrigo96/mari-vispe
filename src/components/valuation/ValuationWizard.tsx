import { useState } from 'react';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WizardProgress } from './WizardProgress';
import { StepBasicData } from './StepBasicData';
import { StepPerformance } from './StepPerformance';
import { StepIdentification } from './StepIdentification';
import { ValuationReportDialog } from './ValuationReportDialog';
import { toast } from 'sonner';
import {
  calculateValuation,
  parseCurrency,
  mapCompanyType,
  mapRecurrence,
  mapDependency,
  ValuationResult,
} from '@/lib/valuationCalculator';

interface ValuationWizardProps {
  onBack: () => void;
}

interface FormData {
  // Step 1
  companyType: string;
  segment: string;
  annualRevenue: string;
  ebitdaPercentage: string;
  tangibleAssets: string;
  totalDebt: string;
  // Step 2
  revenueRecurrence: string;
  founderDependency: string;
  // Step 3
  fullName: string;
  companyName: string;
  website: string;
  state: string;
  city: string;
  foundingMonth: string;
  foundingYear: string;
  email: string;
  phone: string;
  acceptTerms: boolean;
}

const initialFormData: FormData = {
  companyType: '',
  segment: '',
  annualRevenue: '',
  ebitdaPercentage: '',
  tangibleAssets: '',
  totalDebt: '',
  revenueRecurrence: '',
  founderDependency: '',
  fullName: '',
  companyName: '',
  website: '',
  state: '',
  city: '',
  foundingMonth: '',
  foundingYear: '',
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
        if (!formData.annualRevenue) {
          toast.error('Informe o faturamento bruto');
          return false;
        }
        if (!formData.ebitdaPercentage) {
          toast.error('Informe o EBITDA em %');
          return false;
        }
        return true;
      case 1:
        if (!formData.revenueRecurrence) {
          toast.error('Selecione o nível de recorrência');
          return false;
        }
        if (!formData.founderDependency) {
          toast.error('Selecione o nível de dependência do fundador');
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
        if (!formData.state) {
          toast.error('Selecione o estado');
          return false;
        }
        if (!formData.city.trim()) {
          toast.error('Informe a cidade');
          return false;
        }
        if (!formData.foundingMonth || !formData.foundingYear) {
          toast.error('Informe a data de fundação');
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
      // Submit form
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
    // Prepare inputs for calculation
    const inputs = {
      annualRevenue: parseCurrency(formData.annualRevenue),
      ebitdaPercentage: parseFloat(formData.ebitdaPercentage) || 0,
      companyType: mapCompanyType(formData.companyType),
      totalDebt: parseCurrency(formData.totalDebt),
      tangibleAssets: parseCurrency(formData.tangibleAssets),
      revenueRecurrence: mapRecurrence(formData.revenueRecurrence),
      founderDependency: mapDependency(formData.founderDependency),
      companyName: formData.companyName,
      segment: formData.segment,
      fullName: formData.fullName,
      state: formData.state,
      city: formData.city,
      foundingMonth: formData.foundingMonth,
      foundingYear: formData.foundingYear,
      email: formData.email,
      website: formData.website,
    };

    // Calculate valuation
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
          <StepBasicData
            data={{
              companyType: formData.companyType,
              segment: formData.segment,
              annualRevenue: formData.annualRevenue,
              ebitdaPercentage: formData.ebitdaPercentage,
              tangibleAssets: formData.tangibleAssets,
              totalDebt: formData.totalDebt,
            }}
            onChange={updateFormData}
          />
        );
      case 1:
        return (
          <StepPerformance
            data={{
              revenueRecurrence: formData.revenueRecurrence,
              founderDependency: formData.founderDependency,
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
              website: formData.website,
              state: formData.state,
              city: formData.city,
              foundingMonth: formData.foundingMonth,
              foundingYear: formData.foundingYear,
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
    <div className="min-h-screen bg-background py-8">
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
                className="bg-gold hover:bg-gold/90 text-gold-foreground min-w-[160px]"
              >
                {currentStep === totalSteps - 1 ? (
                  <>
                    Calcular Valuation
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
