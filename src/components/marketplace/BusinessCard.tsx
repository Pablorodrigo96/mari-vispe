import { Link } from 'react-router-dom';
import { Heart, Eye, MapPin, TrendingUp, BadgeCheck, Sparkles, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Business } from '@/data/mockData';
import { formatCurrency, getCategoryIcon, getCategoryLabel } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface BusinessCardProps {
  business: Business;
  featured?: boolean;
}

export function BusinessCard({ business, featured = false }: BusinessCardProps) {
  const categoryIcon = getCategoryIcon(business.category);
  const categoryLabel = getCategoryLabel(business.category);

  return (
    <Card 
      className={cn(
        "group overflow-hidden transition-all duration-300 hover:shadow-soft hover:-translate-y-1",
        featured && "ring-2 ring-accent"
      )}
    >
      {/* Image / Category Placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-muted to-secondary flex items-center justify-center">
        <span className="text-6xl opacity-50">{categoryIcon}</span>
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {business.badges.includes('verified') && (
            <Badge className="bg-success text-success-foreground gap-1">
              <BadgeCheck className="h-3 w-3" />
              Verificado
            </Badge>
          )}
          {business.badges.includes('exclusive') && (
            <Badge className="bg-accent text-accent-foreground gap-1">
              <Sparkles className="h-3 w-3" />
              Exclusivo
            </Badge>
          )}
          {business.badges.includes('profitable') && (
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Lucrativa
            </Badge>
          )}
          {business.badges.includes('new') && (
            <Badge variant="outline" className="bg-card gap-1">
              <Star className="h-3 w-3" />
              Novo
            </Badge>
          )}
        </div>

        {/* Favorite Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 h-9 w-9 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart className="h-4 w-4" />
        </Button>

        {/* Category Tag */}
        <div className="absolute bottom-3 left-3">
          <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm">
            {categoryIcon} {categoryLabel}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Title & Location */}
        <div className="mb-3">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-accent transition-colors">
            {business.title}
          </h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {business.location.city}, {business.location.state}
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-muted/50 rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Receita Anual</p>
            <p className="font-semibold text-sm">{formatCurrency(business.financials.annualRevenue)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">EBITDA</p>
            <p className="font-semibold text-sm">{formatCurrency(business.financials.ebitda)}</p>
          </div>
        </div>

        {/* Asking Price */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Valor de Venda</p>
            <p className="text-lg font-bold text-accent">{formatCurrency(business.financials.askingPrice)}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {business.views}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {business.favorites}
            </span>
          </div>
        </div>

        {/* CTA */}
        <Button asChild className="w-full" variant="outline">
          <Link to={`/business/${business.id}`}>
            Ver Detalhes
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
