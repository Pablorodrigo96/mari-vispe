import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Mail, Lock, ArrowLeft, User, Phone, Check, Store, ShieldCheck } from 'lucide-react';
import { MariLogo } from '@/components/brand/MariLogo';
import { MariBrandStamp } from '@/components/brand/MariBrandStamp';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import type { SignupProfile } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { getMariPrefill } from '@/lib/mariPrefill';
import { logMariLead } from '@/lib/mariLeadTracking';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';
import { MfaChallengeDialog } from '@/components/auth/MfaChallengeDialog';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');
const nameSchema = z.string().min(3, 'Nome deve ter pelo menos 3 caracteres');
const phoneSchema = z.string().min(14, 'Telefone inválido');

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

const profileOptions: { id: SignupProfile; label: string; description: string }[] = [
  { id: 'seller', label: 'Empreendedor', description: 'Quero avaliar, captar investimento ou vender minha empresa' },
  { id: 'buyer', label: 'Comprador/Investidor', description: 'Quero comprar ou investir em empresas' },
  { id: 'advisor', label: 'Assessor interno (Vispe)', description: 'Sou assessor/representante interno da Vispe' },
  { id: 'franchisee', label: 'Franqueado', description: 'Sou franqueado da rede Vispe' },
  { id: 'partner', label: 'Parceiro externo / Contador indicador', description: 'Indico empresas e clientes para a Vispe (sem vínculo interno)' },
];

const PROFILE_HOME: Record<SignupProfile, string> = {
  seller: '/painel',
  buyer: '/painel',
  advisor: '/equity-brain/hoje',
  franchisee: '/painel',
  partner: '/painel',
};

const ROLE_HOME: Record<UserRole, string> = {
  seller: '/painel',
  buyer: '/painel',
  advisor: '/equity-brain/hoje',
  franchisee: '/painel',
};

async function resolveRoleHome(userId: string, fallback = '/painel'): Promise<string> {
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    const roles = (data?.map((r) => r.role) || []) as string[];
    if (roles.includes('admin') || roles.includes('advisor')) return '/equity-brain/hoje';
  } catch (_) { /* noop */ }
  return fallback;
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const tabParam = searchParams.get('tab');
  const interestParam = searchParams.get('interest');
  const roleParam = searchParams.get('role') as SignupProfile | null;
  const { user, signIn, signUp, loading } = useAuth();

  // Pre-select profile from query (?role=seller|buyer|advisor|franchisee|partner) or interest flow
  const validProfiles: SignupProfile[] = ['seller', 'buyer', 'advisor', 'franchisee', 'partner'];
  const defaultProfile: SignupProfile | null =
    roleParam && validProfiles.includes(roleParam) ? roleParam :
    interestParam === 'true' ? 'buyer' : null;

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup state
  const [signupFullName, setSignupFullName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupProfile, setSignupProfile] = useState<SignupProfile | null>(defaultProfile);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [mfaState, setMfaState] = useState<{ open: boolean; factorId: string }>({ open: false, factorId: '' });

  useEffect(() => {
    if (user && !loading && !mfaState.open) {
      // Check if MFA challenge is required before redirecting
      supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
        if (data && data.currentLevel === 'aal1' && data.nextLevel === 'aal2') {
          supabase.auth.mfa.listFactors().then(({ data: f }) => {
            const totp = f?.totp?.find((x) => x.status === 'verified');
            if (totp) {
              setMfaState({ open: true, factorId: totp.id });
              return;
            }
            doRedirect();
          });
          return;
        }
        doRedirect();
      }).catch(() => doRedirect());
    }
    function doRedirect() {
      if (redirectParam) {
        navigate(redirectParam);
      } else {
        resolveRoleHome(user!.id).then((dest) => navigate(dest));
      }
    }
  }, [user, loading, navigate, redirectParam, mfaState.open]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    if (formatted.length <= 15) {
      setSignupPhone(formatted);
    }
  };

  // Radio único — substitui multi-select. Mantém função para compat com handlers existentes.
  const selectProfile = (profile: SignupProfile) => {
    setSignupProfile(profile);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else {
        toast.error('Erro ao fazer login. Tente novamente.');
      }
    } else {
      toast.success('Login realizado com sucesso!');
      // useEffect handles role-based redirect once user state updates
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    try {
      nameSchema.parse(signupFullName);
    } catch {
      toast.error('Nome deve ter pelo menos 3 caracteres');
      return;
    }

    try {
      phoneSchema.parse(signupPhone);
    } catch {
      toast.error('Informe um telefone válido');
      return;
    }

    try {
      emailSchema.parse(signupEmail);
    } catch {
      toast.error('Informe um email válido');
      return;
    }

    try {
      passwordSchema.parse(signupPassword);
    } catch {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (!signupProfile) {
      toast.error('Selecione seu perfil');
      return;
    }

    // Mapeia perfil único → roles do banco.
    // 'partner' = buyer + flag is_partner_accountant=true (setada em AuthContext.signUp).
    const rolesForDb: UserRole[] =
      signupProfile === 'partner' ? ['buyer'] : [signupProfile as UserRole];

    setIsSubmitting(true);
    const { error } = await signUp({
      email: signupEmail,
      password: signupPassword,
      fullName: signupFullName,
      phone: signupPhone,
      roles: rolesForDb,
      profile: signupProfile,
    });
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
    } else {
      const needsApproval = signupProfile === 'advisor' || signupProfile === 'franchisee';

      if (needsApproval) {
        const label = signupProfile === 'advisor' ? 'Assessor' : 'Franqueado';
        toast.success(`Conta criada! Acesso de ${label} aguardando aprovação do admin.`);
      } else {
        toast.success('Conta criada com sucesso!');
      }

      // Determine destination
      const prefill = getMariPrefill();
      const hasMariPrefill = !!prefill;
      if (hasMariPrefill && signupProfile === 'seller') {
        try {
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) await logMariLead(prefill!, newUser.id);
        } catch (err) {
          console.error('logMariLead error', err);
        }
      }
      const dest = redirectParam
        ?? (hasMariPrefill && signupProfile === 'seller'
              ? '/vender'
              : needsApproval
                  ? '/aguardando-aprovacao'
                  : PROFILE_HOME[signupProfile]);
      navigate(dest);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted to-background px-4 py-8 relative overflow-hidden">
      <MariBrandStamp position="tr" tone="carbon" size={520} opacity={0.05} showWordmark={false} />
      <MariBrandStamp position="bl" tone="carbon" size={420} opacity={0.04} showWordmark />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-4">
            <MariLogo variant="tagline-light" size={140} />
          </Link>
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-3">designed forward</p>
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo</h1>
          <p className="text-muted-foreground mt-2">Entre ou crie sua conta para continuar</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <Tabs defaultValue={tabParam === 'signup' ? 'signup' : 'login'} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Entrando...' : 'Entrar'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-sm text-muted-foreground hover:text-accent underline-offset-4 hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </form>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={signupPhone}
                      onChange={handlePhoneChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Repita a senha"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Perfil (radio único) */}
                <div className="space-y-3">
                  <Label>Eu sou:</Label>
                  <div className="space-y-2" role="radiogroup" aria-label="Selecione seu perfil">
                    {profileOptions.map((option) => {
                      const selected = signupProfile === option.id;
                      return (
                        <div
                          key={option.id}
                          role="radio"
                          aria-checked={selected}
                          tabIndex={0}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selected
                              ? 'border-accent bg-accent/5'
                              : 'border-border hover:border-muted-foreground/50'
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            selectProfile(option.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              selectProfile(option.id);
                            }
                          }}
                        >
                          <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border flex items-center justify-center transition-colors ${
                            selected
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-primary'
                          }`}>
                            {selected && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium cursor-pointer">
                              {option.label}
                            </span>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Criando conta...' : 'Criar Conta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-foreground/85">
          <ShieldCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="break-words">
            <span className="font-semibold">Plataforma 100% sigilosa.</span> Seus dados são anônimos por padrão.
            Nenhum concorrente, sócio ou funcionário vai saber que você está aqui — sua identidade só é revelada
            após NDA assinado e sua aprovação.
          </p>
        </div>

        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o início
          </Link>
        </div>
      </div>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} defaultEmail={loginEmail} />
      <MfaChallengeDialog
        open={mfaState.open}
        onOpenChange={(v) => setMfaState((s) => ({ ...s, open: v }))}
        factorId={mfaState.factorId}
        onVerified={() => {
          setMfaState({ open: false, factorId: '' });
          // useEffect will re-evaluate AAL and redirect
        }}
      />
    </div>
  );
}
