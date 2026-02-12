import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, DollarSign, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categories, states, priceRanges } from '@/data/mockData';

export function SearchBar() {
  const navigate = useNavigate();
  const [sector, setSector] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (sector) params.set('sector', sector);
    if (price) params.set('price', price);
    if (location) params.set('location', location);
    navigate(`/marketplace?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl shadow-2xl shadow-black/10 border border-white/15 p-2 md:p-3">
        <div className="flex flex-col md:flex-row gap-2 md:gap-0">
          {/* Sector */}
          <div className="flex-1 md:border-r border-border">
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger className="border-0 h-12 md:h-14 px-4 focus:ring-0 focus:ring-offset-0">
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <div className="flex flex-col items-start">
                    <span className="text-xs text-muted-foreground">Setor</span>
                    <SelectValue placeholder="Qualquer setor" />
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer setor</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <img src={cat.image} alt={cat.label} className="w-5 h-5 rounded object-cover" />
                      {cat.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div className="flex-1 md:border-r border-border">
            <Select value={price} onValueChange={setPrice}>
              <SelectTrigger className="border-0 h-12 md:h-14 px-4 focus:ring-0 focus:ring-offset-0">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div className="flex flex-col items-start">
                    <span className="text-xs text-muted-foreground">Valor</span>
                    <SelectValue placeholder="Qualquer valor" />
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer valor</SelectItem>
                {priceRanges.map((range) => (
                  <SelectItem key={range.id} value={range.id}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="flex-1">
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="border-0 h-12 md:h-14 px-4 focus:ring-0 focus:ring-offset-0">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div className="flex flex-col items-start">
                    <span className="text-xs text-muted-foreground">Localização</span>
                    <SelectValue placeholder="Todo Brasil" />
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo Brasil</SelectItem>
                {states.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            className="h-12 md:h-14 px-6 md:px-8 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-gold"
          >
            <Search className="h-5 w-5 md:mr-2" />
            <span className="hidden md:inline">Buscar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
