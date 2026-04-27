import { useState } from 'react';
import { Filter, X, MapPin, DollarSign, Building2, Users, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { categories } from '@/data/mockData';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { MapFilterState } from './MapFilterSidebar';
import { defaultMapFilters, DEFAULT_MAX_PRICE } from './MapFilterSidebar';

interface Props {
  filters: MapFilterState;
  onFiltersChange: (f: MapFilterState) => void;
  availableStates: string[];
  availableCities: string[];
  maxPrice?: number;
}

export function MapTopFilterBar({
  filters, onFiltersChange, availableStates, availableCities, maxPrice = DEFAULT_MAX_PRICE,
}: Props) {
  const [open, setOpen] = useState<string | null>(null);

  const toggle = <T,>(arr: T[], v: T) =>
    arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const labelFor = (id: string) => categories.find(c => c.id === id)?.label ?? id;

  const activeChips: { key: string; label: string; onRemove: () => void }[] = [
    ...filters.categories.map(c => ({
      key: `cat-${c}`, label: labelFor(c),
      onRemove: () => onFiltersChange({ ...filters, categories: filters.categories.filter(x => x !== c) }),
    })),
    ...filters.states.map(s => ({
      key: `state-${s}`, label: s,
      onRemove: () => onFiltersChange({ ...filters, states: filters.states.filter(x => x !== s) }),
    })),
    ...filters.cities.map(c => ({
      key: `city-${c}`, label: c,
      onRemove: () => onFiltersChange({ ...filters, cities: filters.cities.filter(x => x !== c) }),
    })),
  ];
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice) {
    activeChips.push({
      key: 'price',
      label: `Até ${formatCurrency(filters.priceRange[1])}`,
      onRemove: () => onFiltersChange({ ...filters, priceRange: [0, maxPrice] }),
    });
  }

  const Chip = ({ id, icon: Icon, label, count, children }: any) => (
    <Popover open={open === id} onOpenChange={(o) => setOpen(o ? id : null)}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 rounded-full border-border bg-card hover:bg-muted text-xs font-medium gap-1.5 px-3 shrink-0',
            count > 0 && 'border-accent/60 text-accent bg-accent/10 hover:bg-accent/15',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
          {count > 0 && <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-accent text-accent-foreground">{count}</Badge>}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">{children}</PopoverContent>
    </Popover>
  );

  return (
    <div className="bg-card/95 backdrop-blur-md border-b border-border">
      {/* Row 1: filter chips */}
      <div className="px-3 lg:px-4 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

        {/* Tipo */}
        <Chip id="type" icon={Users} label="Tipo"
          count={(!filters.showSellers || !filters.showBuyers) ? 1 : 0}>
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50">
              <Checkbox id="t-s" checked={filters.showSellers}
                onCheckedChange={(v) => onFiltersChange({ ...filters, showSellers: !!v })} />
              <Label htmlFor="t-s" className="text-xs cursor-pointer flex items-center gap-2 flex-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Empresas à venda
              </Label>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50">
              <Checkbox id="t-b" checked={filters.showBuyers}
                onCheckedChange={(v) => onFiltersChange({ ...filters, showBuyers: !!v })} />
              <Label htmlFor="t-b" className="text-xs cursor-pointer flex items-center gap-2 flex-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Compradores ativos
              </Label>
            </div>
          </div>
        </Chip>

        {/* Setor */}
        <Chip id="cat" icon={Building2} label="Setor" count={filters.categories.length}>
          <ScrollArea className="max-h-72">
            <div className="p-2 space-y-0.5">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50">
                  <Checkbox id={`tc-${cat.id}`}
                    checked={filters.categories.includes(cat.id)}
                    onCheckedChange={() => onFiltersChange({ ...filters, categories: toggle(filters.categories, cat.id) })} />
                  <Label htmlFor={`tc-${cat.id}`} className="text-xs cursor-pointer flex items-center gap-2 flex-1">
                    <img src={cat.image} alt="" className="w-4 h-4 rounded object-cover" />
                    {cat.label}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Chip>

        {/* Localização */}
        <Chip id="loc" icon={MapPin} label="Localização" count={filters.states.length + filters.cities.length}>
          <div className="p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-1">Estado</div>
            <ScrollArea className="max-h-40">
              <div className="grid grid-cols-3 gap-1 px-2 pb-2">
                {availableStates.map(s => (
                  <button key={s}
                    onClick={() => onFiltersChange({ ...filters, states: toggle(filters.states, s) })}
                    className={cn(
                      'px-1.5 py-1 rounded text-[11px] font-mono border',
                      filters.states.includes(s)
                        ? 'bg-accent/20 text-accent border-accent/50'
                        : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted',
                    )}
                  >{s}</button>
                ))}
              </div>
            </ScrollArea>
            {availableCities.length > 0 && (
              <>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mt-2 mb-1">Cidade</div>
                <ScrollArea className="max-h-40">
                  <div className="px-2 pb-2 space-y-0.5">
                    {availableCities.map(c => (
                      <div key={c} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted/50">
                        <Checkbox id={`tcity-${c}`}
                          checked={filters.cities.includes(c)}
                          onCheckedChange={() => onFiltersChange({ ...filters, cities: toggle(filters.cities, c) })} />
                        <Label htmlFor={`tcity-${c}`} className="text-xs cursor-pointer flex-1">{c}</Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        </Chip>

        {/* Preço */}
        <Chip id="price" icon={DollarSign} label="Preço"
          count={(filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice) ? 1 : 0}>
          <div className="p-4 space-y-3">
            <Slider
              value={filters.priceRange}
              onValueChange={(v) => onFiltersChange({ ...filters, priceRange: v as [number, number] })}
              max={maxPrice} step={100000} className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(filters.priceRange[0])}</span>
              <span>{filters.priceRange[1] >= maxPrice ? formatCurrency(maxPrice) + '+' : formatCurrency(filters.priceRange[1])}</span>
            </div>
          </div>
        </Chip>

        {activeChips.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onFiltersChange(defaultMapFilters)}
            className="h-9 text-xs text-muted-foreground hover:text-destructive shrink-0 ml-auto">
            Limpar tudo
          </Button>
        )}
      </div>

      {/* Row 2: active chips */}
      {activeChips.length > 0 && (
        <div className="px-3 lg:px-4 pb-2.5 flex items-center gap-1.5 flex-wrap">
          {activeChips.map(chip => (
            <Badge key={chip.key} variant="secondary"
              className="h-6 pl-2.5 pr-1 gap-1 text-[11px] font-normal bg-accent/10 text-accent border border-accent/30 hover:bg-accent/15">
              {chip.label}
              <button onClick={chip.onRemove}
                className="ml-0.5 h-4 w-4 inline-flex items-center justify-center rounded-full hover:bg-accent/30">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
