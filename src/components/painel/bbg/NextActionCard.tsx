import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

interface NextAction {
  hasProfile: boolean;
  hasListing: boolean;
  hasValuation: boolean;
}

function pickAction({ hasProfile, hasListing, hasValuation }: NextAction) {
  if (!hasProfile) {
    return {
      label: 'Completar perfil',
      reason: 'Perfil incompleto reduz score Mari e visibilidade pra compradores.',
      cta: 'Abrir perfil',
      to: '/meu-perfil',
    };
  }
  if (!hasValuation) {
    return {
      label: 'Rodar primeiro valuation',
      reason: 'Sem valuation a Mari não consegue projetar janela 2027 nem gap de potencial.',
      cta: 'Calcular agora',
      to: '/valuation',
    };
  }
  if (!hasListing) {
    return {
      label: 'Criar primeiro anúncio',
      reason: 'Anúncio cego ativa matching automático com os 80+ compradores da base.',
      cta: 'Anunciar empresa',
      to: '/vender',
    };
  }
  return {
    label: 'Cadastrar comprador-alvo',
    reason: 'Dobra a chance de ser sugerido em janelas de M&A da rede.',
    cta: 'Cadastrar comprador',
    to: '/cadastrar-comprador',
  };
}

export function NextActionCard(props: NextAction) {
  const action = pickAction(props);
  return (
    <div className="border border-accent/40 bg-gradient-to-br from-accent/10 to-transparent rounded-md p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        <span className="text-[10px] uppercase tracking-wider text-accent font-semibold">Próxima ação · Mari</span>
      </div>
      <h3 className="text-base font-bold text-foreground mb-1.5 leading-tight">{action.label}</h3>
      <p className="text-xs text-muted-foreground mb-3 leading-snug">{action.reason}</p>
      <Link
        to={action.to}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
      >
        {action.cta} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
