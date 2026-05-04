import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowRight, Building2, AlertTriangle, TrendingUp, TrendingDown, Minus, Info, BarChart3, Target, Rocket } from "lucide-react";
import type { WindowResult } from "@/lib/mariWindowHeuristic";
import { setMariPrefill } from "@/lib/mariPrefill";
import { useAuth } from "@/contexts/AuthContext";

export interface MariResultData {
  cnpj: string;
  razaoSocial: string | null;
  uf: string | null;
  cidade?: string | null;
  cnae: string | null;
  porte: string | null;
  window: WindowResult;
}

const TONE_ICON = {
  pos: <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />,
  neg: <TrendingDown className="h-3.5 w-3.5 text-red-500" />,
  neutral: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
};

export function MariResult({ data }: { data: MariResultData }) {
  const { razaoSocial, uf, cidade, cnae, porte, window: w, cnpj } = data;
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCadastrar = () => {
    setMariPrefill({
      cnpj,
      razaoSocial,
      uf,
      cidade: cidade ?? null,
      cnaeSection: cnae,
      porte,
      windowBase: w.base,
    });
    if (user) {
      navigate("/vender");
    } else {
      navigate(`/auth?tab=signup&role=seller&redirect=/vender&cnpj=${cnpj}`);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground break-words">
                {razaoSocial ?? "Empresa identificada"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 break-words">
                CNPJ {cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")}
                {uf ? ` · ${uf}` : ""}
                {cnae ? ` · ${cnae}` : ""}
                {porte ? ` · ${porte}` : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-baseline justify-between mb-1">
            <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              Janela de venda · 12 meses
            </h4>
            {w.abstain && (
              <Badge variant="outline" className="text-[9px] uppercase border-amber-500/50 text-amber-600">
                <AlertTriangle className="h-2.5 w-2.5 mr-1" /> Abstenção
              </Badge>
            )}
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-5xl font-bold text-foreground tabular-nums">{w.base}</span>
            <span className="text-lg text-muted-foreground">%</span>
            <span className="text-xs text-muted-foreground ml-2">probabilidade base</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3 break-words">
            Faixa: <strong className="text-foreground">{w.pessimista}%</strong> (pessimista) –{" "}
            <strong className="text-foreground">{w.otimista}%</strong> (otimista)
          </p>
          <div className="h-2 bg-muted rounded-full overflow-hidden relative">
            <div
              className="absolute inset-y-0 bg-accent/30"
              style={{ left: `${w.pessimista}%`, width: `${w.otimista - w.pessimista}%` }}
            />
            <div className="absolute inset-y-0 w-0.5 bg-accent" style={{ left: `${w.base}%` }} />
          </div>
          {w.abstain && (
            <p className="text-[11px] text-amber-600 mt-3 break-words">
              Dados públicos insuficientes pra um cálculo firme. Cadastre-se pra rodar o motor completo.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">
            Por que essa janela?
          </h4>
          <ul className="space-y-2">
            {w.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground break-words">
                <span className="mt-0.5">{TONE_ICON[r.tone]}</span>
                <span>{r.label}</span>
              </li>
            ))}
            {w.reasons.length === 0 && (
              <li className="text-xs text-muted-foreground">Sem razões fortes detectadas no recorte público.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button size="lg" className="flex-1" onClick={handleCadastrar}>
          Cadastrar minha empresa <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <Button asChild size="lg" variant="outline" className="flex-1 bg-transparent">
          <a
            href={`https://wa.me/5551992338258?text=${encodeURIComponent(
              `Oi! Calculei a janela do CNPJ ${cnpj} na Mari e quero falar com um advisor.`,
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            Falar com um advisor
          </a>
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center break-words">
        Estimativa direcional baseada em dados públicos. Não é recomendação de venda nem oferta de M&A.
      </p>
    </div>
  );
}
