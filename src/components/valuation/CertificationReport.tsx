import { ShieldCheck, TrendingDown, TrendingUp, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface CertificationResult {
  presentedValue: number;
  auditedValue: number;
  deviation: number;
  classification: string;
  color: 'red' | 'orange' | 'green';
  segment: string;
}

interface CertificationReportProps {
  result: CertificationResult;
  onNewCertification: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const classificationConfig = {
  'Muito Abaixo': { icon: XCircle, colorClass: 'text-red-500', bgClass: 'bg-red-500/10', borderClass: 'border-red-500/30' },
  'Abaixo': { icon: TrendingDown, colorClass: 'text-orange-500', bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500/30' },
  'Adequado': { icon: CheckCircle, colorClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/30' },
  'Acima': { icon: TrendingUp, colorClass: 'text-orange-500', bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500/30' },
  'Muito Acima': { icon: AlertTriangle, colorClass: 'text-red-500', bgClass: 'bg-red-500/10', borderClass: 'border-red-500/30' },
};

export const CertificationReport = ({ result, onNewCertification }: CertificationReportProps) => {
  const config = classificationConfig[result.classification as keyof typeof classificationConfig] || classificationConfig['Adequado'];
  const Icon = config.icon;

  // Progress bar: map deviation from -50..+50 to 0..100
  const progressValue = Math.min(100, Math.max(0, ((result.deviation + 50) / 100) * 100));

  return (
    <div className="space-y-6">
      {/* Main Classification */}
      <div className={`rounded-2xl border-2 ${config.borderClass} ${config.bgClass} p-6 text-center`}>
        <Icon className={`w-12 h-12 mx-auto mb-3 ${config.colorClass}`} />
        <h2 className="text-2xl font-bold text-foreground mb-1">{result.classification}</h2>
        <p className="text-muted-foreground text-sm">
          Desvio de <span className={`font-semibold ${config.colorClass}`}>{result.deviation > 0 ? '+' : ''}{result.deviation.toFixed(1)}%</span> em relação ao valor auditado
        </p>
      </div>

      {/* Deviation Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Muito Abaixo</span>
          <span>Adequado</span>
          <span>Muito Acima</span>
        </div>
        <Progress value={progressValue} className="h-3" />
      </div>

      {/* Values Comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Valor Apresentado</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(result.presentedValue)}</p>
        </div>
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Valor Auditado (Múltiplos)</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(result.auditedValue)}</p>
        </div>
      </div>

      {/* Interpretation */}
      <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Interpretação
        </p>
        {result.classification === 'Adequado' && (
          <p>O valuation apresentado está dentro da faixa esperada para o segmento <strong>{result.segment}</strong>, com base nos múltiplos de mercado brasileiro. O valor está coerente com as práticas do setor.</p>
        )}
        {(result.classification === 'Abaixo' || result.classification === 'Muito Abaixo') && (
          <p>O valuation apresentado está <strong>abaixo</strong> do valor calculado pelos múltiplos de mercado para o segmento <strong>{result.segment}</strong>. Isso pode indicar uma subvalorização da empresa ou condições específicas não capturadas pelos múltiplos.</p>
        )}
        {(result.classification === 'Acima' || result.classification === 'Muito Acima') && (
          <p>O valuation apresentado está <strong>acima</strong> do valor calculado pelos múltiplos de mercado para o segmento <strong>{result.segment}</strong>. Pode haver fatores específicos que justifiquem o prêmio, mas é recomendável uma análise mais detalhada.</p>
        )}
      </div>

      <Button onClick={onNewCertification} variant="outline" className="w-full">
        Nova Certificação
      </Button>
    </div>
  );
};
