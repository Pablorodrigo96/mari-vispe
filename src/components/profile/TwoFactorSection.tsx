import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShieldCheck, Shield, Loader2, Copy } from 'lucide-react';

interface Factor {
  id: string;
  friendly_name?: string | null;
  factor_type: string;
  status: string;
}

export function TwoFactorSection() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const verifiedFactor = factors.find((f) => f.factor_type === 'totp' && f.status === 'verified');

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar fatores de autenticação');
      return;
    }
    setFactors([...(data?.totp || []), ...((data as any)?.phone || [])] as Factor[]);
  };

  useEffect(() => { refresh(); }, []);

  const handleEnroll = async () => {
    setEnrolling(true);
    // Clean up any existing unverified factor first
    const { data: list } = await supabase.auth.mfa.listFactors();
    const stale = (list?.totp || []).find((f) => f.status !== 'verified');
    if (stale) {
      await supabase.auth.mfa.unenroll({ factorId: stale.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `mari ${new Date().toISOString().slice(0, 10)}`,
    });
    setEnrolling(false);
    if (error || !data) {
      toast.error('Erro ao iniciar configuração do 2FA');
      return;
    }
    setEnrollData({
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    });
  };

  const handleVerify = async () => {
    if (!enrollData) return;
    if (code.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }
    setVerifying(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollData.factorId,
      code,
    });
    setVerifying(false);
    if (error) {
      toast.error('Código inválido. Tente novamente.');
      return;
    }
    toast.success('Autenticação em 2 fatores ativada!');
    setEnrollData(null);
    setCode('');
    await refresh();
  };

  const handleCancelEnroll = async () => {
    if (enrollData) {
      await supabase.auth.mfa.unenroll({ factorId: enrollData.factorId });
    }
    setEnrollData(null);
    setCode('');
  };

  const handleDisable = async () => {
    if (!verifiedFactor) return;
    if (!confirm('Desativar a autenticação em 2 fatores? Sua conta ficará menos segura.')) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
    if (error) {
      toast.error('Erro ao desativar 2FA');
      return;
    }
    toast.success('2FA desativado');
    await refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent" /> Segurança da conta
        </CardTitle>
        <CardDescription>
          Ative a autenticação em 2 fatores (2FA) usando um app como Google Authenticator, Authy ou 1Password para deixar sua conta mais segura.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : verifiedFactor ? (
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
              <div>
                <p className="font-medium text-foreground">2FA está ativo</p>
                <p className="text-xs text-muted-foreground">
                  Seu login pedirá um código do app autenticador.
                </p>
              </div>
              <Badge variant="outline" className="border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-transparent">
                Ativo
              </Badge>
            </div>
            <Button variant="outline" className="bg-transparent" onClick={handleDisable}>
              Desativar
            </Button>
          </div>
        ) : enrollData ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-start">
              <div className="bg-white p-3 rounded-lg border flex items-center justify-center">
                <img src={enrollData.qr} alt="QR Code 2FA" className="w-44 h-44" />
              </div>
              <div className="space-y-3 text-sm">
                <p className="font-medium">1. Escaneie o QR Code no seu app autenticador.</p>
                <p className="text-muted-foreground">Ou digite a chave manualmente:</p>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 rounded bg-muted text-xs break-all flex-1">{enrollData.secret}</code>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="bg-transparent shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(enrollData.secret);
                      toast.success('Chave copiada');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="font-medium pt-2">2. Digite o código de 6 dígitos gerado:</p>
                <div className="space-y-2">
                  <Label htmlFor="totp-code" className="sr-only">Código</Label>
                  <Input
                    id="totp-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-xl tracking-[0.4em] font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleVerify} disabled={verifying || code.length !== 6} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    {verifying ? 'Verificando...' : 'Ativar 2FA'}
                  </Button>
                  <Button variant="outline" className="bg-transparent" onClick={handleCancelEnroll}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-muted/30">
            <div>
              <p className="font-medium text-foreground">2FA está desativado</p>
              <p className="text-xs text-muted-foreground">
                Recomendamos ativar para proteger sua conta de acessos não autorizados.
              </p>
            </div>
            <Button onClick={handleEnroll} disabled={enrolling} className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0">
              {enrolling ? 'Iniciando...' : 'Ativar 2FA'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
