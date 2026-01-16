import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Store, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import StepIndicator from '../StepIndicator';
import StepBasicFinancial from './StepBasicFinancial';
import StepDescriptionLocation from './StepDescriptionLocation';
import StepCommercialSpace from './StepCommercialSpace';
import PlanSelectionModal from './PlanSelectionModal';
import { stepValidationSchemas, initialFormData } from './listingSchema';

const steps = [
  { id: 1, title: 'Empresa', icon: <Building2 className="w-4 h-4" /> },
  { id: 2, title: 'Descrição', icon: <MapPin className="w-4 h-4" /> },
  { id: 3, title: 'Ponto', icon: <Store className="w-4 h-4" /> },
  { id: 4, title: 'Finalizar', icon: <CheckCircle className="w-4 h-4" /> },
];

const parseCurrencyToNumber = (value: string): number => {
  const numbers = value.replace(/\D/g, '');
  return numbers ? parseInt(numbers) / 100 : 0;
};

const parseNumberString = (value: string): number => {
  const numbers = value.replace(/\D/g, '');
  return numbers ? parseInt(numbers) : 0;
};

const NewListingWizard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    try {
      switch (step) {
        case 1:
          stepValidationSchemas.step1.parse({
            title: formData.title,
            category: formData.category,
            foundationYear: formData.foundationYear,
            cnpj: formData.cnpj,
            annualRevenue: formData.annualRevenue,
            annualProfit: formData.annualProfit,
            askingPrice: formData.askingPrice,
            hidePrice: formData.hidePrice,
          });
          break;
        case 2:
          stepValidationSchemas.step2.parse({
            description: formData.description,
            cep: formData.cep,
            street: formData.street,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
            showAddress: formData.showAddress,
          });
          break;
        case 3:
          stepValidationSchemas.step3.parse({
            squareMeters: formData.squareMeters,
            rentValue: formData.rentValue,
            iptuValue: formData.iptuValue,
            saleReason: formData.saleReason,
          });
          break;
      }
      return true;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errors' in error) {
        const zodError = error as { errors: Array<{ message: string }> };
        toast.error(zodError.errors[0].message);
      }
      return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
        toast.success('Etapa salva com sucesso!');
      } else {
        // Step 3 completed, show plan modal
        setShowPlanModal(true);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSelectPlan = async (plan: 'basic' | 'master') => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('listings')
        .insert({
          user_id: user.id,
          title: formData.title,
          category: formData.category,
          foundation_year: formData.foundationYear ? parseInt(formData.foundationYear) : null,
          cnpj: formData.cnpj || null,
          annual_revenue: parseCurrencyToNumber(formData.annualRevenue),
          annual_profit: parseCurrencyToNumber(formData.annualProfit),
          asking_price: parseCurrencyToNumber(formData.askingPrice),
          hide_price: formData.hidePrice,
          description: formData.description,
          cep: formData.cep,
          street: formData.street || null,
          neighborhood: formData.neighborhood || null,
          city: formData.city,
          state: formData.state,
          show_address: formData.showAddress,
          square_meters: parseNumberString(formData.squareMeters) || null,
          rent_value: parseCurrencyToNumber(formData.rentValue) || null,
          iptu_value: parseCurrencyToNumber(formData.iptuValue) || null,
          sale_reason: formData.saleReason,
          plan: plan,
          status: plan === 'basic' ? 'active' : 'pending_payment',
        })
        .select()
        .single();

      if (error) throw error;

      setShowPlanModal(false);
      toast.success('Anúncio criado com sucesso!');
      
      // Navigate to listing detail page
      navigate(`/anuncio/${data.id}`);
    } catch (error) {
      console.error('Error creating listing:', error);
      toast.error('Erro ao criar anúncio. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="p-6 sm:p-8">
        <StepIndicator steps={steps} currentStep={currentStep} />

        <div className="min-h-[500px]">
          {currentStep === 1 && (
            <StepBasicFinancial
              data={{
                title: formData.title,
                category: formData.category,
                foundationYear: formData.foundationYear,
                cnpj: formData.cnpj,
                annualRevenue: formData.annualRevenue,
                annualProfit: formData.annualProfit,
                askingPrice: formData.askingPrice,
                hidePrice: formData.hidePrice,
              }}
              onChange={updateFormData}
            />
          )}
          {currentStep === 2 && (
            <StepDescriptionLocation
              data={{
                description: formData.description,
                cep: formData.cep,
                street: formData.street,
                neighborhood: formData.neighborhood,
                city: formData.city,
                state: formData.state,
                showAddress: formData.showAddress,
              }}
              onChange={updateFormData}
            />
          )}
          {currentStep === 3 && (
            <StepCommercialSpace
              data={{
                squareMeters: formData.squareMeters,
                rentValue: formData.rentValue,
                iptuValue: formData.iptuValue,
                saleReason: formData.saleReason,
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
          <Button onClick={handleNext} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {currentStep === 3 ? 'Criar Anúncio' : 'Próximo'}
          </Button>
        </div>
      </Card>

      <PlanSelectionModal
        open={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onSelectPlan={handleSelectPlan}
        isSubmitting={isSubmitting}
      />
    </>
  );
};

export default NewListingWizard;