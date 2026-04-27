import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Building2, MapPin, Camera, Store, Loader2, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import StepBasicFinancial from '@/components/sell/wizard/StepBasicFinancial';
import StepDescriptionLocation from '@/components/sell/wizard/StepDescriptionLocation';
import StepImages from '@/components/sell/wizard/StepImages';
import StepCommercialSpace from '@/components/sell/wizard/StepCommercialSpace';

const formatCurrencyValue = (value: number | null): string => {
  if (!value) return '';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatNumberValue = (value: number | null): string => {
  if (!value) return '';
  return value.toLocaleString('pt-BR');
};

const parseCurrencyToNumber = (value: string): number => {
  const numbers = value.replace(/\D/g, '');
  return numbers ? parseInt(numbers) / 100 : 0;
};

const parseNumberString = (value: string): number => {
  const numbers = value.replace(/\D/g, '');
  return numbers ? parseInt(numbers) : 0;
};

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    foundationYear: '',
    cnpj: '',
    annualRevenue: '',
    annualProfit: '',
    askingPrice: '',
    hidePrice: false,
    description: '',
    additionalInfo: '',
    cep: '',
    street: '',
    neighborhood: '',
    city: '',
    state: '',
    showAddress: false,
    images: [] as string[],
    squareMeters: '',
    rentValue: '',
    iptuValue: '',
    saleReason: '',
    videoUrl: '',
    plan: 'basic',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/meus-anuncios');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchListing();
    }
  }, [user, id]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id!)
        .single();

      if (error) throw error;

      if (data.user_id !== user?.id) {
        toast.error('Você não tem permissão para editar este anúncio');
        navigate('/meus-anuncios');
        return;
      }

      setFormData({
        title: data.title || '',
        category: data.category || '',
        foundationYear: data.foundation_year?.toString() || '',
        cnpj: data.cnpj || '',
        annualRevenue: formatCurrencyValue(data.annual_revenue ? Number(data.annual_revenue) : null),
        annualProfit: formatCurrencyValue(data.annual_profit ? Number(data.annual_profit) : null),
        askingPrice: formatCurrencyValue(data.asking_price ? Number(data.asking_price) : null),
        hidePrice: data.hide_price || false,
        description: data.description || '',
        additionalInfo: (data as any).additional_info || '',
        cep: data.cep || '',
        street: data.street || '',
        neighborhood: data.neighborhood || '',
        city: data.city || '',
        state: data.state || '',
        showAddress: data.show_address || false,
        images: data.images || [],
        squareMeters: formatNumberValue(data.square_meters ? Number(data.square_meters) : null),
        rentValue: formatCurrencyValue(data.rent_value ? Number(data.rent_value) : null),
        iptuValue: formatCurrencyValue(data.iptu_value ? Number(data.iptu_value) : null),
        saleReason: data.sale_reason || '',
        videoUrl: (data as any).video_url || '',
        plan: data.plan || 'basic',
      });
    } catch (error) {
      console.error('Error fetching listing:', error);
      toast.error('Erro ao carregar anúncio');
      navigate('/meus-anuncios');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.title || !formData.category) {
      toast.error('Título e categoria são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('listings')
        .update({
          title: formData.title,
          category: formData.category,
          foundation_year: formData.foundationYear ? parseInt(formData.foundationYear) : null,
          cnpj: formData.cnpj || null,
          annual_revenue: parseCurrencyToNumber(formData.annualRevenue),
          annual_profit: parseCurrencyToNumber(formData.annualProfit),
          asking_price: parseCurrencyToNumber(formData.askingPrice),
          hide_price: formData.hidePrice,
          description: formData.description,
          additional_info: formData.additionalInfo || null,
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
        } as any)
        .eq('id', id!);

      if (error) throw error;

      toast.success('Anúncio atualizado com sucesso!');
      navigate('/meus-anuncios');
    } catch (error) {
      console.error('Error updating listing:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate('/meus-anuncios')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Editar Anúncio</h1>
              <p className="text-muted-foreground mt-1">Altere os dados e imagens do seu anúncio</p>
            </div>
          </div>

          <Card className="p-4 sm:p-6">
            <Accordion type="multiple" defaultValue={['empresa', 'descricao', 'fotos', 'ponto']} className="space-y-4">
              <AccordionItem value="empresa" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <Building2 className="w-5 h-5 text-accent" />
                    Empresa e Financeiro
                  </div>
                </AccordionTrigger>
                <AccordionContent>
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
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="descricao" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <MapPin className="w-5 h-5 text-accent" />
                    Descrição e Localização
                  </div>
                </AccordionTrigger>
                <AccordionContent>
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
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="fotos" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <Camera className="w-5 h-5 text-accent" />
                    Fotos ({formData.images.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <StepImages
                    images={formData.images}
                    onChange={(images) => updateFormData('images', images)}
                    maxImages={formData.plan === 'master' ? 20 : 5}
                    videoUrl={formData.videoUrl}
                    onVideoUrlChange={(url) => updateFormData('videoUrl', url)}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ponto" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <Store className="w-5 h-5 text-accent" />
                    Ponto Comercial
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <StepCommercialSpace
                    data={{
                      squareMeters: formData.squareMeters,
                      rentValue: formData.rentValue,
                      iptuValue: formData.iptuValue,
                      saleReason: formData.saleReason,
                    }}
                    onChange={updateFormData}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
              <Button variant="outline" onClick={() => navigate('/meus-anuncios')}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
