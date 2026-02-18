import { Building2, MapPin, Briefcase, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getWhatsAppLink, openWhatsApp } from '@/lib/whatsapp';
import { toast } from 'sonner';

interface MatchCardProps {
  match: {
    razao_social: string;
    nome_fantasia: string | null;
    cnae_principal: string;
    cidade: string;
    estado: string;
    porte: string;
    score: number;
  };
  companyName?: string;
}

export function MatchCard({ match, companyName }: MatchCardProps) {
  const compatibilityLabel = match.score >= 80 ? 'Alta' : match.score >= 60 ? 'Média' : 'Moderada';
  const compatibilityColor =
    match.score >= 80 ? 'bg-green-500/10 text-green-600 border-green-500/20' :
    match.score >= 60 ? 'bg-accent/10 text-accent border-accent/20' :
    'bg-muted text-muted-foreground border-border';

  const handleWhatsApp = async () => {
    const msg = `Olá, encontrei um match na PME.B3 entre ${companyName || 'minha empresa'} e ${match.nome_fantasia || match.razao_social}. Gostaria de mais informações.`;
    const opened = await openWhatsApp(msg);
    if (!opened) {
      toast.info('Link copiado! Cole no navegador para abrir o WhatsApp.');
    }
  };

  return (
    <Card className="border-border/50 hover:border-accent/30 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {match.nome_fantasia || match.razao_social}
              </h3>
              <p className="text-xs text-muted-foreground">{match.razao_social}</p>
            </div>
          </div>
          <Badge variant="outline" className={compatibilityColor}>
            {compatibilityLabel} compatibilidade
          </Badge>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            {match.cidade}/{match.estado}
          </div>
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" />
            CNAE: {match.cnae_principal}
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            {match.porte || 'N/A'}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleWhatsApp}
          className="w-full gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Falar com consultor
        </Button>
      </CardContent>
    </Card>
  );
}
