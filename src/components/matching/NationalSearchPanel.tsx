import { useState } from 'react';
import { Search, Building2, MapPin, TrendingUp, Lock, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNationalSearch, NationalCompany } from '@/hooks/useNationalSearch';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const STATES = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

const CATEGORIES = [
  { value: 'food', label: 'Alimentação' },
  { value: 'health', label: 'Saúde' },
  { value: 'tech', label: 'Tecnologia' },
  { value: 'commerce', label: 'Comércio' },
  { value: 'industry', label: 'Indústria' },
  { value: 'education', label: 'Educação' },
  { value: 'logistics', label: 'Logística' },
  { value: 'services', label: 'Serviços' },
  { value: 'telecom', label: 'Telecom' },
];

function CompanyCard({ company }: { company: NationalCompany }) {
  const formattedCapital = company.capital_social
    ? company.capital_social >= 1_000_000
      ? `R$ ${(company.capital_social / 1_000_000).toFixed(1)}M`
      : `R$ ${(company.capital_social / 1_000).toFixed(0)}K`
    : null;

  const categoryLabel = CATEGORIES.find(c => c.value === company.category)?.label || company.category;

  return (
    <div className="p-4 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">
            {company.nome_fantasia || company.razao_social}
          </p>
          {company.nome_fantasia && (
            <p className="text-xs text-muted-foreground truncate">{company.razao_social}</p>
          )}
        </div>
        <Badge variant="outline" className="shrink-0 text-xs">
          {categoryLabel}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {company.location}
        </span>
        <span className="flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5" />
          {company.porte}
        </span>
        {formattedCapital && (
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {formattedCapital}
          </span>
        )}
      </div>

      <div className="mt-2 text-xs text-muted-foreground/70">
        CNAE: {company.cnae}
      </div>
    </div>
  );
}

export function NationalSearchPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { results, loading, error, isPaidPlanRequired, debouncedSearch } = useNationalSearch();

  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const [category, setCategory] = useState('');

  const handleSearch = () => {
    debouncedSearch({ query: query || undefined, state: state || undefined, category: category || undefined });
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    debouncedSearch({ query: val || undefined, state: state || undefined, category: category || undefined });
  };

  const handleFilterChange = (field: 'state' | 'category', val: string) => {
    const newState = field === 'state' ? val : state;
    const newCategory = field === 'category' ? val : category;
    if (field === 'state') setState(val);
    if (field === 'category') setCategory(val);
    debouncedSearch({
      query: query || undefined,
      state: newState || undefined,
      category: newCategory || undefined,
    });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Lock className="w-8 h-8 text-muted-foreground" />
        <p className="text-muted-foreground">Faça login para acessar a busca nacional</p>
        <Button onClick={() => navigate('/auth')}>Entrar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome da empresa..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        <Select value={state} onValueChange={(v) => handleFilterChange('state', v === 'all' ? '' : v)}>
          <SelectTrigger className="h-11 w-full sm:w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {STATES.map((uf) => (
              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={(v) => handleFilterChange('category', v === 'all' ? '' : v)}>
          <SelectTrigger className="h-11 w-full sm:w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleSearch} className="h-11 px-6" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
        </Button>
      </div>

      {/* Upgrade banner */}
      {isPaidPlanRequired && (
        <div className="flex items-center gap-4 p-4 rounded-lg border border-primary/30 bg-primary/5">
          <Lock className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-foreground">Recurso exclusivo para planos pagos</p>
            <p className="text-sm text-muted-foreground">Assine o plano Master para acessar a base de 5 milhões de empresas brasileiras.</p>
          </div>
          <Button size="sm" onClick={() => navigate('/valuation')}>
            Ver planos
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Consultando base nacional...</span>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{results.length} empresa(s) encontrada(s)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {results.map((company, i) => (
              <CompanyCard key={`${company.cnpj}-${i}`} company={company} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !isPaidPlanRequired && !error && results.length === 0 && (query || state || category) && (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Nenhuma empresa encontrada com os filtros selecionados.</p>
        </div>
      )}

      {/* Placeholder */}
      {!loading && !isPaidPlanRequired && !error && results.length === 0 && !query && !state && !category && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Base Nacional de Empresas</p>
          <p className="text-sm mt-1">+5 milhões de empresas ativas da Receita Federal</p>
          <p className="text-sm">Busque por nome, estado ou categoria para começar</p>
        </div>
      )}
    </div>
  );
}
