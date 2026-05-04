import { useEffect, useRef, useState } from 'react';
import { Camera, ShieldCheck, Crown, Building2, Award, Sparkles, Upload, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Roles {
  isAdmin?: boolean;
  isAdvisor?: boolean;
  isFranchisee?: boolean;
  isBuyer?: boolean;
  isSeller?: boolean;
}

interface Props {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  plan?: string | null;
  hasPhone: boolean;
  hasCpfCnpj: boolean;
  hasCnpj: boolean;
  roles: Roles;
  completion: number; // 0-100
  missing: { key: string; label: string; targetId?: string }[];
  onAvatarChange: (url: string) => void;
}

const LEVELS = [
  { name: 'Bronze', min: 0, color: 'from-amber-700 to-amber-500' },
  { name: 'Prata', min: 40, color: 'from-slate-400 to-slate-200' },
  { name: 'Ouro', min: 70, color: 'from-yellow-500 to-amber-300' },
  { name: 'Platina', min: 90, color: 'from-cyan-300 to-violet-300' },
];

function getLevel(pct: number) {
  return LEVELS.slice().reverse().find((l) => pct >= l.min) || LEVELS[0];
}

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || src[0]?.toUpperCase() || '?';
}

export function ProfileHeroCard({
  userId,
  email,
  fullName,
  avatarUrl,
  plan,
  hasPhone,
  hasCpfCnpj,
  hasCnpj,
  roles,
  completion,
  missing,
  onAvatarChange,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(avatarUrl || null);

  useEffect(() => {
    setLocalUrl(avatarUrl || null);
  }, [avatarUrl]);

  const level = getLevel(completion);
  const planLabel =
    plan === 'master' ? 'Master' : plan === 'gold' ? 'Gold' : 'Free';
  const isPaid = plan === 'master' || plan === 'gold';

  const roleLabel = roles.isAdmin
    ? 'Admin'
    : roles.isAdvisor
    ? 'Advisor'
    : roles.isFranchisee
    ? 'Franqueado'
    : roles.isBuyer
    ? 'Comprador'
    : 'Empreendedor';

  const verified = hasPhone && hasCpfCnpj && !!fullName;

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 4MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (updErr) throw updErr;
      setLocalUrl(url);
      onAvatarChange(url);
      toast.success('Foto atualizada!');
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao enviar foto', { description: e?.message });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="overflow-hidden border-border bg-gradient-to-br from-card to-muted/40">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-muted border-4 border-accent/20 overflow-hidden flex items-center justify-center text-2xl font-bold text-muted-foreground">
              {localUrl ? (
                <img src={localUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{initials(fullName, email)}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-accent text-accent-foreground border-4 border-background flex items-center justify-center hover:opacity-90 transition disabled:opacity-50"
              aria-label="Trocar foto"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl md:text-2xl font-bold text-foreground break-words">
                {fullName || 'Complete seu perfil'}
              </h1>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={`bg-gradient-to-r ${level.color} text-black border-0 font-semibold`}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      {level.name}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-center">
                    Seu nível sobe conforme você completa o perfil e tem atividade na plataforma.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-sm text-muted-foreground break-words">{email}</p>

            {/* Selos */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary" className="bg-muted text-foreground">
                {roleLabel}
              </Badge>
              <Badge
                variant="outline"
                className={isPaid ? 'border-accent text-accent bg-accent/10' : 'border-border text-muted-foreground'}
              >
                <Crown className="w-3 h-3 mr-1" />
                Plano {planLabel}
              </Badge>
              {verified && (
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-500 bg-emerald-500/10">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Verificado
                </Badge>
              )}
              {hasCnpj && (
                <Badge variant="outline" className="border-sky-500/50 text-sky-500 bg-sky-500/10">
                  <Building2 className="w-3 h-3 mr-1" />
                  Empresarial
                </Badge>
              )}
              {roles.isAdvisor && (
                <Badge variant="outline" className="border-violet-500/50 text-violet-500 bg-violet-500/10">
                  <Award className="w-3 h-3 mr-1" />
                  Embaixador
                </Badge>
              )}
            </div>

            {/* Completude */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Completude do perfil</span>
                <span className="text-sm font-semibold text-foreground">{completion}%</span>
              </div>
              <Progress value={completion} className="h-2" />
              {missing.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {missing.slice(0, 5).map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        if (m.key === 'avatar') {
                          fileRef.current?.click();
                          return;
                        }
                        if (m.targetId) {
                          const el = document.getElementById(m.targetId);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          (el?.querySelector('input,textarea,select') as HTMLElement)?.focus();
                        }
                      }}
                      className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition"
                    >
                      + {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { Upload };
