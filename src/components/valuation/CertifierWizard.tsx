import { useState } from 'react';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CertificationReport } from './CertificationReport';
import { calculateValuation, sectorMultiples, type ValuationInputs } from '@/lib/valuationCalculator';
import { SECTOR_OPTIONS } from '@/lib/sectorMapping';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CertificationResult {
  presentedValue: number;
  auditedValue: number;
  deviation: number;
  classification: string;
  color: 'red' | 'orange' | 'green';
  segment: string;
}

function getClassification(deviation: number): { classification: string; color: 'red' | 'orange' | 'green' } {
  if (deviation < -30) return { classification: 'Muito Abaixo', color: 'red' };
  if (deviation < -10) return { classification: 'Abaixo', color: 'orange' };
  if (deviation <= 10) return { classification: 'Adequado', color: 'green' };
  if (deviation <= 30) return { classification: 'Acima', color: 'orange' };
  return { classification: 'Muito Acima', color: 'red' };
}

export const CertifierWizard = () => {
  const { user } = useAuth();
  const [segment, setSegment] = useState('');
  const [annualRevenue, setAnnualRevenue] = useState('');
  const [ebitdaMargin, setEbitdaMargin] = useState('');
  const [netProfitMargin, setNetProfitMargin] = useState('');
  const [presentedValue, setPresentedValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CertificationResult | null>(null);

  const segments = SECTOR_OPTIONS.map((s) => s.label);

  const parseBRL = (val: string) => {
    const cleaned = val.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const isValid = segment && annualRevenue && ebitdaMargin && netProfitMargin && presentedValue;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);

    try {
      const inputs: ValuationInputs = {
        companyType: 'Outros',
        segment,
        annualRevenue: parseBRL(annualRevenue),
        ebitdaMargin: parseFloat(ebitdaMargin) || 0,
        netProfitMargin: parseFloat(netProfitMargin) || 0,
        fullName: '',
        companyName: '',
        email: '',
        phone: '',
      };

      const valuationResult = calculateValuation(inputs);
      const auditedValue = valuationResult.mashupValue;
      const presented = parseBRL(presentedValue);
      const deviation = auditedValue > 0 ? ((presented - auditedValue) / auditedValue) * 100 : 0;
      const { classification, color } = getClassification(deviation);

      const certResult: CertificationResult = {
        presentedValue: presented,
        auditedValue,
        deviation,
        classification,
        color,
        segment,
      };

      setResult(certResult);

      // Save to valuation_history
      if (user) {
        await supabase.from('valuation_history').insert({
          user_id: user.id,
          valuation_type: 'certification',
          segment,
          inputs: inputs as any,
          result: {
            presentedValue: presented,
            auditedValue,
            deviation,
            classification,
            mashupValue: auditedValue,
          } as any,
          status: 'completed',
        });
      }
    } catch (err) {
      console.error('Certification error:', err);
      toast.error('Erro ao processar certificação.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSegment('');
    setAnnualRevenue('');
    setEbitdaMargin('');
    setNetProfitMargin('');
    setPresentedValue('');
  };

  if (result) {
    return <CertificationReport result={result} onNewCertification={handleReset} />;
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Certificador de Valuation</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Insira os dados financeiros e o valor do valuation recebido para validá-lo
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Segmento da empresa</Label>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
            <SelectContent>
              {segments.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Receita Anual (R$)</Label>
          <Input
            type="text"
            placeholder="Ex: 2.000.000"
            value={annualRevenue}
            onChange={(e) => setAnnualRevenue(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Margem EBITDA (%)</Label>
            <Input
              type="number"
              placeholder="Ex: 20"
              value={ebitdaMargin}
              onChange={(e) => setEbitdaMargin(e.target.value)}
            />
          </div>
          <div>
            <Label>Margem Lucro Líquido (%)</Label>
            <Input
              type="number"
              placeholder="Ex: 10"
              value={netProfitMargin}
              onChange={(e) => setNetProfitMargin(e.target.value)}
            />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <Label>Valor do Valuation Recebido (R$)</Label>
          <Input
            type="text"
            placeholder="Ex: 5.000.000"
            value={presentedValue}
            onChange={(e) => setPresentedValue(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Insira o valor que foi apresentado a você no valuation que deseja validar
          </p>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        className="w-full"
        disabled={!isValid || loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analisando...
          </>
        ) : (
          <>
            Certificar Valuation
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        🔒 Certificação gratuita • Resultado instantâneo
      </p>
    </div>
  );
};
