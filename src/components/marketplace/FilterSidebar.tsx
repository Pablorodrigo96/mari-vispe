import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { categories, states } from '@/data/mockData';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export interface FilterState {
  categories: string[];
  states: string[];
  priceRange: [number, number];
  revenueRange: [number, number];
}

export const defaultFilters: FilterState = {
  categories: [],
  states: [],
  priceRange: [0, 10000000],
  revenueRange: [0, 20000000],
};

interface FilterSidebarProps {
  className?: string;
  onClose?: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function FilterSidebar({ className, onClose, filters, onFiltersChange }: FilterSidebarProps) {
  const toggleCategory = (catId: string) => {
    const newCategories = filters.categories.includes(catId)
      ? filters.categories.filter((id) => id !== catId)
      : [...filters.categories, catId];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const toggleState = (state: string) => {
    const newStates = filters.states.includes(state)
      ? filters.states.filter((s) => s !== state)
      : [...filters.states, state];
    onFiltersChange({ ...filters, states: newStates });
  };

  const clearFilters = () => {
    onFiltersChange(defaultFilters);
  };

  const activeFiltersCount =
    filters.categories.length +
    filters.states.length +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000000 ? 1 : 0) +
    (filters.revenueRange[0] > 0 || filters.revenueRange[1] < 20000000 ? 1 : 0);

  return (
    <div className={cn("bg-card rounded-xl border border-border p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Filtros</h2>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      <Accordion type="multiple" defaultValue={['category', 'price', 'revenue', 'location']} className="space-y-2">
        {/* Category Filter */}
        <AccordionItem value="category" className="border-b-0">
          <AccordionTrigger className="py-3 hover:no-underline">
            <span className="text-sm font-medium">Setor de Atuação</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <Checkbox
                    id={cat.id}
                    checked={filters.categories.includes(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                  />
                  <Label
                    htmlFor={cat.id}
                    className="text-sm font-normal cursor-pointer flex items-center gap-2"
                  >
                    <span>{cat.icon}</span>
                    {cat.label}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Price Range Filter */}
        <AccordionItem value="price" className="border-b-0">
          <AccordionTrigger className="py-3 hover:no-underline">
            <span className="text-sm font-medium">Valor de Venda</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-4">
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => onFiltersChange({ ...filters, priceRange: value as [number, number] })}
                max={10000000}
                step={100000}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatCurrency(filters.priceRange[0])}</span>
                <span>{formatCurrency(filters.priceRange[1])}</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Revenue Range Filter */}
        <AccordionItem value="revenue" className="border-b-0">
          <AccordionTrigger className="py-3 hover:no-underline">
            <span className="text-sm font-medium">Faturamento Anual</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-4">
              <Slider
                value={filters.revenueRange}
                onValueChange={(value) => onFiltersChange({ ...filters, revenueRange: value as [number, number] })}
                max={20000000}
                step={500000}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatCurrency(filters.revenueRange[0])}</span>
                <span>{formatCurrency(filters.revenueRange[1])}</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Location Filter */}
        <AccordionItem value="location" className="border-b-0">
          <AccordionTrigger className="py-3 hover:no-underline">
            <span className="text-sm font-medium">Localização</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {states.map((state) => (
                <div key={state} className="flex items-center gap-2">
                  <Checkbox
                    id={state}
                    checked={filters.states.includes(state)}
                    onCheckedChange={() => toggleState(state)}
                  />
                  <Label
                    htmlFor={state}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {state}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Apply Button (Mobile) */}
      <Button className="w-full mt-6 lg:hidden bg-accent hover:bg-accent/90 text-accent-foreground">
        Aplicar Filtros
      </Button>
    </div>
  );
}
