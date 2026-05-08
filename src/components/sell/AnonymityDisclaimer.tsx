import { ShieldCheck, EyeOff, FileSignature, Lock } from 'lucide-react';

interface Props {
  variant?: 'full' | 'compact';
}

export function AnonymityDisclaimer({ variant = 'full' }: Props) {
  if (variant === 'compact') {
    return (
      <div className="flex items-start gap-2 rounded-md border border-accent/30 bg-accent/5 p-3 text-xs text-foreground/90">
        <ShieldCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" />
        <p className="break-words">
          <span className="font-semibold">Sigilo absoluto:</span> nenhum concorrente, sócio ou funcionário vai
          saber que você está aqui. Sua empresa aparece apenas com codinome
          (ex: <code className="text-accent">MARI-XXX-1234</code>). Razão social, CNPJ e endereço completo só são revelados após NDA assinado e sua aprovação.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/5 to-transparent p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-5 w-5 text-accent" />
        <h3 className="font-semibold text-foreground">Plataforma 100% sigilosa</h3>
      </div>
      <p className="text-sm text-foreground/80 mb-3 break-words">
        <span className="font-semibold text-foreground">Nenhum concorrente, sócio, funcionário ou banco</span> vai saber que você está vendendo. Sua identidade fica protegida do início ao fim.
      </p>
      <ul className="space-y-2 text-sm text-foreground/85">
        <li className="flex items-start gap-2 break-words">
          <EyeOff className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <span>Sua empresa entra na vitrine apenas com <span className="font-semibold">codinome</span> (ex: <code className="text-accent">MARI-TECH-1234</code>). Razão social, CNPJ, endereço completo e fotos identificáveis <span className="font-semibold">nunca aparecem</span> publicamente.</span>
        </li>
        <li className="flex items-start gap-2 break-words">
          <FileSignature className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <span>Compradores só veem dados reais após <span className="font-semibold">assinarem NDA</span> e você aprovar a liberação caso a caso.</span>
        </li>
        <li className="flex items-start gap-2 break-words">
          <Lock className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <span>Dados financeiros criptografados. Acesso registrado e auditado (LGPD).</span>
        </li>
        <li className="flex items-start gap-2 break-words">
          <ShieldCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <span>Você controla quando e para quem revelar a identidade. <span className="font-semibold">Sempre.</span></span>
        </li>
      </ul>
    </div>
  );
}
