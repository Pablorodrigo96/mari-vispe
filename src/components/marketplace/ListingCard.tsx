import { Link } from 'react-router-dom';
import { Heart, MapPin, TrendingUp, Star, Calendar, BadgeCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, getCategoryIcon, getCategoryLabel } from '@/lib/formatters';
import { getCategoryFallbackImage } from '@/lib/categoryImages';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Listing = Tables<'listings'>;

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const categoryIcon = getCategoryIcon(listing.category);
  const categoryLabel = getCategoryLabel(listing.category);
  
  // Calculate if listing is new (created within last 7 days)
  const isNew = listing.created_at 
    ? new Date().getTime() - new Date(listing.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
    : false;
  
  // Calculate if listing is profitable (margin > 20%)
  const isProfitable = listing.annual_revenue && listing.annual_profit 
    ? (listing.annual_profit / listing.annual_revenue) > 0.2
    : false;

  // Get first image or use deterministic fallback from category pool
  const imageUrl = listing.images && listing.images.length > 0 
    ? listing.images[0] 
    : getCategoryFallbackImage(listing.category, listing.id);

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-soft hover:-translate-y-1">
      {/* Image / Category Placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-muted to-secondary flex items-center justify-center overflow-hidden">
        <img 
          src={imageUrl} 
          alt={listing.title} 
          className="w-full h-full object-cover"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {(listing as any).verified && (
            <Badge className="bg-accent text-accent-foreground gap-1">
              <BadgeCheck className="h-3 w-3" />
              Verificado
            </Badge>
          )}
          {isNew && (
            <Badge variant="outline" className="bg-card gap-1">
              <Star className="h-3 w-3" />
              Novo
            </Badge>
          )}
          {isProfitable && (
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Lucrativo
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
            {listing.title}
          </h3>
          {(listing.city || listing.state) && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {[listing.city, listing.state].filter(Boolean).join(', ')}
            </div>
          )}
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-muted/50 rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Receita Anual</p>
            <p className="font-semibold text-sm">
              {listing.annual_revenue 
                ? formatCurrency(Number(listing.annual_revenue)) 
                : 'Não informado'}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Lucro Anual</p>
            <p className="font-semibold text-sm">
              {listing.annual_profit 
                ? formatCurrency(Number(listing.annual_profit)) 
                : 'Não informado'}
            </p>
          </div>
        </div>

        {/* Asking Price */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Valor de Venda</p>
            <p className="text-lg font-bold text-accent">
              {listing.hide_price 
                ? 'Sob consulta' 
                : listing.asking_price 
                  ? formatCurrency(Number(listing.asking_price))
                  : 'Sob consulta'}
            </p>
          </div>
          {listing.foundation_year && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Desde {listing.foundation_year}
            </div>
          )}
        </div>

        {/* CTA */}
        <Button asChild className="w-full" variant="outline">
          <Link to={`/anuncio/${listing.id}`}>
            Ver Detalhes
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
