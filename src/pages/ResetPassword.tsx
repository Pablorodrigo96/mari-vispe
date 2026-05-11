import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MariLogo } from '@/components/brand/MariLogo';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';

type RecoveryState = 'checking' | 'ready' | 'missing';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<RecoveryState>('checking');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Listener captures the PASSWORD_RECOVERY event fired by supabase-js
    // once it finishes parsing the hash from the email link.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setState('ready');
      }
    });

    // Fallback: if the hash was processed before mount (deep-link refresh),
    // we may already have a session. Give it a tick to settle.
    const t = setTimeout(async () => {
      if (!mounted) return;
      const { data } = await supabase.auth.getSession();
      setState((curr) => (curr === 'ready' ? curr : data.session ? 'ready' : 'missing'));
    }, 800);

    return () => {
      mounted = false;
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      console.error('[reset-password] updateUser error:', error);
      const msg = error.message || 'Falha ao redefinir senha.';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }
    toast.success('Senha redefinida com sucesso!');
    navigate('/painel');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted to-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-4">
            <MariLogo variant="tagline-light" size={140} />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Redefinir senha</h1>
          <p className="text-muted-foreground mt-2">Crie uma nova senha para sua conta</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nova senha</CardTitle>
            <CardDescription>Use no mínimo 6 caracteres.</CardDescription>
          </CardHeader>
          <CardContent>
            {state === 'checking' && (
              <div className="text-sm text-muted-foreground">Validando link de recuperação…</div>
            )}

            {state === 'missing' && (
              <div className="space-y-4">
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-100 flex gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">Link de recuperação não encontrado ou já usado.</p>
                    <p className="opacity-80">
                      Isso normalmente acontece quando o link foi aberto duas vezes, em outro
                      dispositivo, ou ficou em filtros antivírus do servidor de email.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => setForgotOpen(true)}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    Pedir um novo link
                  </Button>
                  <Button onClick={() => navigate('/auth')} variant="outline" className="bg-transparent">
                    Voltar para login
                  </Button>
                </div>
              </div>
            )}

            {state === 'ready' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-pwd">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-pwd"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-pwd-2">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-pwd-2"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                {errorMsg && (
                  <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-md p-2 flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p>{errorMsg}</p>
                      <button
                        type="button"
                        onClick={() => setForgotOpen(true)}
                        className="underline opacity-80 hover:opacity-100"
                      >
                        Pedir um novo link
                      </button>
                    </div>
                  </div>
                )}
                <Button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  {loading ? 'Salvando...' : 'Redefinir senha'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Voltar para login
          </Link>
        </div>
      </div>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  );
}
