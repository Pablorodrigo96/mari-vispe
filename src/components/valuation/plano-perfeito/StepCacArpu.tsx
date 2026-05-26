import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Users } from 'lucide-react';

interface Props {
  cac: number;
  arpu: number;
  churnPercent: number; // 0..100
  onChangeCac: (v: number) => void;
  onChangeArpu: (v: number) => void;
  onChangeChurn: (v: number) => void;
}

const formatBRL = (n: number) => (n > 0 ? n.toLocaleString('pt-BR') : '');

export const StepCacArpu = ({ cac, arpu, churnPercent, onChangeCac, onChangeArpu, onChangeChurn }: Props) => {
  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent mb-3">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Aquisição e ticket médio</h3>
          <p className="text-sm text-muted-foreground mt-1">Essas premissas calibram seu plano.</p>
        </div>

        {/* CAC */}
        <div className="space-y-2">
          <Label htmlFor="cac" className="font-semibold flex items-center gap-1.5">
            CAC (Custo de Aquisição por Cliente)
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button"><Info className="h-3.5 w-3.5 text-muted-foreground" /></button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Quanto sua empresa gasta, em média, para conquistar 1 cliente novo
                (marketing + comercial dividido pelo nº de novos clientes do período).
              </TooltipContent>
            </Tooltip>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
            <Input
              id="cac"
              inputMode="numeric"
              value={formatBRL(cac)}
              onChange={(e) => {
                const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
                onChangeCac(isNaN(n) ? 0 : n);
              }}
              placeholder="Ex: 1.500"
              className="pl-10 h-12 text-lg"
            />
          </div>
        </div>

        {/* ARPU */}
        <div className="space-y-2">
          <Label htmlFor="arpu" className="font-semibold flex items-center gap-1.5">
            Ticket médio anual por cliente (ARPU)
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button"><Info className="h-3.5 w-3.5 text-muted-foreground" /></button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Receita média que cada cliente gera por ano para sua empresa.
              </TooltipContent>
            </Tooltip>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
            <Input
              id="arpu"
              inputMode="numeric"
              value={formatBRL(arpu)}
              onChange={(e) => {
                const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
                onChangeArpu(isNaN(n) ? 0 : n);
              }}
              placeholder="Ex: 6.000"
              className="pl-10 h-12 text-lg"
            />
          </div>
        </div>

        {/* Churn (premissa avançada) */}
        <details className="rounded-xl border border-border bg-card/50 p-4">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            Ajustar premissas avançadas (churn)
          </summary>
          <div className="mt-4 space-y-2">
            <Label htmlFor="churn" className="font-semibold">Churn anual (%)</Label>
            <div className="relative">
              <Input
                id="churn"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={churnPercent}
                onChange={(e) => onChangeChurn(parseFloat(e.target.value) || 0)}
                placeholder="5"
                className="pr-10 h-11"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Percentual de clientes que sua empresa perde por ano. Default: 5%.
            </p>
          </div>
        </details>
      </div>
    </TooltipProvider>
  );
};
