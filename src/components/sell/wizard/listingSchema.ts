import { z } from 'zod';

const parseCurrencyToNumber = (value: string): number => {
  const numbers = value.replace(/\D/g, '');
  return numbers ? parseInt(numbers) / 100 : 0;
};

export const listingFormSchema = z.object({
  // Step 1 - Basic & Financial
  title: z.string().min(10, 'Título deve ter pelo menos 10 caracteres'),
  category: z.string().min(1, 'Selecione uma categoria'),
  foundationYear: z.string().optional(),
  cnpj: z.string().optional(),
  annualRevenue: z.string().min(1, 'Informe o faturamento anual'),
  annualProfit: z.string().min(1, 'Informe o lucro anual'),
  askingPrice: z.string().min(1, 'Informe o valor da empresa'),
  hidePrice: z.boolean().default(false),
  
  // Step 2 - Description & Location
  description: z.string().min(100, 'Descrição deve ter pelo menos 100 caracteres'),
  additionalInfo: z.string().optional(),
  cep: z.string().min(9, 'CEP inválido'),
  street: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().min(1, 'Informe a cidade'),
  state: z.string().min(2, 'Informe o estado'),
  showAddress: z.boolean().default(false),
  
  // Step 3 - Commercial Space
  squareMeters: z.string().optional(),
  rentValue: z.string().optional(),
  iptuValue: z.string().optional(),
  saleReason: z.string().min(1, 'Selecione o motivo da venda'),
}).refine((data) => {
  const revenue = parseCurrencyToNumber(data.annualRevenue);
  const profit = parseCurrencyToNumber(data.annualProfit);
  return profit <= revenue;
}, {
  message: 'Lucro não pode ser maior que o faturamento',
  path: ['annualProfit'],
});

export type ListingFormData = z.infer<typeof listingFormSchema>;

export const stepValidationSchemas = {
  step1: z.object({
    title: z.string().min(10, 'Título deve ter pelo menos 10 caracteres'),
    category: z.string().min(1, 'Selecione uma categoria'),
    foundationYear: z.string().optional(),
    cnpj: z.string().optional(),
    annualRevenue: z.string().min(1, 'Informe o faturamento anual'),
    annualProfit: z.string().min(1, 'Informe o lucro anual'),
    askingPrice: z.string().min(1, 'Informe o valor da empresa'),
    hidePrice: z.boolean().default(false),
  }).refine((data) => {
    const revenue = parseCurrencyToNumber(data.annualRevenue);
    const profit = parseCurrencyToNumber(data.annualProfit);
    return profit <= revenue;
  }, {
    message: 'Lucro não pode ser maior que o faturamento',
    path: ['annualProfit'],
  }),
  
  step2: z.object({
    description: z.string().min(100, 'Descrição deve ter pelo menos 100 caracteres'),
    additionalInfo: z.string().optional(),
    cep: z.string().min(9, 'CEP inválido'),
    street: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().min(1, 'Informe a cidade'),
    state: z.string().min(2, 'Informe o estado'),
    showAddress: z.boolean().default(false),
  }),
  
  step3: z.object({
    squareMeters: z.string().optional(),
    rentValue: z.string().optional(),
    iptuValue: z.string().optional(),
    saleReason: z.string().min(1, 'Selecione o motivo da venda'),
  }),
};

export const initialFormData = {
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
  squareMeters: '',
  rentValue: '',
  iptuValue: '',
  saleReason: '',
  videoUrl: '',
};