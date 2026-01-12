import { useState } from 'react';
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
import { categories, states, revenueRanges, priceRanges } from '@/data/mockData';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface FilterSidebarProps {
  className?: string;
  onClose?: () => void;
}

export function FilterSidebar({ className, onClose }: FilterSidebarProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 10000000]);
  const [revenueRange, setRevenueRange] = useState([0, 20000000]);

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId]
    );
  };

  const toggleState = (state: string) => {
    setSelectedStates((prev) =>
      prev.includes(state)
        ? prev.filter((s) => s !== state)
        : [...prev, state]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedStates([]);
    setPriceRange([0, 10000000]);
    setRevenueRange([0, 20000000]);
  };

  const activeFiltersCount =
    selectedCategories.length +
    selectedStates.length +
    (priceRange[0] > 0 || priceRange[1] < 10000000 ? 1 : 0) +
    (revenueRange[0] > 0 || revenueRange[1] < 20000000 ? 1 : 0);

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
                    checked={selectedCategories.includes(cat.id)}
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
                value={priceRange}
                onValueChange={setPriceRange}
                max={10000000}
                step={100000}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatCurrency(priceRange[0])}</span>
                <span>{formatCurrency(priceRange[1])}</span>
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
                value={revenueRange}
                onValueChange={setRevenueRange}
                max={20000000}
                step={500000}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatCurrency(revenueRange[0])}</span>
                <span>{formatCurrency(revenueRange[1])}</span>
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
                    checked={selectedStates.includes(state)}
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
