import { MapPin, Tag, MessageCircle, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { openWhatsApp } from '@/lib/whatsapp';
import { formatCurrency } from '@/lib/formatters';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface MatchCardProps {
  match: {
    id: string;
    title: string;
    category: string;
    city: string | null;
    state: string | null;
    annual_revenue: number | null;
    asking_price: number | null;
    images: string[] | null;
    score: number;
    matchType?: 'horizontal' | 'vertical';
  };
}

export function MatchCard({ match }: MatchCardProps) {
  const navigate = useNavigate();
  const compatibilityLabel = match.score >= 80 ? 'Alta' : match.score >= 60 ? 'Média' : 'Moderada';
  const compatibilityColor =
    match.score >= 80 ? 'bg-green-500/10 text-green-600 border-green-500/20' :
    match.score >= 60 ? 'bg-accent/10 text-accent border-accent/20' :
    'bg-muted text-muted-foreground border-border';

  const handleWhatsApp = async () => {
    const msg = `Olá, encontrei o anúncio "${match.title}" na PME.B3 e gostaria de mais informações.`;
    const opened = await openWhatsApp(msg);
    if (!opened) {
      toast.info('Link copiado! Cole no navegador para abrir o WhatsApp.');
    }
  };

  const thumbnail = match.images?.[0];
  const typeLabel = match.matchType === 'vertical' ? 'Vertical' : 'Horizontal';
  const typeColor = match.matchType === 'vertical'
    ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
    : 'bg-blue-500/10 text-blue-600 border-blue-500/20';

  return (
    <Card className="border-border/50 hover:border-accent/30 transition-colors overflow-hidden">
      {thumbnail && (
        <div className="h-32 overflow-hidden">
          <img src={thumbnail} alt={match.title} className="w-full h-full object-cover" />
        </div>
      )}
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground line-clamp-1">{match.title}</h3>
            <div className="flex gap-1.5 mt-1">
              <Badge variant="secondary" className="text-xs">{match.category}</Badge>
              <Badge variant="outline" className={`text-xs ${typeColor}`}>{typeLabel}</Badge>
            </div>
          </div>
          <Badge variant="outline" className={compatibilityColor}>
            {compatibilityLabel}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
          {match.city && match.state && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {match.city}/{match.state}
            </div>
          )}
          {match.asking_price && (
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              {formatCurrency(match.asking_price)}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/listing/${match.id}`)}
            className="flex-1 gap-2"
          >
            <Eye className="w-4 h-4" />
            Ver anúncio
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleWhatsApp}
            className="flex-1 gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Consultor
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
