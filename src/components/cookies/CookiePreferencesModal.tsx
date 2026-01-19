import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Shield, BarChart3, Target } from 'lucide-react';
import type { CookiePreferences } from '@/hooks/useCookieConsent';

interface CookiePreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: CookiePreferences;
  onUpdatePreference: (key: 'analytics' | 'marketing', value: boolean) => void;
  onSave: () => void;
  onAcceptAll: () => void;
}

export function CookiePreferencesModal({
  open,
  onOpenChange,
  preferences,
  onUpdatePreference,
  onSave,
  onAcceptAll,
}: CookiePreferencesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Configurações de Cookies
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Gerencie suas preferências de cookies abaixo. Você pode ativar ou desativar as categorias opcionais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Necessary Cookies */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium text-foreground">
                    Cookies Estritamente Necessários
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      Sempre Ativos
                    </span>
                    <Switch checked disabled className="opacity-50" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Essenciais para que você navegue na plataforma com segurança, acesse sua conta e realize pagamentos de serviços como laudos de valuation. Sem eles, o site não funciona corretamente.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Analytics Cookies */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="analytics-switch" className="text-base font-medium text-foreground cursor-pointer">
                    Cookies de Desempenho e Analíticos
                  </Label>
                  <Switch
                    id="analytics-switch"
                    checked={preferences.analytics}
                    onCheckedChange={(checked) => onUpdatePreference('analytics', checked)}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Ajudam-nos a entender quais setores de empresas são mais buscados e como a plataforma é utilizada, para que possamos melhorar as ferramentas de busca e intermediação.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Marketing Cookies */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="marketing-switch" className="text-base font-medium text-foreground cursor-pointer">
                    Cookies de Marketing e Personalização
                  </Label>
                  <Switch
                    id="marketing-switch"
                    checked={preferences.marketing}
                    onCheckedChange={(checked) => onUpdatePreference('marketing', checked)}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Utilizados para direcionar oportunidades de investimento, anúncios de captação de recursos e conteúdos que sejam relevantes para o seu perfil de negócio.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onSave}
            className="w-full sm:w-auto"
          >
            Salvar Preferências
          </Button>
          <Button
            onClick={onAcceptAll}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            Aceitar Tudo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
