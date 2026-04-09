import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Eye, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Form, FormControl, FormField, FormItem, FormMessage,
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
  objective: z.string().min(1, 'Selecione o objetivo'),
  capitalType: z.string().min(1, 'Selecione o tipo de captação'),
});

type FormData = z.infer<typeof formSchema>;

interface SimulatorData {
  sector: string;
  companyAge: string;
  approvalScore: number;
  monthlyRevenue: string;
}

interface CapitalLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount: number;
  initialObjective: CapitalObjective;
  simulatorData?: SimulatorData;
}

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

export function CapitalLeadModal({ isOpen, onClose, initialAmount, initialObjective, simulatorData }: CapitalLeadModalProps) {
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
      objective: initialObjective,
      capitalType: initialObjective === 'socio' ? 'equity' : '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      let userId = user?.id;

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

      const { error: insertError } = await supabase.from('capital_requests').insert({
        user_id: userId,
        full_name: data.fullName,
        company_name: data.companyName,
        email: data.email,
        phone: data.phone,
        requested_amount: initialAmount,
        capital_type: data.capitalType,
        objective: data.objective,
        monthly_revenue: simulatorData?.monthlyRevenue || null,
        net_profit: null,
        sector: simulatorData?.sector || null,
        company_age: simulatorData?.companyAge || null,
        approval_score: simulatorData?.approvalScore || null,
      } as any);

      if (insertError) {
        toast({ title: 'Erro ao salvar solicitação', description: insertError.message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
    } catch {
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
                Cadastrar Proposta
              </DialogTitle>
              <p className="text-muted-foreground">
                Valor solicitado:{' '}
                <span className="font-semibold text-accent">{formatFullCurrency(initialAmount)}</span>
                {simulatorData && (
                  <span className="ml-2 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                    Score: {simulatorData.approvalScore}%
                  </span>
                )}
              </p>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, () => {
                toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos marcados com *.', variant: 'destructive' });
              })} className="space-y-4 mt-4">
                {/* Capital Type */}
                <FormField control={form.control} name="capitalType" render={({ field }) => (
                  <FormItem>
                    <Label>Tipo de Captação *</Label>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Como deseja captar?" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {capitalTypeOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <Label>Nome Completo *</Label>
                    <FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="companyName" render={({ field }) => (
                  <FormItem>
                    <Label>Nome da Empresa *</Label>
                    <FormControl><Input placeholder="Nome da sua empresa" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <Label>Email *</Label>
                      <FormControl><Input type="email" placeholder="seu@empresa.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <Label>WhatsApp *</Label>
                      <FormControl><Input placeholder="(11) 99999-9999" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {!user && (
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Crie uma senha para acompanhar *
                      </Label>
                      <FormControl><Input type="password" placeholder="Mínimo 8 caracteres" {...field} /></FormControl>
                      <p className="text-xs text-muted-foreground">Uma conta será criada para acompanhar sua solicitação.</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="objective" render={({ field }) => (
                  <FormItem>
                    <Label>Objetivo do Capital *</Label>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o objetivo" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {objectiveOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold mt-6">
                  {isLoading ? 'Enviando...' : 'Cadastrar Proposta'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Seus dados estão protegidos. Não compartilhamos informações com terceiros.
                </p>
              </form>
            </Form>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 animate-fade-in">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Proposta cadastrada com sucesso!</h3>
            <p className="text-muted-foreground mb-8">
              Sua solicitação foi registrada. Acompanhe o status e propostas recebidas.
              {!user && ' Verifique seu email para confirmar a conta.'}
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => { handleClose(); navigate('/minhas-captacoes'); }} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Eye className="w-4 h-4 mr-2" /> Acompanhar Solicitação
              </Button>
              <Button onClick={handleClose} variant="outline">Voltar ao início</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
