import { useState } from 'react';
import { Building2, MapPin, DollarSign, Camera, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import StepIndicator from './StepIndicator';
import StepBasicInfo from './StepBasicInfo';
import StepLocation from './StepLocation';
import StepFinancials from './StepFinancials';
import StepMedia from './StepMedia';
import StepContact from './StepContact';
import SuccessScreen from './SuccessScreen';

const steps = [
  { id: 1, title: 'Básico', icon: <Building2 className="w-4 h-4" /> },
  { id: 2, title: 'Localização', icon: <MapPin className="w-4 h-4" /> },
  { id: 3, title: 'Financeiro', icon: <DollarSign className="w-4 h-4" /> },
  { id: 4, title: 'Fotos', icon: <Camera className="w-4 h-4" /> },
  { id: 5, title: 'Contato', icon: <User className="w-4 h-4" /> },
];

interface FormData {
  // Step 1
  title: string;
  category: string;
  description: string;
  // Step 2
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  hideAddress: boolean;
  // Step 3
  annualRevenue: string;
  annualProfit: string;
  ebitda: string;
  askingPrice: string;
  saleReason: string;
  // Step 4
  images: string[];
  // Step 5
  fullName: string;
  email: string;
  phone: string;
  acceptTerms: boolean;
}

const initialFormData: FormData = {
  title: '',
  category: '',
  description: '',
  cep: '',
  state: '',
  city: '',
  neighborhood: '',
  hideAddress: true,
  annualRevenue: '',
  annualProfit: '',
  ebitda: '',
  askingPrice: '',
  saleReason: '',
  images: [],
  fullName: '',
  email: '',
  phone: '',
  acceptTerms: false,
};

const SellWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const updateFormData = (field: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.title || !formData.category || !formData.description) {
          toast({
            title: 'Campos obrigatórios',
            description: 'Preencha todos os campos marcados com *',
            variant: 'destructive',
          });
          return false;
        }
        if (formData.description.length < 100) {
          toast({
            title: 'Descrição muito curta',
            description: 'A descrição deve ter no mínimo 100 caracteres',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      case 2:
        if (!formData.cep || !formData.state || !formData.city) {
          toast({
            title: 'Campos obrigatórios',
            description: 'Preencha CEP, Estado e Cidade',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      case 3:
        if (
          !formData.annualRevenue ||
          !formData.annualProfit ||
          !formData.askingPrice ||
          !formData.saleReason
        ) {
          toast({
            title: 'Campos obrigatórios',
            description: 'Preencha todos os dados financeiros obrigatórios',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      case 4:
        return true; // Photos are optional
      case 5:
        if (!formData.fullName || !formData.email || !formData.phone) {
          toast({
            title: 'Campos obrigatórios',
            description: 'Preencha todos os dados de contato',
            variant: 'destructive',
          });
          return false;
        }
        if (!formData.acceptTerms) {
          toast({
            title: 'Termos não aceitos',
            description: 'Você precisa aceitar os termos para continuar',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      } else {
        // Submit form
        setIsSubmitted(true);
        toast({
          title: 'Sucesso!',
          description: 'Seu anúncio foi enviado para análise',
        });
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="p-6 sm:p-8">
        <SuccessScreen />
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <StepIndicator steps={steps} currentStep={currentStep} />

      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <StepBasicInfo
            data={{
              title: formData.title,
              category: formData.category,
              description: formData.description,
            }}
            onChange={updateFormData}
          />
        )}
        {currentStep === 2 && (
          <StepLocation
            data={{
              cep: formData.cep,
              state: formData.state,
              city: formData.city,
              neighborhood: formData.neighborhood,
              hideAddress: formData.hideAddress,
            }}
            onChange={updateFormData}
          />
        )}
        {currentStep === 3 && (
          <StepFinancials
            data={{
              annualRevenue: formData.annualRevenue,
              annualProfit: formData.annualProfit,
              ebitda: formData.ebitda,
              askingPrice: formData.askingPrice,
              saleReason: formData.saleReason,
            }}
            onChange={updateFormData}
          />
        )}
        {currentStep === 4 && (
          <StepMedia
            data={{ images: formData.images }}
            onChange={updateFormData}
          />
        )}
        {currentStep === 5 && (
          <StepContact
            data={{
              fullName: formData.fullName,
              email: formData.email,
              phone: formData.phone,
              acceptTerms: formData.acceptTerms,
            }}
            onChange={updateFormData}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-8 pt-6 border-t">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          Voltar
        </Button>
        <Button onClick={handleNext} className="gradient-gold text-white">
          {currentStep === steps.length ? 'Enviar Anúncio' : 'Próximo'}
        </Button>
      </div>
    </Card>
  );
};

export default SellWizard;
