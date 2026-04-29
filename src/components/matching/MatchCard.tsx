import { MapPin, Tag, MessageCircle, Eye, Layers, GitBranch } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { openWhatsApp } from '@/lib/whatsapp';
import { formatCurrency } from '@/lib/formatters';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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
  index?: number;
}

export function MatchCard({ match, index = 0 }: MatchCardProps) {
  const navigate = useNavigate();
  const compatibilityLabel = match.score >= 80 ? 'Alta' : match.score >= 60 ? 'Média' : 'Moderada';
  const compatibilityColor =
    match.score >= 80 ? 'text-success' :
    match.score >= 60 ? 'text-accent' :
    'text-muted-foreground';
  const progressColor =
    match.score >= 80 ? '[&>div]:bg-success' :
    match.score >= 60 ? '[&>div]:bg-accent' :
    '[&>div]:bg-muted-foreground';

  const handleWhatsApp = async () => {
    const msg = `Olá, encontrei o anúncio "${match.title}" na mari e gostaria de mais informações.`;
    const opened = await openWhatsApp(msg);
    if (!opened) {
      toast.info('Link copiado! Cole no navegador para abrir o WhatsApp.');
    }
  };

  const thumbnail = match.images?.[0];
  const TypeIcon = match.matchType === 'vertical' ? GitBranch : Layers;
  const typeLabel = match.matchType === 'vertical' ? 'Vertical' : 'Horizontal';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Card className="glass-card border-accent/10 hover:border-accent/30 hover:shadow-gold transition-all duration-300 overflow-hidden group">
        {thumbnail && (
          <div className="h-32 overflow-hidden">
            <img src={thumbnail} alt={match.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
        )}
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-primary-foreground line-clamp-1">{match.title}</h3>
              <div className="flex gap-1.5 mt-1">
                <Badge variant="secondary" className="text-xs bg-accent/10 text-accent border-accent/20">{match.category}</Badge>
                <Badge variant="outline" className="text-xs gap-1 border-primary-foreground/10 text-primary-foreground/60 bg-transparent">
                  <TypeIcon className="w-3 h-3" />
                  {typeLabel}
                </Badge>
              </div>
            </div>
          </div>

          {/* Score bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-primary-foreground/40">Compatibilidade</span>
              <span className={`text-xs font-bold ${compatibilityColor}`}>
                {match.score}% · {compatibilityLabel}
              </span>
            </div>
            <Progress value={match.score} className={`h-1.5 bg-primary-foreground/10 ${progressColor}`} />
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-primary-foreground/50 mb-4">
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
              className="flex-1 gap-2 border-primary-foreground/10 text-primary-foreground/70 hover:bg-accent/10 hover:text-accent hover:border-accent/30 bg-transparent"
            >
              <Eye className="w-4 h-4" />
              Ver anúncio
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              className="flex-1 gap-2 border-primary-foreground/10 text-primary-foreground/70 hover:bg-accent/10 hover:text-accent hover:border-accent/30 bg-transparent"
            >
              <MessageCircle className="w-4 h-4" />
              Consultor
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
