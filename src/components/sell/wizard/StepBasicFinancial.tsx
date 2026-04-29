import { useMemo, useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categories } from '@/data/mockData';
import { Building2, DollarSign, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react';
import { useNationalSearch } from '@/hooks/useNationalSearch';

interface StepBasicFinancialProps {
  data: {
    title: string;
    category: string;
    foundationYear: string;
    cnpj: string;
    annualRevenue: string;
    annualProfit: string;
    askingPrice: string;
    hidePrice: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
}

const formatCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, '').slice(0, 14);
  return numbers.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  ).replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})$/,
    '$1.$2.$3/$4-$5'
  ).replace(
    /^(\d{2})(\d{3})(\d{3})(\d{0,4})$/,
    '$1.$2.$3/$4'
  ).replace(
    /^(\d{2})(\d{3})(\d{0,3})$/,
    '$1.$2.$3'
  ).replace(
    /^(\d{2})(\d{0,3})$/,
    '$1.$2'
  );
};

const formatCurrency = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  const amount = parseInt(numbers) / 100;
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const parseCurrency = (value: string): number => {
  const numbers = value.replace(/\D/g, '');
  return numbers ? parseInt(numbers) / 100 : 0;
};

interface RfData {
  razao_social?: string;
  nome_fantasia?: string;
  endereco_completo?: string;
  natureza_juridica_descricao?: string;
  porte?: string;
  idade_anos?: number | null;
  cnae_principal_descricao?: string;
  situacao?: string;
  socios?: Array<{ nome: string; qualificacao: string; data_entrada: string }>;
  regime_tributario?: { simples: boolean; mei: boolean; data_opcao_simples?: string; data_opcao_mei?: string };
}

const StepBasicFinancial = ({ data, onChange }: StepBasicFinancialProps) => {
  const { lookupCnpj } = useNationalSearch();
  const [cnpjLookupStatus, setCnpjLookupStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');
  const [rfData, setRfData] = useState<RfData | null>(null);
  const lookupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const margin = useMemo(() => {
    const revenue = parseCurrency(data.annualRevenue);
    const profit = parseCurrency(data.annualProfit);
    if (revenue > 0 && profit > 0) {
      return (profit / revenue) * 100;
    }
    return null;
  }, [data.annualRevenue, data.annualProfit]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value);
    onChange('cnpj', formatted);

    const clean = formatted.replace(/\D/g, '');
    if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);

    if (clean.length === 14) {
      setCnpjLookupStatus('loading');
      lookupTimeoutRef.current = setTimeout(async () => {
        const company = await lookupCnpj(clean);
        if (company) {
          setCnpjLookupStatus('found');
          setRfData({
            razao_social: company.razao_social,
            nome_fantasia: company.nome_fantasia,
            endereco_completo: company.endereco_completo,
            natureza_juridica_descricao: company.natureza_juridica_descricao,
            porte: company.porte,
            idade_anos: company.idade_anos,
            cnae_principal_descricao: company.cnae_principal_descricao,
            situacao: company.situacao,
          });

          const name = company.nome_fantasia || company.razao_social;
          if (name && !data.title) onChange('title', name);
          if (company.category) onChange('category', company.category);
          if (company.foundation_year && !data.foundationYear) {
            onChange('foundationYear', String(company.foundation_year));
          }
          // Address auto-fill (only if currently empty)
          if (company.cep) onChange('cep' as any, company.cep);
          if (company.street) onChange('street' as any, company.street);
          if (company.neighborhood) onChange('neighborhood' as any, company.neighborhood);
          if (company.city) onChange('city' as any, company.city);
          if (company.state) onChange('state' as any, company.state);
        } else {
          setCnpjLookupStatus('not_found');
          setRfData(null);
        }
      }, 600);
    } else {
      setCnpjLookupStatus('idle');
      setRfData(null);
    }
  };

  useEffect(() => {
    return () => { if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current); };
  }, []);



  const handleCurrencyChange = (field: string, value: string) => {
    onChange(field, formatCurrency(value));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          Informações da Empresa
        </h2>
        <p className="text-muted-foreground mt-2">
          Dados básicos e financeiros do seu negócio
        </p>
      </div>

      {/* Basic Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Building2 className="w-5 h-5 text-accent" />
          <span>Dados Básicos</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Título do Anúncio *</Label>
            <Input
              id="title"
              placeholder="Ex: Restaurante Italiano em Pinheiros"
              value={data.title}
              onChange={(e) => onChange('title', e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria Principal *</Label>
            <Select
              value={data.category}
              onValueChange={(value) => onChange('category', value)}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <img src={cat.image} alt={cat.label} className="w-5 h-5 rounded object-cover" />
                      <span>{cat.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="foundationYear">Ano de Fundação</Label>
            <Select
              value={data.foundationYear}
              onValueChange={(value) => onChange('foundationYear', value)}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <div className="relative">
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={data.cnpj}
                onChange={(e) => handleCNPJChange(e.target.value)}
                className="h-12 pr-10"
                maxLength={18}
              />
              {cnpjLookupStatus === 'loading' && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {cnpjLookupStatus === 'found' && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
              )}
            </div>
            {cnpjLookupStatus === 'found' && rfData && (
              <div className="mt-2 rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                  <Badge variant="outline" className="bg-accent/10 text-accent border-accent/40 text-xs">
                    Dados da Receita Federal
                  </Badge>
                  {rfData.situacao && (
                    <Badge
                      variant="outline"
                      className={
                        rfData.situacao === 'Ativa'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs'
                          : 'bg-orange-500/10 text-orange-600 border-orange-500/30 text-xs'
                      }
                    >
                      {rfData.situacao}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-foreground space-y-1 break-words">
                  {rfData.razao_social && (
                    <div><span className="text-muted-foreground">Razão social:</span> <span className="font-medium">{rfData.razao_social}</span></div>
                  )}
                  {rfData.nome_fantasia && rfData.nome_fantasia !== rfData.razao_social && (
                    <div><span className="text-muted-foreground">Nome fantasia:</span> <span className="font-medium">{rfData.nome_fantasia}</span></div>
                  )}
                  {rfData.natureza_juridica_descricao && (
                    <div><span className="text-muted-foreground">Natureza:</span> <span className="font-medium">{rfData.natureza_juridica_descricao}</span></div>
                  )}
                  {rfData.porte && (
                    <div><span className="text-muted-foreground">Porte:</span> <span className="font-medium">{rfData.porte}</span></div>
                  )}
                  {rfData.idade_anos != null && (
                    <div><span className="text-muted-foreground">Idade:</span> <span className="font-medium">{rfData.idade_anos} anos</span></div>
                  )}
                  {rfData.cnae_principal_descricao && (
                    <div><span className="text-muted-foreground">CNAE:</span> <span className="font-medium">{rfData.cnae_principal_descricao}</span></div>
                  )}
                  {rfData.endereco_completo && (
                    <div><span className="text-muted-foreground">Endereço:</span> <span className="font-medium">{rfData.endereco_completo}</span></div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground pt-1 border-t border-accent/20">
                  Campos preenchidos automaticamente. Você pode editar se preferir.
                </p>
              </div>
            )}
            {cnpjLookupStatus === 'not_found' && (
              <p className="text-xs text-muted-foreground">
                CNPJ não encontrado na base. Continue preenchendo manualmente.
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Financial Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <DollarSign className="w-5 h-5 text-accent" />
          <span>Dados Financeiros</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="annualRevenue">Faturamento Bruto Anual *</Label>
            <Input
              id="annualRevenue"
              placeholder="R$ 0,00"
              value={data.annualRevenue}
              onChange={(e) => handleCurrencyChange('annualRevenue', e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="annualProfit">Lucro Líquido Anual *</Label>
            <Input
              id="annualProfit"
              placeholder="R$ 0,00"
              value={data.annualProfit}
              onChange={(e) => handleCurrencyChange('annualProfit', e.target.value)}
              className="h-12"
            />
          </div>

          {/* Margin Badge */}
          {margin !== null && (
            <div className="md:col-span-2 flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Margem Líquida:</span>
              <Badge
                variant="outline"
                className={
                  margin >= 20
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    : 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                }
              >
                {margin.toFixed(1)}%
              </Badge>
              <span className="text-xs text-muted-foreground">
                {margin >= 20 ? '✓ Margem saudável' : '⚠ Margem abaixo de 20%'}
              </span>
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="askingPrice">Valor da Empresa (Asking Price) *</Label>
            <div className="flex gap-3">
              <Input
                id="askingPrice"
                placeholder="R$ 0,00"
                value={data.askingPrice}
                onChange={(e) => handleCurrencyChange('askingPrice', e.target.value)}
                className="h-12 flex-1"
              />
              <div className="flex items-center gap-2 px-4 bg-muted rounded-lg">
                <Switch
                  id="hidePrice"
                  checked={data.hidePrice}
                  onCheckedChange={(checked) => onChange('hidePrice', checked)}
                />
                <Label
                  htmlFor="hidePrice"
                  className="text-sm cursor-pointer flex items-center gap-1"
                >
                  {data.hidePrice ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span className="hidden sm:inline">Ocultar</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Exibir</span>
                    </>
                  )}
                </Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {data.hidePrice
                ? 'O valor será exibido como "Sob Consulta"'
                : 'O valor será exibido publicamente no anúncio'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepBasicFinancial;