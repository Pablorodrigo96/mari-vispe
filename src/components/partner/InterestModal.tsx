import { useState } from 'react';
import { Loader2, Handshake } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  opportunityTitle: string;
  onConfirm: (buyerDescription: string) => Promise<void>;
}

export function InterestModal({ open, onOpenChange, opportunityTitle, onConfirm }: Props) {
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(desc);
      setDesc('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="!bg-slate-900 border-slate-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Handshake className="w-5 h-5 text-accent" />
            Tenho comprador para esse lead
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Você está prestes a registrar interesse em <strong className="text-foreground">{opportunityTitle}</strong>.
            O originador do lead será notificado e poderá aceitar ou recusar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold text-accent">
              <Badge className="bg-accent text-accent-foreground text-[10px]">Regra do split</Badge>
              Comissão dividida 50/50
            </div>
            <p className="text-muted-foreground">
              Quem cadastrou (porta de entrada) e quem trouxer o comprador (porta de saída) ganham metade da comissão cada.
              Identidades só são reveladas após o originador aceitar o match.
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Descreva brevemente seu comprador (opcional)</Label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ex: Fundo de PE focado em saúde, ticket R$ 5–20M, busca empresas no SP/RJ..."
              className="mt-1.5 bg-slate-950 border-slate-700 text-foreground"
              rows={3}
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground mt-1">{desc.length}/500</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar interesse'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
