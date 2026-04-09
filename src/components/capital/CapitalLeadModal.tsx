import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Eye, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { formatFullCurrency } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { CapitalObjective } from '@/pages/Capital';

const formSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  companyName: z.string().min(2, 'Nome da empresa é obrigatório').max(100),
  email: z.string().email('Email inválido').max(255),
  phone: z.string().min(10, 'Telefone inválido').max(20),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(72).optional(),
  monthlyRevenue: z.string().min(1, 'Selecione o faturamento'),
  netProfit: z.string().min(1, 'Informe o lucro líquido'),
  objective: z.string().min(1, 'Selecione o objetivo'),
  capitalType: z.string().min(1, 'Selecione o tipo de captação'),
});

type FormData = z.infer<typeof formSchema>;

interface CapitalLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount: number;
  initialObjective: CapitalObjective;
}

const revenueOptions = [
  { value: 'ate-50k', label: 'Até R$ 50 mil' },
  { value: '50k-200k', label: 'R$ 50 mil - R$ 200 mil' },
  { value: '200k-1m', label: 'R$ 200 mil - R$ 1 milhão' },
  { value: 'acima-1m', label: 'Acima de R$ 1 milhão' },
];

const objectiveOptions = [
  { value: 'giro', label: 'Capital de Giro' },
  { value: 'expansao', label: 'Expansão' },
  { value: 'refinanciamento', label: 'Refinanciamento' },
  { value: 'socio', label: 'Busca de Sócio' },
];

const capitalTypeOptions = [
  { value: 'divida', label: 'Dívida (Crédito / Financiamento)' },
  { value: 'equity', label: 'Equity (Venda de Participação)' },
];

export function CapitalLeadModal({ isOpen, onClose, initialAmount, initialObjective }: CapitalLeadModalProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      companyName: '',
      email: '',
      phone: '',
      password: '',
      monthlyRevenue: '',
      netProfit: '',
      objective: initialObjective,
      capitalType: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      let userId = user?.id;

      // If not logged in, create account
      if (!userId) {
        if (!data.password || data.password.length < 8) {
          toast({ title: 'Erro', description: 'Crie uma senha para acompanhar sua solicitação.', variant: 'destructive' });
          setIsLoading(false);
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: { full_name: data.fullName },
            emailRedirectTo: window.location.origin,
          },
        });

        if (signUpError) {
          toast({ title: 'Erro ao criar conta', description: signUpError.message, variant: 'destructive' });
          setIsLoading(false);
          return;
        }

        userId = signUpData.user?.id;
        if (!userId) {
          toast({ title: 'Erro', description: 'Não foi possível criar a conta.', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
      }

      // Insert capital request
      const { error: insertError } = await supabase.from('capital_requests').insert({
        user_id: userId,
        full_name: data.fullName,
        company_name: data.companyName,
        email: data.email,
        phone: data.phone,
        requested_amount: initialAmount,
        capital_type: data.capitalType,
        objective: data.objective,
        monthly_revenue: data.monthlyRevenue,
        net_profit: data.netProfit,
      });

      if (insertError) {
        toast({ title: 'Erro ao salvar solicitação', description: insertError.message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
    } catch (err) {
      toast({ title: 'Erro inesperado', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsSubmitted(false);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {!isSubmitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Solicitar Proposta
              </DialogTitle>
              <p className="text-muted-foreground">
                Valor solicitado:{' '}
                <span className="font-semibold text-accent">
                  {formatFullCurrency(initialAmount)}
                </span>
              </p>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                {/* Capital Type */}
                <FormField
                  control={form.control}
                  name="capitalType"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Tipo de Captação *</Label>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Como deseja captar?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {capitalTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="fullName">Nome Completo *</Label>
                      <FormControl>
                        <Input id="fullName" placeholder="Seu nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="companyName">Nome da Empresa *</Label>
                      <FormControl>
                        <Input id="companyName" placeholder="Nome da sua empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="email">Email Corporativo *</Label>
                        <FormControl>
                          <Input id="email" type="email" placeholder="seu@empresa.com" {...field} />
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
                        <Label htmlFor="phone">WhatsApp *</Label>
                        <FormControl>
                          <Input id="phone" placeholder="(11) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Password field - only for non-logged users */}
                {!user && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="password" className="flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Crie uma senha para acompanhar *
                        </Label>
                        <FormControl>
                          <Input id="password" type="password" placeholder="Mínimo 8 caracteres" {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Uma conta será criada para você acompanhar sua solicitação.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="monthlyRevenue"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Faturamento Mensal Médio *</Label>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a faixa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {revenueOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                  name="netProfit"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="netProfit">Lucro Líquido Estimado (mensal) *</Label>
                      <FormControl>
                        <Input 
                          id="netProfit" 
                          placeholder="R$ 0,00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="objective"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Objetivo do Capital *</Label>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o objetivo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {objectiveOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold mt-6"
                >
                  {isLoading ? 'Enviando...' : 'Receber contato de especialista'}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  Seus dados estão protegidos. Não compartilhamos informações com terceiros.
                </p>
              </form>
            </Form>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6 animate-fade-in">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            
            <h3 className="text-2xl font-bold text-foreground mb-2">
              Recebemos seus dados!
            </h3>
            
            <p className="text-muted-foreground mb-8">
              Um especialista entrará em contato para agendar uma reunião.
              {!user && ' Verifique seu email para confirmar a conta.'}
            </p>
            
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => { handleClose(); navigate('/minhas-captacoes'); }}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Eye className="w-4 h-4 mr-2" />
                Acompanhar Solicitação
              </Button>
              <Button onClick={handleClose} variant="outline">
                Voltar ao início
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
