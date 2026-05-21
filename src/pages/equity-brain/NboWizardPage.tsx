import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDealPair } from "@/hooks/useDealPairs";
import {
  useNboDraft,
  useNboAutoSave,
  useGenerateNboFromDraft,
} from "@/hooks/useNboDraft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Sparkles, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

const STEPS = [
  { id: 1, title: "Identificação das Partes", desc: "Vendedor e comprador" },
  { id: 2, title: "Objeto da Operação", desc: "Escopo e ativos" },
  { id: 3, title: "Preço e Condições", desc: "Valor + forma de pagamento" },
  { id: 4, title: "Estrutura da Transação", desc: "Modelo do deal" },
  { id: 5, title: "Condicionantes", desc: "DD, regulatórias, financiamento" },
  { id: 6, title: "Exclusividade & Timeline", desc: "Prazo e multa" },
  { id: 7, title: "Revisão & Geração", desc: "Foro, data e IA" },
];

const TODAY_ISO = () => new Date().toISOString().slice(0, 10);

export default function NboWizardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: pair, isLoading: pairLoading } = useDealPair(id);
  const { data: draft } = useNboDraft(id);
  const generate = useGenerateNboFromDraft();

  const [step, setStep] = useState(1);
  const [payload, setPayload] = useState<Record<string, any>>({});
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from draft or seed from pair
  useEffect(() => {
    if (hydrated) return;
    if (draft) {
      setStep(draft.current_step || 1);
      setPayload(draft.payload || {});
      setHydrated(true);
    } else if (pair) {
      setPayload({
        vendedor_cnpj: pair.sell_cnpj ?? "",
        comprador_cnpj: pair.buy_cnpj ?? "",
        comprador_nome: pair.buyer_profile_company ?? pair.buyer_profile_name ?? "",
        foro_cidade: "São Paulo",
        data_assinatura: TODAY_ISO(),
        prazo_exclusividade_dias: 60,
      });
      setHydrated(true);
    }
  }, [draft, pair, hydrated]);

  const { savedAt, isSaving } = useNboAutoSave(id, step, payload, hydrated);

  const set = (k: string, v: any) => setPayload((p) => ({ ...p, [k]: v }));

  const requiredByStep: Record<number, string[]> = {
    1: ["vendedor_nome", "vendedor_cnpj", "vendedor_endereco", "vendedor_representante", "comprador_nome", "comprador_cnpj", "comprador_endereco", "comprador_representante"],
    2: ["objeto_transacao"],
    3: ["valor_total", "forma_pagamento"],
    4: [],
    5: [],
    6: ["prazo_exclusividade_dias"],
    7: ["foro_cidade", "data_assinatura"],
  };

  const missingInStep = (s: number) =>
    requiredByStep[s].filter((k) => !payload[k] && payload[k] !== 0);

  const canAdvance = missingInStep(step).length === 0;

  if (pairLoading) return <div className="p-8 text-zinc-500">Carregando…</div>;
  if (!pair) return <div className="p-8 text-zinc-500">Par não encontrado.</div>;

  const onGenerate = async () => {
    const allRequired = Object.keys(requiredByStep).flatMap((s) => requiredByStep[Number(s)]);
    const stillMissing = allRequired.filter((k) => !payload[k] && payload[k] !== 0);
    if (stillMissing.length) {
      const goto = STEPS.find((s) => requiredByStep[s.id].some((k) => stillMissing.includes(k)));
      if (goto) setStep(goto.id);
      return;
    }
    const res = await generate.mutateAsync({
      deal_pair_id: pair.id,
      custom_fields: payload,
    });
    if (res?.document?.id) {
      navigate(`/equity-brain/par/${pair.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="text-zinc-300 hover:bg-zinc-800">
          <Link to={`/equity-brain/par/${pair.id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para o par
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">NBO Wizard — Par #{pair.id.slice(0, 8)}</h1>
        <Badge className="bg-amber-600 text-white">Rascunho</Badge>
        <div className="ml-auto text-xs text-zinc-500 flex items-center gap-2">
          {isSaving ? (
            <><Save className="h-3 w-3 animate-pulse" /> Salvando…</>
          ) : savedAt ? (
            <><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Salvo {savedAt.toLocaleTimeString("pt-BR")}</>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 p-6 max-w-6xl mx-auto">
        {/* Stepper */}
        <nav className="space-y-1">
          {STEPS.map((s) => {
            const isCurrent = s.id === step;
            const isDone = s.id < step;
            const hasErrors = missingInStep(s.id).length > 0 && s.id < step;
            return (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
                  isCurrent
                    ? "border-[#D9F564] bg-[#D9F564]/10 text-zinc-100"
                    : "border-zinc-800 hover:border-zinc-700 text-zinc-400"
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    isDone
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                        ? "bg-[#D9F564] text-zinc-900"
                        : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {isDone ? "✓" : s.id}
                  </span>
                  <span className="font-medium truncate">{s.title}</span>
                  {hasErrors && <span className="ml-auto text-amber-500">!</span>}
                </div>
                <div className="text-[10px] text-zinc-500 ml-7 mt-0.5">{s.desc}</div>
              </button>
            );
          })}
        </nav>

        {/* Form */}
        <Card className="!bg-slate-900/60 backdrop-blur-md border-zinc-800 p-6">
          <h2 className="text-base font-semibold mb-1">{STEPS[step - 1].title}</h2>
          <p className="text-xs text-zinc-500 mb-5">{STEPS[step - 1].desc}</p>

          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Razão social do vendedor" required>
                <Input value={payload.vendedor_nome ?? ""} onChange={(e) => set("vendedor_nome", e.target.value)} />
              </Field>
              <Field label="CNPJ vendedor" required>
                <Input value={payload.vendedor_cnpj ?? ""} onChange={(e) => set("vendedor_cnpj", e.target.value)} />
              </Field>
              <Field label="Endereço vendedor" required className="md:col-span-2">
                <Textarea rows={2} value={payload.vendedor_endereco ?? ""} onChange={(e) => set("vendedor_endereco", e.target.value)} />
              </Field>
              <Field label="Representante vendedor" required>
                <Input value={payload.vendedor_representante ?? ""} onChange={(e) => set("vendedor_representante", e.target.value)} />
              </Field>
              <div />
              <Field label="Razão social do comprador" required>
                <Input value={payload.comprador_nome ?? ""} onChange={(e) => set("comprador_nome", e.target.value)} />
              </Field>
              <Field label="CNPJ comprador" required>
                <Input value={payload.comprador_cnpj ?? ""} onChange={(e) => set("comprador_cnpj", e.target.value)} />
              </Field>
              <Field label="Endereço comprador" required className="md:col-span-2">
                <Textarea rows={2} value={payload.comprador_endereco ?? ""} onChange={(e) => set("comprador_endereco", e.target.value)} />
              </Field>
              <Field label="Representante comprador" required>
                <Input value={payload.comprador_representante ?? ""} onChange={(e) => set("comprador_representante", e.target.value)} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Field label="Objeto da operação" required hint="Descreva % da participação, ativos incluídos/excluídos, escopo geral.">
                <Textarea rows={5} value={payload.objeto_transacao ?? ""} onChange={(e) => set("objeto_transacao", e.target.value)} />
              </Field>
              <Field label="Nº de clientes (opcional)" hint="Para ISPs/operações em base ativa">
                <Input type="number" value={payload.num_clientes ?? ""} onChange={(e) => set("num_clientes", e.target.value ? Number(e.target.value) : "")} />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Field label="Valor total (R$)" required>
                <Input value={payload.valor_total ?? ""} onChange={(e) => set("valor_total", e.target.value)} placeholder="Ex: R$ 4.500.000,00" />
              </Field>
              <Field label="Forma de pagamento" required hint="Ex: 60% à vista, 40% earn-out em 24 meses.">
                <Textarea rows={4} value={payload.forma_pagamento ?? ""} onChange={(e) => set("forma_pagamento", e.target.value)} />
              </Field>
            </div>
          )}

          {step === 4 && (
            <Field label="Estrutura da transação (opcional)" hint="Compra de quotas/ações, ativos, M&A, etc. Será incorporada ao objeto na geração final.">
              <Textarea rows={5} value={payload.estrutura ?? ""} onChange={(e) => set("estrutura", e.target.value)} />
            </Field>
          )}

          {step === 5 && (
            <Field label="Condicionantes precedentes (opcional)" hint="Due diligence, aprovações regulatórias, financiamento, etc.">
              <Textarea rows={5} value={payload.condicionantes ?? ""} onChange={(e) => set("condicionantes", e.target.value)} />
            </Field>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <Field label="Prazo de exclusividade (dias)" required>
                <Input type="number" value={payload.prazo_exclusividade_dias ?? ""} onChange={(e) => set("prazo_exclusividade_dias", Number(e.target.value))} />
              </Field>
              <Field label="Multa por descumprimento (opcional)">
                <Input value={payload.multa_exclusividade ?? ""} onChange={(e) => set("multa_exclusividade", e.target.value)} placeholder="Ex: 10% do valor proposto" />
              </Field>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Foro (cidade)" required>
                  <Input value={payload.foro_cidade ?? ""} onChange={(e) => set("foro_cidade", e.target.value)} />
                </Field>
                <Field label="Data da assinatura" required>
                  <Input type="date" value={payload.data_assinatura ?? ""} onChange={(e) => set("data_assinatura", e.target.value)} />
                </Field>
              </div>
              <div className="border border-zinc-800 rounded-md p-4 bg-zinc-950/50 text-xs text-zinc-400 space-y-1">
                <p className="font-semibold text-zinc-300">Pronto para gerar</p>
                <p>O documento será gerado via IA (Claude → Gemini fallback) usando o template oficial Vispe.</p>
                <p>Após gerado, ele entra no fluxo: rascunho → aprovação interna → homologação jurídica → assinatura eletrônica.</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex items-center gap-3 pt-4 border-t border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-zinc-700"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            {step < 7 ? (
              <Button
                size="sm"
                className="bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90 font-semibold"
                disabled={!canAdvance}
                onClick={() => setStep((s) => Math.min(7, s + 1))}
              >
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90 font-semibold"
                disabled={generate.isPending}
                onClick={onGenerate}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                {generate.isPending ? "Gerando…" : "Gerar NBO com IA"}
              </Button>
            )}
            {!canAdvance && (
              <span className="text-xs text-amber-500">
                Preencha: {missingInStep(step).join(", ")}
              </span>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-zinc-300 mb-1 block">
        {label} {required && <span className="text-amber-500">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[10px] text-zinc-500 mt-1">{hint}</p>}
    </div>
  );
}
