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
import { ScrollArea } from '@/components/ui/scroll-area';
import { categories } from '@/data/mockData';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export interface MapFilterState {
  categories: string[];
  states: string[];
  cities: string[];
  priceRange: [number, number];
}

export const defaultMapFilters: MapFilterState = {
  categories: [],
  states: [],
  cities: [],
  priceRange: [0, 10000000],
};

interface MapFilterSidebarProps {
  className?: string;
  onClose?: () => void;
  filters: MapFilterState;
  onFiltersChange: (filters: MapFilterState) => void;
  availableStates: string[];
  availableCities: string[];
}

export function MapFilterSidebar({
  className,
  onClose,
  filters,
  onFiltersChange,
  availableStates,
  availableCities,
}: MapFilterSidebarProps) {
  const toggleCategory = (catId: string) => {
    const next = filters.categories.includes(catId)
      ? filters.categories.filter((id) => id !== catId)
      : [...filters.categories, catId];
    onFiltersChange({ ...filters, categories: next });
  };

  const toggleState = (state: string) => {
    const next = filters.states.includes(state)
      ? filters.states.filter((s) => s !== state)
      : [...filters.states, state];
    // Clear cities that no longer belong to selected states
    const newFilters = { ...filters, states: next };
    if (next.length > 0) {
      newFilters.cities = filters.cities; // cities will be filtered by availableCities in parent
    }
    onFiltersChange(newFilters);
  };

  const toggleCity = (city: string) => {
    const next = filters.cities.includes(city)
      ? filters.cities.filter((c) => c !== city)
      : [...filters.cities, city];
    onFiltersChange({ ...filters, cities: next });
  };

  const clearFilters = () => onFiltersChange(defaultMapFilters);

  const activeFiltersCount =
    filters.categories.length +
    filters.states.length +
    filters.cities.length +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000000 ? 1 : 0);

  return (
    <div className={cn('bg-card border-r border-border flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Filtros</h2>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7 px-2">
              Limpar
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <Accordion type="multiple" defaultValue={['category', 'state', 'city', 'price']} className="space-y-1">
            {/* Category */}
            <AccordionItem value="category" className="border-b-0">
              <AccordionTrigger className="py-2.5 hover:no-underline">
                <span className="text-sm font-medium">Setor de Atuação</span>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-3">
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`map-cat-${cat.id}`}
                        checked={filters.categories.includes(cat.id)}
                        onCheckedChange={() => toggleCategory(cat.id)}
                      />
                      <Label htmlFor={`map-cat-${cat.id}`} className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
                        <span>{cat.icon}</span>
                        {cat.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* State */}
            <AccordionItem value="state" className="border-b-0">
              <AccordionTrigger className="py-2.5 hover:no-underline">
                <span className="text-sm font-medium">Estado</span>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-3">
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availableStates.map((state) => (
                    <div key={state} className="flex items-center gap-2">
                      <Checkbox
                        id={`map-state-${state}`}
                        checked={filters.states.includes(state)}
                        onCheckedChange={() => toggleState(state)}
                      />
                      <Label htmlFor={`map-state-${state}`} className="text-sm font-normal cursor-pointer">
                        {state}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* City */}
            {availableCities.length > 0 && (
              <AccordionItem value="city" className="border-b-0">
                <AccordionTrigger className="py-2.5 hover:no-underline">
                  <span className="text-sm font-medium">Cidade</span>
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-3">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {availableCities.map((city) => (
                      <div key={city} className="flex items-center gap-2">
                        <Checkbox
                          id={`map-city-${city}`}
                          checked={filters.cities.includes(city)}
                          onCheckedChange={() => toggleCity(city)}
                        />
                        <Label htmlFor={`map-city-${city}`} className="text-sm font-normal cursor-pointer">
                          {city}
                        </Label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Price */}
            <AccordionItem value="price" className="border-b-0">
              <AccordionTrigger className="py-2.5 hover:no-underline">
                <span className="text-sm font-medium">Faixa de Preço</span>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-3">
                <div className="space-y-4">
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(v) => onFiltersChange({ ...filters, priceRange: v as [number, number] })}
                    max={10000000}
                    step={100000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(filters.priceRange[0])}</span>
                    <span>{filters.priceRange[1] >= 10000000 ? 'R$ 10 mi+' : formatCurrency(filters.priceRange[1])}</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );
}
