import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, X } from 'lucide-react';
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
import type { CapitalObjective } from '@/pages/Capital';

const formSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  companyName: z.string().min(2, 'Nome da empresa é obrigatório').max(100),
  email: z.string().email('Email inválido').max(255),
  phone: z.string().min(10, 'Telefone inválido').max(20),
  monthlyRevenue: z.string().min(1, 'Selecione o faturamento'),
  netProfit: z.string().min(1, 'Informe o lucro líquido'),
  objective: z.string().min(1, 'Selecione o objetivo'),
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

export function CapitalLeadModal({ isOpen, onClose, initialAmount, initialObjective }: CapitalLeadModalProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      companyName: '',
      email: '',
      phone: '',
      monthlyRevenue: '',
      netProfit: '',
      objective: initialObjective,
    },
  });

  const onSubmit = (data: FormData) => {
    // In production, this would send data to backend
    console.log('Lead captured:', { ...data, requestedAmount: initialAmount });
    setIsSubmitted(true);
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
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold mt-6"
                >
                  Receber contato de especialista
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
            </p>
            
            <Button onClick={handleClose} variant="outline">
              Voltar ao início
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
