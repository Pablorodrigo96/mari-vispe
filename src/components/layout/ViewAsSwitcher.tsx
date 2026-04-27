import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useViewAs, PERSONA_LABELS, ViewAsPersona } from '@/contexts/ViewAsContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { cn } from '@/lib/utils';

const PERSONAS: ViewAsPersona[] = [
  'real',
  'admin',
  'head_parcerias',
  'bdr',
  'parceiro',
  'consultor',
  'franqueado',
  'seller',
  'buyer',
  'visitante',
];

interface Props {
  isTransparent?: boolean;
}

export function ViewAsSwitcher({ isTransparent }: Props) {
  const { isAdmin } = useUserRoles();
  const { viewAs, setViewAs } = useViewAs();

  if (!isAdmin) return null;

  const isViewing = viewAs !== 'real';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-2 text-xs',
            isTransparent && 'text-white hover:bg-white/10',
            isViewing && 'border border-amber-500/50 bg-amber-500/10 text-amber-600'
          )}
        >
          <Eye className="h-3.5 w-3.5" />
          {isViewing ? PERSONA_LABELS[viewAs] : 'Visualizar como…'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">Persona de visualização</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PERSONAS.map((p) => (
          <DropdownMenuItem
            key={p}
            onClick={() => setViewAs(p)}
            className={cn(
              'text-sm',
              viewAs === p && 'bg-accent/20 font-semibold'
            )}
          >
            {PERSONA_LABELS[p]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ViewAsBanner() {
  const { viewAs, resetViewAs } = useViewAs();
  const { isAdmin } = useUserRoles();

  if (!isAdmin || viewAs === 'real') return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-amber-950 text-xs font-medium py-1.5 px-4 flex items-center justify-center gap-3 shadow-md">
      <Eye className="h-3.5 w-3.5" />
      <span>Visualizando como <strong>{PERSONA_LABELS[viewAs].replace('Como ', '')}</strong> — UI simulada, permissões reais inalteradas.</span>
      <button
        onClick={resetViewAs}
        className="underline hover:no-underline font-semibold"
      >
        Voltar à visão real
      </button>
    </div>
  );
}
