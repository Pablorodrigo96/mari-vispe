import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Loader2, Calculator, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmtMM = (v: number | null | undefined) =>
  v == null ? "—" : `R$ ${Number(v).toFixed(2)} MM`;

interface Proposal {
  id: string;
  mandate_id: string;
  buyer_id: string | null;
  label: string | null;
  vista_brl_mm: number | null;
  earn_out_brl_mm: number | null;
  earn_out_prazo_meses: number | null;
  earn_out_metricas: string | null;
  escrow_brl_mm: number | null;
  escrow_prazo_meses: number | null;
  parcelamento_brl_mm: number | null;
  parcelamento_prazo_meses: number | null;
  acoes_brl_mm: number | null;
  acoes_lockup_meses: number | null;
  acoes_ticker: string | null;
  non_compete_anos: number | null;
  lockup_operacional_meses: number | null;
  garantias_pessoais_brl_mm: number | null;
  vpl_ajustado_brl_mm: number | null;
  vpl_breakdown: any;
  vpl_assumptions: any;
}

const ASSUMPTIONS = [
  { k: "Custo de capital do vendedor", v: "15% a.a." },
  { k: "Probabilidade de earn-out integral", v: "55%" },
  { k: "Probabilidade de retorno do escrow", v: "70%" },
  { k: "Desconto de liquidez para ações", v: "25%" },
  { k: "Probabilidade de garantias acionadas", v: "30%" },
];

export default function PropostasPage() {
  const { id: mandateId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Proposal> | null>(null);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const { data: mandate } = useQuery({
    queryKey: ["proposals-mandate", mandateId],
    queryFn: async () => {
      const { data } = await supabase
        .schema("equity_brain" as any)
        .from("mandates")
        .select("id, razao_social, nome_fantasia, company_cnpj, comprador_nome")
        .eq("id", mandateId!)
        .maybeSingle();
      return data;
    },
    enabled: !!mandateId,
  });

  const { data: proposals = [], refetch } = useQuery({
    queryKey: ["proposals", mandateId],
    queryFn: async () => {
      const { data } = await supabase
        .schema("equity_brain" as any)
        .from("transaction_proposals")
        .select("*")
        .eq("mandate_id", mandateId!)
        .order("created_at", { ascending: true });
      return (data ?? []) as Proposal[];
    },
    enabled: !!mandateId,
  });

  const save = useMutation({
    mutationFn: async (p: Partial<Proposal>) => {
      const payload: any = { ...p, mandate_id: mandateId };
      delete payload.vpl_ajustado_brl_mm;
      delete payload.vpl_breakdown;
      delete payload.vpl_assumptions;
      if (p.id) {
        const { error } = await supabase.schema("equity_brain" as any)
          .from("transaction_proposals").update(payload).eq("id", p.id);
        if (error) throw error;
        return p.id;
      } else {
        const { data, error } = await supabase.schema("equity_brain" as any)
          .from("transaction_proposals").insert(payload).select("id").single();
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: async (id) => {
      // Calcular VPL automaticamente após salvar
      const { error } = await supabase.functions.invoke("calculate-vpl-proposal", { body: { proposal_id: id } });
      if (error) toast.error("VPL não calculado: " + error.message);
      else toast.success("Proposta salva e VPL calculado");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["proposals", mandateId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const recalc = useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await supabase.functions.invoke("calculate-vpl-proposal", { body: { proposal_id: proposalId } });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("VPL recalculado"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const bestId = proposals.reduce<string | null>((best, p) => {
    if (p.vpl_ajustado_brl_mm == null) return best;
    if (!best) return p.id;
    const b = proposals.find(x => x.id === best);
    return Number(p.vpl_ajustado_brl_mm) > Number(b?.vpl_ajustado_brl_mm ?? -Infinity) ? p.id : best;
  }, null);

  const empresaName = mandate?.razao_social ?? mandate?.nome_fantasia ?? mandate?.company_cnpj ?? "—";

  return (
    <div className="p-6 space-y-4 bg-zinc-950 min-h-full">
      <Link to={`/equity-brain/crm/mandate/${mandateId}`} className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="h-3 w-3" /> Voltar ao mandato
      </Link>

      <header className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Comparação de propostas</h1>
          <p className="text-sm text-zinc-400 mt-1 break-words">{empresaName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800"
            onClick={() => setShowAssumptions(true)}>
            <Info className="h-3.5 w-3.5 mr-1.5" /> Premissas usadas
          </Button>
          <Button size="sm" className="bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90"
            onClick={() => setEditing({ label: `Proposta ${String.fromCharCode(65 + proposals.length)}` })}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova proposta
          </Button>
        </div>
      </header>

      {proposals.length === 0 ? (
        <div className="text-sm text-zinc-500 border border-dashed border-zinc-800 rounded-lg p-8 text-center">
          Nenhuma proposta cadastrada. Clique em <strong>Nova proposta</strong> para começar.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs uppercase tracking-wider text-zinc-500 py-2 px-3 sticky left-0 bg-zinc-950">Componente</th>
                {proposals.map((p) => (
                  <th key={p.id}
                    className={cn(
                      "text-left py-2 px-3 min-w-[200px]",
                      p.id === bestId && "bg-[#D9F564]/5 border-x border-[#D9F564]/40"
                    )}>
                    <div className="text-sm font-bold text-zinc-100">{p.label ?? "—"}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">{p.id === bestId ? "★ Melhor VPL" : ""}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              <Row label="Valor nominal" cells={proposals.map(p => fmtMM(
                Number(p.vista_brl_mm ?? 0) + Number(p.earn_out_brl_mm ?? 0) + Number(p.escrow_brl_mm ?? 0) +
                Number(p.parcelamento_brl_mm ?? 0) + Number(p.acoes_brl_mm ?? 0)
              ))} bestId={bestId} ids={proposals.map(p => p.id)} />
              <Section label="Componentes" />
              <Row label="À vista" cells={proposals.map(p => fmtMM(p.vista_brl_mm))} bestId={bestId} ids={proposals.map(p => p.id)} />
              <Row label="Earn-out (nominal)" cells={proposals.map(p => fmtMM(p.earn_out_brl_mm))} bestId={bestId} ids={proposals.map(p => p.id)} />
              <Row label="Earn-out ajustado" muted cells={proposals.map(p => fmtMM(p.vpl_breakdown?.earn_out_ajustado))} bestId={bestId} ids={proposals.map(p => p.id)} />
              <Row label="Escrow (nominal)" cells={proposals.map(p => fmtMM(p.escrow_brl_mm))} bestId={bestId} ids={proposals.map(p => p.id)} />
              <Row label="Escrow ajustado" muted cells={proposals.map(p => fmtMM(p.vpl_breakdown?.escrow_ajustado))} bestId={bestId} ids={proposals.map(p => p.id)} />
              <Row label="Parcelamento" cells={proposals.map(p => fmtMM(p.parcelamento_brl_mm))} bestId={bestId} ids={proposals.map(p => p.id)} />
              <Row label="Ações (nominal)" cells={proposals.map(p => fmtMM(p.acoes_brl_mm))} bestId={bestId} ids={proposals.map(p => p.id)} />
              <Row label="Ações ajustado" muted cells={proposals.map(p => fmtMM(p.vpl_breakdown?.acoes_ajustado))} bestId={bestId} ids={proposals.map(p => p.id)} />
              <Section label="Custos implícitos" />
              <Row label="Non-compete" cells={proposals.map(p => fmtMM(p.vpl_breakdown?.custo_non_compete))} bestId={bestId} ids={proposals.map(p => p.id)} />
              <Row label="Lockup operacional" cells={proposals.map(p => fmtMM(p.vpl_breakdown?.custo_lockup))} bestId={bestId} ids={proposals.map(p => p.id)} />
              <Row label="Garantias pessoais" cells={proposals.map(p => fmtMM(p.vpl_breakdown?.custo_garantias))} bestId={bestId} ids={proposals.map(p => p.id)} />
              <tr className="border-t-2 border-[#D9F564]/30">
                <td className="py-3 px-3 text-sm font-bold text-[#D9F564] sticky left-0 bg-zinc-950">▶ VPL AJUSTADO</td>
                {proposals.map((p) => (
                  <td key={p.id}
                    className={cn(
                      "py-3 px-3 text-base font-bold tabular-nums",
                      p.id === bestId ? "bg-[#D9F564]/10 text-[#D9F564] border-x border-[#D9F564]/40" : "text-zinc-200"
                    )}>
                    {fmtMM(p.vpl_ajustado_brl_mm)}
                    {p.id === bestId && <span className="ml-2 text-[10px]">← MELHOR</span>}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-xs text-zinc-500 sticky left-0 bg-zinc-950">Ações</td>
                {proposals.map((p) => (
                  <td key={p.id} className="py-2 px-3">
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent border-zinc-700 text-zinc-200"
                        onClick={() => setEditing(p)}>Editar</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent border-zinc-700 text-zinc-200"
                        disabled={recalc.isPending} onClick={() => recalc.mutate(p.id)}>
                        {recalc.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Calculator className="h-3 w-3" />}
                      </Button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer edição */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="dark bg-zinc-950 border-zinc-800 text-zinc-100 w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-zinc-100">{editing?.id ? "Editar proposta" : "Nova proposta"}</SheetTitle>
          </SheetHeader>
          {editing && <ProposalForm value={editing} onChange={setEditing} onSubmit={() => save.mutate(editing)} loading={save.isPending} />}
        </SheetContent>
      </Sheet>

      <Dialog open={showAssumptions} onOpenChange={setShowAssumptions}>
        <DialogContent className="dark bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Premissas usadas no cálculo do VPL</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {ASSUMPTIONS.map((a) => (
              <div key={a.k} className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-400">{a.k}</span>
                <span className="font-mono text-zinc-100">{a.v}</span>
              </div>
            ))}
            <p className="text-xs text-zinc-500 pt-2">
              Premissas calibradas pela mesa Vispe. Edição manual disponível em fases futuras.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={99} className="text-[10px] uppercase tracking-wider text-zinc-500 pt-3 pb-1 px-3 sticky left-0 bg-zinc-950">
        {label}
      </td>
    </tr>
  );
}

function Row({ label, cells, muted, bestId, ids }: { label: string; cells: string[]; muted?: boolean; bestId: string | null; ids: string[] }) {
  return (
    <tr className="hover:bg-zinc-900/30">
      <td className={cn("py-1.5 px-3 sticky left-0 bg-zinc-950", muted ? "text-xs text-zinc-500 italic" : "text-xs text-zinc-300")}>{label}</td>
      {cells.map((c, i) => (
        <td key={i} className={cn(
          "py-1.5 px-3 text-sm tabular-nums",
          muted ? "text-zinc-500 italic" : "text-zinc-200",
          ids[i] === bestId && "bg-[#D9F564]/5 border-x border-[#D9F564]/40"
        )}>{c}</td>
      ))}
    </tr>
  );
}

function num(v: any): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function ProposalForm({ value, onChange, onSubmit, loading }: {
  value: Partial<Proposal>; onChange: (v: Partial<Proposal>) => void; onSubmit: () => void; loading: boolean;
}) {
  const set = (k: keyof Proposal, v: any) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-4 py-4">
      <Field label="Label da proposta">
        <Input value={value.label ?? ""} onChange={(e) => set("label", e.target.value)}
          placeholder="Ex: Proposta A, Oferta inicial"
          className="bg-zinc-900 border-zinc-800 text-zinc-100" />
      </Field>

      <FieldGroup label="À vista">
        <Field label="Valor (R$ MM)">
          <Input type="number" step="0.01" value={value.vista_brl_mm ?? ""} onChange={(e) => set("vista_brl_mm", num(e.target.value))}
            className="bg-zinc-900 border-zinc-800 text-zinc-100" />
        </Field>
      </FieldGroup>

      <FieldGroup label="Earn-out">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Valor (R$ MM)">
            <Input type="number" step="0.01" value={value.earn_out_brl_mm ?? ""} onChange={(e) => set("earn_out_brl_mm", num(e.target.value))} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
          </Field>
          <Field label="Prazo (meses)">
            <Input type="number" value={value.earn_out_prazo_meses ?? ""} onChange={(e) => set("earn_out_prazo_meses", num(e.target.value))} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
          </Field>
        </div>
        <Field label="Métricas">
          <Input value={value.earn_out_metricas ?? ""} onChange={(e) => set("earn_out_metricas", e.target.value)}
            placeholder="Ex: EBITDA 2026 ≥ R$ 12MM" className="bg-zinc-900 border-zinc-800 text-zinc-100" />
        </Field>
      </FieldGroup>

      <FieldGroup label="Escrow">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Valor (R$ MM)">
            <Input type="number" step="0.01" value={value.escrow_brl_mm ?? ""} onChange={(e) => set("escrow_brl_mm", num(e.target.value))} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
          </Field>
          <Field label="Prazo (meses)">
            <Input type="number" value={value.escrow_prazo_meses ?? ""} onChange={(e) => set("escrow_prazo_meses", num(e.target.value))} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup label="Parcelamento">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Valor (R$ MM)">
            <Input type="number" step="0.01" value={value.parcelamento_brl_mm ?? ""} onChange={(e) => set("parcelamento_brl_mm", num(e.target.value))} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
          </Field>
          <Field label="Prazo (meses)">
            <Input type="number" value={value.parcelamento_prazo_meses ?? ""} onChange={(e) => set("parcelamento_prazo_meses", num(e.target.value))} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup label="Ações">
        <div className="grid grid-cols-3 gap-2">
          <Field label="Valor (R$ MM)">
            <Input type="number" step="0.01" value={value.acoes_brl_mm ?? ""} onChange={(e) => set("acoes_brl_mm", num(e.target.value))} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
          </Field>
          <Field label="Lockup (m)">
            <Input type="number" value={value.acoes_lockup_meses ?? ""} onChange={(e) => set("acoes_lockup_meses", num(e.target.value))} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
          </Field>
          <Field label="Ticker">
            <Input value={value.acoes_ticker ?? ""} onChange={(e) => set("acoes_ticker", e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup label="Cláusulas">
        <div className="grid grid-cols-3 gap-2">
          <Field label="Non-compete (anos)">
            <Input type="number" value={value.non_compete_anos ?? ""} onChange={(e) => set("non_compete_anos", num(e.target.value))} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
          </Field>
          <Field label="Lockup oper. (m)">
            <Input type="number" value={value.lockup_operacional_meses ?? ""} onChange={(e) => set("lockup_operacional_meses", num(e.target.value))} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
          </Field>
          <Field label="Garantias (R$ MM)">
            <Input type="number" step="0.01" value={value.garantias_pessoais_brl_mm ?? ""} onChange={(e) => set("garantias_pessoais_brl_mm", num(e.target.value))} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
          </Field>
        </div>
      </FieldGroup>

      <Button disabled={loading} onClick={onSubmit} className="w-full bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90">
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
        Salvar e calcular VPL
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-zinc-400">{label}</Label>
      {children}
    </div>
  );
}
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-zinc-800 rounded-lg p-3 space-y-2 bg-zinc-900/30">
      <div className="text-[10px] uppercase tracking-wider text-[#D9F564]">{label}</div>
      {children}
    </div>
  );
}
