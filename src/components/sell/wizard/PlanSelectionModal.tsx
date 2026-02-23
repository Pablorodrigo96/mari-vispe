import { Check, Crown, Zap, Video, Star, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface PlanSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectPlan: (plan: 'basic' | 'master') => void;
  isSubmitting?: boolean;
}

const PlanSelectionModal = ({
  open,
  onClose,
  onSelectPlan,
  isSubmitting,
}: PlanSelectionModalProps) => {
  const basicFeatures = [
    'Anúncio visível no marketplace',
    'Até 5 fotos',
    'Contato via formulário',
    'Suporte por email',
  ];

  const masterFeatures = [
    'Tudo do plano Básico',
    'Prioridade nas buscas',
    'Destaque na home',
    'Vídeo no anúncio',
    'Até 20 fotos',
    'Selo "Verificado"',
    'Suporte prioritário',
    'Analytics do anúncio',
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            Escolha seu Plano
          </DialogTitle>
          <DialogDescription className="text-center">
            Selecione o plano que melhor se adapta às suas necessidades
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Basic Plan */}
          <div className="border border-border rounded-xl p-6 hover:border-muted-foreground/50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Zap className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Básico</h3>
                <p className="text-sm text-muted-foreground">Comece gratuitamente</p>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold text-foreground">Grátis</span>
            </div>

            <ul className="space-y-3 mb-6">
              {basicFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => onSelectPlan('basic')}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Publicando...' : 'Selecionar Básico'}
            </Button>
          </div>

          {/* Master Plan */}
          <div className="border-2 border-accent rounded-xl p-6 relative bg-gradient-to-b from-accent/5 to-transparent">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" />
                RECOMENDADO
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Master</h3>
                <p className="text-sm text-muted-foreground">Máxima visibilidade</p>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold text-foreground">R$ 697</span>
              <span className="text-muted-foreground">/mês</span>
            </div>

            <ul className="space-y-3 mb-6">
              {masterFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {/* Highlight Benefits */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-lg">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="text-xs font-medium">+5x visualizações</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-lg">
                <Video className="w-4 h-4 text-accent" />
                <span className="text-xs font-medium">Vídeo incluso</span>
              </div>
            </div>

            <Button
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => onSelectPlan('master')}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Publicando...' : 'Selecionar Master'}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Você pode fazer upgrade a qualquer momento após publicar
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default PlanSelectionModal;