import { Filter, X, MapPin, DollarSign, Building2, Globe } from 'lucide-react';
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

export const DEFAULT_MAX_PRICE = 50000000;

export const defaultMapFilters: MapFilterState = {
  categories: [],
  states: [],
  cities: [],
  priceRange: [0, DEFAULT_MAX_PRICE],
};

interface MapFilterSidebarProps {
  className?: string;
  onClose?: () => void;
  filters: MapFilterState;
  onFiltersChange: (filters: MapFilterState) => void;
  availableStates: string[];
  availableCities: string[];
  isMobile?: boolean;
  maxPrice?: number;
}

export function MapFilterSidebar({
  className,
  onClose,
  filters,
  onFiltersChange,
  availableStates,
  availableCities,
  isMobile = false,
  maxPrice = DEFAULT_MAX_PRICE,
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
    const newFilters = { ...filters, states: next };
    if (next.length > 0) {
      newFilters.cities = filters.cities;
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
    (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice ? 1 : 0);

  return (
    <div className={cn('bg-card border-r border-border flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Filtros</h2>
          {activeFiltersCount > 0 && (
            <Badge className="ml-1 bg-primary text-primary-foreground text-xs px-2">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeFiltersCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs h-8 px-3">
              Limpar
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-2">
          <Accordion type="multiple" defaultValue={['category', 'state', 'city', 'price']} className="space-y-0">
            {/* Category */}
            <AccordionItem value="category" className="border-b-0">
              <AccordionTrigger className="py-2 hover:no-underline">
                <span className="text-xs font-medium flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Setor de Atuação
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2">
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={`map-cat-${cat.id}`}
                        checked={filters.categories.includes(cat.id)}
                        onCheckedChange={() => toggleCategory(cat.id)}
                      />
                      <Label htmlFor={`map-cat-${cat.id}`} className="text-xs font-normal cursor-pointer flex items-center gap-2 flex-1">
                        <img src={cat.image} alt={cat.label} className="w-4 h-4 rounded object-cover" />
                        {cat.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* State */}
            <AccordionItem value="state" className="border-b-0">
              <AccordionTrigger className="py-2 hover:no-underline">
                <span className="text-xs font-medium flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Estado
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2">
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {availableStates.map((state) => (
                    <div key={state} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={`map-state-${state}`}
                        checked={filters.states.includes(state)}
                        onCheckedChange={() => toggleState(state)}
                      />
                      <Label htmlFor={`map-state-${state}`} className="text-xs font-normal cursor-pointer flex-1">
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
                <AccordionTrigger className="py-2 hover:no-underline">
                  <span className="text-xs font-medium flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    Cidade
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-2">
                  <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                    {availableCities.map((city) => (
                      <div key={city} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/50 transition-colors">
                      <Checkbox
                          id={`map-city-${city}`}
                          checked={filters.cities.includes(city)}
                          onCheckedChange={() => toggleCity(city)}
                        />
                      <Label htmlFor={`map-city-${city}`} className="text-xs font-normal cursor-pointer flex-1">
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
              <AccordionTrigger className="py-2 hover:no-underline">
                <span className="text-xs font-medium flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  Faixa de Preço
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2">
                <div className="space-y-2">
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(v) => onFiltersChange({ ...filters, priceRange: v as [number, number] })}
                    max={maxPrice}
                    step={100000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(filters.priceRange[0])}</span>
                    <span>{filters.priceRange[1] >= maxPrice ? formatCurrency(maxPrice) + '+' : formatCurrency(filters.priceRange[1])}</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>

      {/* Mobile apply button */}
      {isMobile && (
        <div className="p-3 border-t border-border">
          <Button className="w-full" onClick={onClose}>
            Aplicar Filtros
          </Button>
        </div>
      )}
    </div>
  );
}
