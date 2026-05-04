import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  factorId: string;
  onVerified: () => void;
}

export function MfaChallengeDialog({ open, onOpenChange, factorId, onVerified }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error('O código tem 6 dígitos');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setLoading(false);
    if (error) {
      toast.error('Código inválido. Tente novamente.');
      return;
    }
    toast.success('Verificação concluída.');
    setCode('');
    onVerified();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" /> Autenticação em 2 fatores
          </DialogTitle>
          <DialogDescription>
            Abra seu app autenticador (Google Authenticator, Authy, 1Password) e digite o código de 6 dígitos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Código</Label>
            <Input
              id="mfa-code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-[0.4em] font-mono"
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || code.length !== 6} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              {loading ? 'Verificando...' : 'Verificar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
