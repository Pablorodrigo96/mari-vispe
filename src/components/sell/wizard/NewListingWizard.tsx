import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Store, CheckCircle, Camera, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import StepIndicator from '../StepIndicator';
import StepBasicFinancial from './StepBasicFinancial';
import StepDescriptionLocation from './StepDescriptionLocation';
import StepCommercialSpace from './StepCommercialSpace';
import StepImages from './StepImages';
import PlanSelectionModal from './PlanSelectionModal';
import FinancialDocUpload from './FinancialDocUpload';
import { usePartnerAccountant } from '@/hooks/usePartnerAccountant';
import { stepValidationSchemas, initialFormData } from './listingSchema';
import { getMariPrefill, clearMariPrefill, cnaeToCategory } from '@/lib/mariPrefill';

const steps = [
  { id: 1, title: 'Empresa', icon: <Building2 className="w-4 h-4" /> },
  { id: 2, title: 'Descrição', icon: <MapPin className="w-4 h-4" /> },
  { id: 3, title: 'Fotos', icon: <Camera className="w-4 h-4" /> },
  { id: 4, title: 'Ponto', icon: <Store className="w-4 h-4" /> },
  { id: 5, title: 'Finalizar', icon: <CheckCircle className="w-4 h-4" /> },
];

const parseCurrencyToNumber = (value: string): number => {
  const numbers = value.replace(/\D/g, '');
  return numbers ? parseInt(numbers) / 100 : 0;
};

const parseNumberString = (value: string): number => {
  const numbers = value.replace(/\D/g, '');
  return numbers ? parseInt(numbers) : 0;
};

interface FormData {
  title: string;
  category: string;
  foundationYear: string;
  cnpj: string;
  annualRevenue: string;
  annualProfit: string;
  askingPrice: string;
  hidePrice: boolean;
  description: string;
  additionalInfo: string;
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  showAddress: boolean;
  images: string[];
  squareMeters: string;
  rentValue: string;
  iptuValue: string;
  saleReason: string;
  videoUrl: string;
}

const NewListingWizard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPartnerAccountant } = usePartnerAccountant();
  const [currentStep, setCurrentStep] = useState(1);
  const initialPrefill = useMemo(() => getMariPrefill(), []);
  const [prefillActive, setPrefillActive] = useState<boolean>(!!initialPrefill);
  const [formData, setFormData] = useState<FormData>(() => {
    const base: FormData = { ...initialFormData, images: [] } as FormData;
    if (initialPrefill) {
      const cnpjFmt = initialPrefill.cnpj.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5',
      );
      return {
        ...base,
        cnpj: cnpjFmt,
        title: initialPrefill.razaoSocial ? `${initialPrefill.razaoSocial}` : base.title,
        category: cnaeToCategory(initialPrefill.cnaeSection) || base.category,
        state: initialPrefill.uf ?? base.state,
        city: initialPrefill.cidade ?? base.city,
      };
    }
    return base;
  });
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingFinancialFile, setPendingFinancialFile] = useState<File | null>(null);

  const handleClearPrefill = () => {
    clearMariPrefill();
    setPrefillActive(false);
    setFormData({ ...initialFormData, images: [] } as FormData);
    toast.info('Prefill limpo. Comece do zero.');
  };

  const updateFormData = (field: string, value: string | boolean | string[]) => {
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
            additionalInfo: formData.additionalInfo,
            cep: formData.cep,
            street: formData.street,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
            showAddress: formData.showAddress,
          });
          break;
        case 3:
          // Images are optional, no validation needed
          break;
        case 4:
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
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
        toast.success('Etapa salva com sucesso!');
      } else {
        // Step 4 completed, show plan modal
        setShowPlanModal(true);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generateTicker = async (category: string): Promise<string> => {
    const prefixMap: Record<string, string> = {
      tech: 'TECH', commerce: 'COME', industry: 'INDU', services: 'SERV',
      food: 'FOOD', health: 'HEAL', education: 'EDUC', logistics: 'LOGI',
      telecom: 'TELE', energy: 'ENER', construction: 'CONS', agro: 'AGRO',
    };
    const prefix = prefixMap[category] || category.substring(0, 4).toUpperCase();
    
    const { count } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .like('ticker', `${prefix}%`);
    
    let seq = (count || 0) + 1;
    let ticker = `${prefix}${seq.toString().padStart(2, '0')}`;
    
    // Check uniqueness
    const { data: existing } = await supabase
      .from('listings')
      .select('ticker')
      .eq('ticker', ticker)
      .maybeSingle();
    
    if (existing) {
      seq++;
      ticker = `${prefix}${seq.toString().padStart(2, '0')}`;
    }
    
    return ticker;
  };

  const handleSelectPlan = async (plan: 'basic' | 'master') => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    setIsSubmitting(true);

    try {
      const ticker = await generateTicker(formData.category);

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
          additional_info: (() => {
            const baseInfo = formData.additionalInfo || '';
            if (initialPrefill) {
              const tag = `Origem: Calculadora Mari${initialPrefill.windowBase != null ? ` (janela ${initialPrefill.windowBase}%)` : ''}`;
              return baseInfo ? `${tag}\n\n${baseInfo}` : tag;
            }
            return baseInfo || null;
          })(),
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
          images: formData.images,
          video_url: formData.videoUrl || null,
          plan: plan,
          status: plan === 'basic' ? 'active' : 'pending_payment',
          ticker: ticker,
        })
        .select()
        .single();

      if (error) throw error;

      // Upload pending financial doc if partner accountant
      if (pendingFinancialFile && data?.id) {
        try {
          const fileType = pendingFinancialFile.name.endsWith('.pdf') ? 'pdf' 
            : pendingFinancialFile.name.match(/\.xlsx?$/i) ? 'xlsx' : 'csv';
          const path = `${user.id}/${data.id}/${Date.now()}_${pendingFinancialFile.name}`;
          
          await supabase.storage.from('financial-docs').upload(path, pendingFinancialFile);
          
          const { data: { publicUrl } } = supabase.storage.from('financial-docs').getPublicUrl(path);

          // Trigger AI analysis
          supabase.functions.invoke('analyze-financial-doc', {
            body: {
              listing_id: data.id,
              file_url: publicUrl,
              file_name: pendingFinancialFile.name,
              file_type: fileType,
              user_id: user.id,
            },
          }).then(() => {
            console.log('Financial doc analysis triggered');
          }).catch((err) => {
            console.error('Financial doc analysis error:', err);
          });
        } catch (docErr) {
          console.error('Financial doc upload error:', docErr);
          // Don't block listing creation
        }
      }

      setShowPlanModal(false);
      toast.success('Anúncio criado com sucesso!');
      if (initialPrefill && data?.id) {
        await logMariListing(initialPrefill, data.id, user.id);
      }
      clearMariPrefill();

      // Navigate to Blind Teaser page
      navigate(`/teaser/${ticker}`);
    } catch (error) {
      console.error('Error creating listing:', error);
      toast.error('Erro ao criar anúncio. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {prefillActive && initialPrefill && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-accent shrink-0" />
            <p className="text-sm text-foreground break-words min-w-0">
              Continuando do cálculo da Mari
              {initialPrefill.razaoSocial ? ` · ${initialPrefill.razaoSocial}` : ''}
              {initialPrefill.windowBase ? ` · janela ${initialPrefill.windowBase}%` : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearPrefill}
            className="shrink-0 h-7 px-2 text-xs"
          >
            <X className="h-3.5 w-3.5 mr-1" /> Limpar
          </Button>
        </div>
      )}
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
                additionalInfo: formData.additionalInfo,
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
            <StepImages
              images={formData.images}
              onChange={(images) => updateFormData('images', images)}
              maxImages={5}
              videoUrl={formData.videoUrl}
              onVideoUrlChange={(url) => updateFormData('videoUrl', url)}
            />
          )}
          {currentStep === 4 && (
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

          {/* Financial Doc Upload - only for Partner Accountants */}
          {isPartnerAccountant && currentStep === 1 && (
            <div className="mt-6">
              <FinancialDocUpload
                pendingFile={pendingFinancialFile}
                onPendingFileChange={setPendingFinancialFile}
              />
            </div>
          )}

          {/* Aviso de Reserva 45 dias para parceiros */}
          {isPartnerAccountant && currentStep === 4 && (
            <div className="mt-6 p-4 rounded-lg border border-accent/30 bg-accent/10">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground">Reserva exclusiva de 45 dias</p>
                  <p className="text-muted-foreground mt-1">
                    Como contador parceiro, este lead será automaticamente reservado para você por 45 dias. Para garantir a comissão cheia (20%), suba documentos no Cofre Digital ou gere um valuation dentro deste período.
                  </p>
                </div>
              </div>
            </div>
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
            {currentStep === 4 ? 'Criar Anúncio' : 'Próximo'}
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