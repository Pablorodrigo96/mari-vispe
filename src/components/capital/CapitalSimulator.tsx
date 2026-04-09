import { useState } from 'react';
import { ArrowRight, ArrowLeft, TrendingUp, Shield, Clock, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatFullCurrency } from '@/lib/formatters';
import { calculateCapitalScore, type SimulatorInputs, type ScoringResult } from '@/lib/capitalScoring';

const sectorOptions = [
  { value: 'tech', label: 'Tecnologia' },
  { value: 'commerce', label: 'Comércio' },
  { value: 'industry', label: 'Indústria' },
  { value: 'services', label: 'Serviços' },
  { value: 'food', label: 'Alimentação' },
  { value: 'health', label: 'Saúde' },
  { value: 'education', label: 'Educação' },
  { value: 'logistics', label: 'Logística' },
  { value: 'telecom', label: 'Telecomunicações' },
  { value: 'energy', label: 'Energia' },
  { value: 'construction', label: 'Construção Civil' },
  { value: 'agro', label: 'Agronegócio' },
];

const revenueOptions = [
  { value: 'ate-50k', label: 'Até R$ 50 mil' },
  { value: '50k-200k', label: 'R$ 50 mil — R$ 200 mil' },
  { value: '200k-500k', label: 'R$ 200 mil — R$ 500 mil' },
  { value: '500k-1m', label: 'R$ 500 mil — R$ 1 milhão' },
  { value: 'acima-1m', label: 'Acima de R$ 1 milhão' },
];

const ageOptions = [
  { value: '<1', label: 'Menos de 1 ano' },
  { value: '1-3', label: '1 a 3 anos' },
  { value: '3-5', label: '3 a 5 anos' },
  { value: '5-10', label: '5 a 10 anos' },
  { value: '10+', label: 'Mais de 10 anos' },
];

const objectiveOptions = [
  { value: 'giro', label: 'Capital de Giro', desc: 'Fluxo de caixa e operação' },
  { value: 'expansao', label: 'Expansão', desc: 'Crescer unidades ou mercado' },
  { value: 'refinanciamento', label: 'Refinanciamento', desc: 'Trocar dívida cara por barata' },
  { value: 'socio', label: 'Busca de Sócio / Equity', desc: 'Vender participação societária' },
];

interface CapitalSimulatorProps {
  onResult: (inputs: SimulatorInputs, result: ScoringResult) => void;
}

export function CapitalSimulator({ onResult }: CapitalSimulatorProps) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState(500000);
  const [monthlyRevenue, setMonthlyRevenue] = useState('');
  const [sector, setSector] = useState('');
  const [companyAge, setCompanyAge] = useState('');
  const [objective, setObjective] = useState('');
  const [result, setResult] = useState<ScoringResult | null>(null);

  const handleAmountInput = (val: string) => {
    const num = parseInt(val.replace(/\D/g, ''));
    if (!isNaN(num)) setAmount(Math.min(5000000, Math.max(10000, num)));
  };

  const canNext = () => {
    if (step === 1) return amount >= 10000;
    if (step === 2) return monthlyRevenue && sector && companyAge;
    if (step === 3) return !!objective;
    return false;
  };

  const handleSimulate = () => {
    const inputs: SimulatorInputs = { amount, monthlyRevenue, sector, companyAge, objective };
    const scoring = calculateCapitalScore(inputs);
    setResult(scoring);
    onResult(inputs, scoring);
  };

  const scoreColor = (score: number) => {
    if (score > 80) return 'text-emerald-500';
    if (score > 60) return 'text-amber-500';
    return 'text-orange-500';
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 lg:p-8 shadow-lg">
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              s < step || result ? 'bg-accent text-accent-foreground' : s === step && !result ? 'bg-accent/20 text-accent border-2 border-accent' : 'bg-muted text-muted-foreground'
            }`}>
              {s < step || result ? <CheckCircle2 className="w-4 h-4" /> : s}
            </div>
            {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-accent' : 'bg-border'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {result ? 'Resultado' : `Passo ${step} de 3`}
        </span>
      </div>

      {!result ? (
        <>
          {/* Step 1: Amount */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <Label className="text-base font-semibold">Quanto você precisa captar?</Label>
                <p className="text-sm text-muted-foreground mt-1">Arraste o slider ou digite o valor</p>
              </div>
              <div className="text-center">
                <span className="text-4xl font-bold text-accent">{formatFullCurrency(amount)}</span>
              </div>
              <Slider
                value={[amount]}
                onValueChange={(v) => setAmount(v[0])}
                min={10000}
                max={5000000}
                step={10000}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>R$ 10 mil</span>
                <span>R$ 5 milhões</span>
              </div>
              <Input
                value={formatFullCurrency(amount)}
                onChange={(e) => handleAmountInput(e.target.value)}
                className="text-center text-lg font-semibold"
              />
            </div>
          )}

          {/* Step 2: Company info */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <Label className="text-base font-semibold">Sobre sua empresa</Label>
                <p className="text-sm text-muted-foreground mt-1">Dados para calcular seu score de aprovação</p>
              </div>
              <div>
                <Label>Faturamento Mensal</Label>
                <Select value={monthlyRevenue} onValueChange={setMonthlyRevenue}>
                  <SelectTrigger><SelectValue placeholder="Selecione a faixa" /></SelectTrigger>
                  <SelectContent>
                    {revenueOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Setor de Atuação</Label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                  <SelectContent>
                    {sectorOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tempo de Empresa</Label>
                <Select value={companyAge} onValueChange={setCompanyAge}>
                  <SelectTrigger><SelectValue placeholder="Há quanto tempo opera?" /></SelectTrigger>
                  <SelectContent>
                    {ageOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Objective */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <Label className="text-base font-semibold">Qual o objetivo da captação?</Label>
                <p className="text-sm text-muted-foreground mt-1">Isso define o tipo de instrumento ideal</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {objectiveOptions.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setObjective(o.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      objective === o.value
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-accent/30'
                    }`}
                  >
                    <span className="font-semibold text-foreground">{o.label}</span>
                    <p className="text-xs text-muted-foreground mt-1">{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
            ) : <div />}
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Próximo <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSimulate} disabled={!canNext()} className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold">
                <Zap className="w-4 h-4 mr-2" /> Ver minha simulação
              </Button>
            )}
          </div>
        </>
      ) : (
        /* Result card */
        <div className="space-y-6 animate-fade-in">
          <div className="text-center">
            <Badge variant="outline" className="mb-3 text-accent border-accent">Resultado da Simulação</Badge>
            <h3 className="text-2xl font-bold text-foreground">
              {result.isEquity ? 'Captação via Equity' : 'Captação via Crédito'}
            </h3>
            <p className="text-muted-foreground">Para {formatFullCurrency(amount)}</p>
          </div>

          {/* Score */}
          <div className="bg-muted/50 rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Score de Aprovação</p>
            <div className={`text-5xl font-black ${scoreColor(result.score)}`}>{result.score}%</div>
            <p className={`text-sm font-semibold mt-1 ${scoreColor(result.score)}`}>{result.scoreLabel}</p>
            <Progress value={result.score} className="mt-3 h-3" />
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="text-xs text-muted-foreground">{result.isEquity ? 'Participação' : 'Taxa Estimada'}</span>
              </div>
              <p className="font-bold text-foreground">{result.isEquity ? result.equityRange : result.rateRange}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-accent" />
                <span className="text-xs text-muted-foreground">{result.isEquity ? 'Prazo da Rodada' : 'Prazo'}</span>
              </div>
              <p className="font-bold text-foreground">{result.termMonths}</p>
            </div>
          </div>

          {/* Instruments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">
                {result.isEquity ? 'Tipos de investidor compatíveis' : 'Linhas de crédito compatíveis'}
              </span>
            </div>
            <div className="space-y-2">
              {result.instruments.map((inst, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {inst}
                </div>
              ))}
            </div>
          </div>

          <Button variant="outline" onClick={() => { setResult(null); setStep(1); }} className="w-full">
            Refazer simulação
          </Button>
        </div>
      )}
    </div>
  );
}
