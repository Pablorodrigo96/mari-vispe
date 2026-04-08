import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, MapPin, CreditCard, Crown, Check, Loader2, ExternalLink, Globe } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Checkbox } from '@/components/ui/checkbox';

const CATEGORIES = [
  { value: 'food', label: 'Alimentos' },
  { value: 'health', label: 'Saúde' },
  { value: 'tech', label: 'Tecnologia' },
  { value: 'commerce', label: 'Comércio' },
  { value: 'industry', label: 'Indústria' },
  { value: 'education', label: 'Educação' },
  { value: 'logistics', label: 'Logística' },
  { value: 'services', label: 'Serviços' },
  { value: 'telecom', label: 'Telecom' },
];

const estados = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  phone: z.string().min(10, 'Telefone inválido').max(15).optional().or(z.literal('')),
  cpf_cnpj: z.string().max(18).optional().or(z.literal('')),
  cep: z.string().max(9).optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  neighborhood: z.string().max(100).optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface Subscription {
  plan: string;
  status: string;
}

const MyProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const { isFranchisee } = useUserRoles();
  const [regionStates, setRegionStates] = useState<string[]>([]);
  const [regionCategories, setRegionCategories] = useState<string[]>([]);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [isSavingRegion, setIsSavingRegion] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      cpf_cnpj: '',
      cep: '',
      state: '',
      city: '',
      neighborhood: '',
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        if (profile) {
          form.reset({
            full_name: profile.full_name || '',
            phone: profile.phone || '',
            cpf_cnpj: profile.cpf_cnpj || '',
            cep: profile.cep || '',
            state: profile.state || '',
            city: profile.city || '',
            neighborhood: profile.neighborhood || '',
          });
        }

        // Fetch subscription
        const { data: sub, error: subError } = await supabase
          .from('subscriptions')
          .select('plan, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (subError && subError.code !== 'PGRST116') {
          console.error('Subscription error:', subError);
        }

        setSubscription(sub);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Erro ao carregar dados do perfil');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, form]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: data.full_name,
          phone: data.phone || null,
          cpf_cnpj: data.cpf_cnpj || null,
          cep: data.cep || null,
          state: data.state || null,
          city: data.city || null,
          neighborhood: data.neighborhood || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  };

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').trim();
    }
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').trim();
  };

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d{0,3})/, '$1-$2').trim();
  };

  const currentPlan = subscription?.plan || 'free';
  const isBasicPlan = currentPlan === 'free' || currentPlan === 'basic';

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error opening customer portal:', err);
      toast.error('Erro ao abrir portal de assinatura');
    } finally {
      setIsLoadingPortal(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie suas informações pessoais e seu plano
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Dados Pessoais */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Dados Pessoais
                  </CardTitle>
                  <CardDescription>
                    Suas informações de identificação
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu nome" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="(11) 99999-9999"
                              {...field}
                              onChange={(e) => field.onChange(formatPhone(e.target.value))}
                              maxLength={15}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cpf_cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF ou CNPJ</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="000.000.000-00"
                              {...field}
                              onChange={(e) => field.onChange(formatCpfCnpj(e.target.value))}
                              maxLength={18}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <Input 
                        value={user?.email || ''} 
                        disabled 
                        className="bg-muted"
                      />
                    </FormItem>
                  </div>
                </CardContent>
              </Card>

              {/* Localização */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Localização
                  </CardTitle>
                  <CardDescription>
                    Seu endereço para contato
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="00000-000"
                              {...field}
                              onChange={(e) => field.onChange(formatCep(e.target.value))}
                              maxLength={9}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o estado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {estados.map((estado) => (
                                <SelectItem key={estado} value={estado}>
                                  {estado}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="Sua cidade" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="neighborhood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu bairro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Plano */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Seu Plano
                  </CardTitle>
                  <CardDescription>
                    Gerencie sua assinatura
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Plano Básico */}
                    <div className={`relative rounded-lg border-2 p-4 ${!isBasicPlan ? 'border-muted bg-muted/30' : 'border-primary bg-primary/5'}`}>
                      {isBasicPlan && (
                        <div className="absolute -top-3 left-4 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                          Plano Atual
                        </div>
                      )}
                      <h3 className="font-semibold text-lg mb-2">Básico</h3>
                      <p className="text-2xl font-bold mb-4">Grátis</p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          Até 3 anúncios ativos
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          Fotos básicas
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          Suporte por email
                        </li>
                      </ul>
                    </div>

                    {/* Plano Master */}
                    <div className={`relative rounded-lg border-2 p-4 ${isBasicPlan ? 'border-muted' : 'border-amber-500 bg-amber-500/5'}`}>
                      {!isBasicPlan && (
                        <div className="absolute -top-3 left-4 bg-amber-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Plano Atual
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="h-5 w-5 text-amber-500" />
                        <h3 className="font-semibold text-lg">Master</h3>
                      </div>
                      <p className="text-2xl font-bold mb-4">
                        R$ 99<span className="text-sm font-normal text-muted-foreground">/mês</span>
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-amber-500" />
                          Anúncios ilimitados
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-amber-500" />
                          Destaque na home
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-amber-500" />
                          Vídeos e fotos premium
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-amber-500" />
                          Estatísticas avançadas
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-amber-500" />
                          Suporte prioritário
                        </li>
                      </ul>
                      {isBasicPlan ? (
                        <Button 
                          type="button" 
                          className="w-full bg-amber-500 hover:bg-amber-600"
                          onClick={() => toast.info('Integração de pagamento em breve!')}
                        >
                          <Crown className="h-4 w-4 mr-2" />
                          Fazer Upgrade
                        </Button>
                      ) : (
                        <Button 
                          type="button" 
                          variant="outline"
                          className="w-full"
                          onClick={handleManageSubscription}
                          disabled={isLoadingPortal}
                        >
                          {isLoadingPortal ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Carregando...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Gerenciar Assinatura
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </form>
          </Form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyProfile;
