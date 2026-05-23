import { useEffect, useMemo, useState } from "react";
import { Loader2, FileText, ShieldCheck, Send, PenTool, Copy, Check, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  useGenerateLegalDocument,
  startBackgroundGeneration,
  useHomologations,
  useInternalSignatures,
  useLegalDocuments,
  useLegalTemplates,
  usePartnerApproveDocument,
  useRequestInternalSignatures,
  useSendHomologation,
  type LegalDocument,
  type LegalTemplateField,
} from "@/hooks/useLegalDocs";
import { useQueryClient } from "@tanstack/react-query";
import { useGenerationTracker } from "@/components/legal/GenerationTracker";
import { WordPreview } from "@/components/legal/WordPreview";

interface Props {
  dealId: string;
  triggerLabel?: string;
  initialCategory?: "nda" | "nbo" | "term_sheet" | "spa";
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  triggerless?: boolean;
}

const ROLES: { v: any; l: string }[] = [
  { v: "seller", l: "Vendedor" },
  { v: "buyer", l: "Comprador" },
  { v: "witness", l: "Testemunha" },
  { v: "advisor", l: "Advisor" },
  { v: "legal", l: "Jurídico" },
  { v: "admin", l: "Sócio" },
  { v: "partner", l: "Parceiro" },
];

export function LegalDocumentGenerator({
  dealId,
  triggerLabel = "Gerar documento jurídico",
  initialCategory = "nda",
  open: openProp,
  onOpenChange,
  triggerless = false,
}: Props) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (o: boolean) => {
    if (onOpenChange) onOpenChange(o);
    else setOpenState(o);
  };
  const [category, setCategory] = useState<string>(initialCategory);
  const { isAdmin, isAdvisor } = useUserRoles();
  const canApprove = isAdmin;
  const { data: templates = [] } = useLegalTemplates(category);
  const { data: documents = [] } = useLegalDocuments(dealId);
  const [selectedTplCode, setSelectedTplCode] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, any>>({});
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [useSelfCritique, setUseSelfCritique] = useState(false);
  const qc = useQueryClient();
  const tracker = useGenerationTracker();

  const tpl = useMemo(
    () => templates.find((t) => t.code === selectedTplCode) ?? null,
    [templates, selectedTplCode],
  );

  const docsForCategory = documents.filter((d) => d.category === category);
  const activeDoc = documents.find((d) => d.id === activeDocId) ?? docsForCategory[0] ?? null;

  function selectTemplate(code: string) {
    const t = templates.find((x) => x.code === code);
    setSelectedTplCode(code);
    const init: Record<string, any> = {};
    (t?.customizable_fields ?? []).forEach((f) => {
      init[f.key] = f.default ?? "";
    });
    setFields(init);
  }

  async function handleGenerate() {
    if (!tpl) return;
    const missing = tpl.customizable_fields.filter((f) => f.required && !fields[f.key]).map((f) => f.label);
    if (missing.length) {
      toast.error(`Preencha: ${missing.join(", ")}`);
      return;
    }
    const badCnpj = tpl.customizable_fields
      .filter((f) => f.type === "cnpj" && fields[f.key])
      .filter((f) => String(fields[f.key]).replace(/\D/g, "").length !== 14)
      .map((f) => f.label);
    if (badCnpj.length) {
      toast.error(`CNPJ inválido: ${badCnpj.join(", ")}`);
      return;
    }
    // Format currency values to "R$ x,xx" before sending to AI
    const formatted: Record<string, any> = { ...fields };
    tpl.customizable_fields.forEach((f) => {
      if (f.type === "currency" && formatted[f.key] !== "" && formatted[f.key] != null) {
        const n = Number(String(formatted[f.key]).replace(",", "."));
        if (isFinite(n)) formatted[f.key] = formatBRL(n);
      }
    });
    // Fire-and-forget background generation: tracker shows progress so the
    // user can close the modal and keep working.
    startBackgroundGeneration(qc, tracker, {
      deal_id: dealId,
      template_code: tpl.code,
      custom_fields: formatted,
      use_self_critique: useSelfCritique,
      label: tpl.label,
      category: tpl.category,
    });
    toast.success("Geração iniciada em segundo plano", {
      description: "Você pode fechar essa janela e continuar navegando. Avisamos quando ficar pronto.",
    });
    setOpen(false);
  }


  useEffect(() => {
    if (open) setCategory(initialCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCategory]);

  if (!(isAdmin || isAdvisor)) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!triggerless && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="bg-transparent gap-2">
            <FileText className="h-4 w-4" /> {triggerLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="!bg-zinc-950 border-zinc-800 max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 break-words">Documentos jurídicos do deal</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="generate" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="generate">Gerar</TabsTrigger>
            <TabsTrigger value="library">
              Biblioteca ({documents.length})
            </TabsTrigger>
            {activeDoc && <TabsTrigger value="review">Revisar / Enviar</TabsTrigger>}
          </TabsList>

          <TabsContent value="generate" className="flex-1 overflow-hidden mt-4">
            <div className="grid grid-cols-12 gap-4 h-full">
              <div className="col-span-4 space-y-3">
                <div>
                  <Label className="text-zinc-400 text-xs">Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="nda">NDA — Confidencialidade</SelectItem>
                      <SelectItem value="nbo">NBO — Carta de Intenções</SelectItem>
                      <SelectItem value="term_sheet">Term Sheet</SelectItem>
                      <SelectItem value="spa">SPA — Compra e Venda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">Template</Label>
                  <div className="space-y-1 mt-1">
                    {templates.length === 0 && (
                      <div className="text-xs text-zinc-500 p-2 border border-dashed border-zinc-800 rounded">
                        Nenhum template ativo para esta categoria ainda.
                      </div>
                    )}
                    {templates.map((t) => (
                      <button
                        key={t.code}
                        onClick={() => selectTemplate(t.code)}
                        className={`w-full text-left p-2 rounded border text-xs transition ${
                          selectedTplCode === t.code
                            ? "border-volt bg-volt/10 text-zinc-100"
                            : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <div className="font-medium break-words">{t.label}</div>
                        {t.description && (
                          <div className="text-[10px] text-zinc-500 mt-1 break-words">{t.description}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-8 overflow-hidden">
                {!tpl ? (
                  <div className="h-full grid place-items-center text-sm text-zinc-500">
                    Selecione um template para preencher os campos.
                  </div>
                ) : (
                  <ScrollArea className="h-full pr-3">
                    <div className="space-y-3">
                      {tpl.customizable_fields.map((f) => (
                        <FieldInput
                          key={f.key}
                          field={f}
                          value={fields[f.key] ?? ""}
                          onChange={(v) => setFields((s) => ({ ...s, [f.key]: v }))}
                        />
                      ))}
                      <div className="pt-2 border-t border-zinc-800">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                          Cláusulas fixas (não alteráveis)
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {tpl.static_clauses.map((c) => (
                            <Badge key={c.id} variant="outline" className="bg-transparent text-zinc-400 border-zinc-700 text-[10px]">
                              {c.title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer hover:text-zinc-300">
                          <input
                            type="checkbox"
                            checked={useSelfCritique}
                            onChange={(e) => setUseSelfCritique(e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span>Validar com auto-crítica (mais lento)</span>
                        </label>
                        <Button onClick={handleGenerate} className="w-full bg-volt text-carbon hover:bg-volt/90">
                          <FileText className="h-4 w-4 mr-2" /> Gerar em segundo plano
                        </Button>
                        <div className="text-[10px] text-zinc-500 text-center">
                          A geração roda em segundo plano — você pode fechar essa janela.
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="library" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full pr-3">
              <div className="space-y-2">
                {documents.length === 0 && (
                  <div className="text-sm text-zinc-500 text-center py-8">Nenhum documento gerado ainda.</div>
                )}
                {documents.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setActiveDocId(d.id)}
                    className="w-full text-left p-3 rounded border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm text-zinc-100 break-words">{d.label}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {new Date(d.created_at).toLocaleString("pt-BR")} • {d.ai_provider}/{d.ai_model}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <StatusBadge doc={d} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {activeDoc && (
            <TabsContent value="review" className="flex-1 overflow-hidden mt-4">
              <DocumentReviewer doc={activeDoc} dealId={dealId} canApprove={canApprove} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function detectGaps(text: string): { apreencher: number; naoInformado: number } {
  const apreencher = (text.match(/\[A PREENCHER\]/g) ?? []).length;
  const naoInformado = (text.match(/\[NÃO INFORMADO\]/g) ?? []).length;
  return { apreencher, naoInformado };
}

function maskCNPJ(v: string): string {
  const d = (v ?? "").replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
function isValidCNPJ(v: string): boolean {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length === 14;
}
function formatBRL(v: any): string {
  const n = Number(String(v ?? "").replace(/[^\d.,-]/g, "").replace(",", "."));
  if (!isFinite(n)) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function FieldInput({ field, value, onChange }: { field: LegalTemplateField; value: any; onChange: (v: any) => void }) {
  const label = (
    <Label className="text-zinc-300 text-xs">
      {field.label} {field.required && <span className="text-red-400">*</span>}
    </Label>
  );
  if (field.type === "textarea") {
    return (
      <div>
        {label}
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100 min-h-[80px]" />
      </div>
    );
  }
  if (field.type === "cnpj") {
    const masked = maskCNPJ(String(value ?? ""));
    const ok = !value || isValidCNPJ(String(value));
    return (
      <div>
        {label}
        <Input
          value={masked}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          placeholder="00.000.000/0000-00"
          className={`bg-zinc-900 border-zinc-800 text-zinc-100 ${!ok ? "border-red-500" : ""}`}
        />
        {!ok && <div className="text-[10px] text-red-400 mt-0.5">CNPJ deve ter 14 dígitos</div>}
      </div>
    );
  }
  if (field.type === "currency") {
    const preview = value !== "" && value !== null && value !== undefined ? formatBRL(value) : "";
    return (
      <div>
        {label}
        <Input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0,00"
          className="bg-zinc-900 border-zinc-800 text-zinc-100"
        />
        {preview && <div className="text-[10px] text-zinc-400 mt-0.5">{preview}</div>}
      </div>
    );
  }
  return (
    <div>
      {label}
      <Input
        type={field.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-900 border-zinc-800 text-zinc-100"
      />
    </div>
  );
}

function StatusBadge({ doc }: { doc: LegalDocument }) {
  const items: { l: string; cls: string }[] = [];
  if (doc.partner_approved_at) items.push({ l: "Sócio ✓", cls: "border-volt/40 text-volt" });
  else items.push({ l: "Aguarda sócio", cls: "border-amber-500/40 text-amber-300" });
  if (doc.homologation_status === "approved") items.push({ l: "Jurídico ✓", cls: "border-emerald-500/40 text-emerald-300" });
  else if (doc.homologation_status === "pending") items.push({ l: "Homol. pendente", cls: "border-blue-500/40 text-blue-300" });
  else if (doc.homologation_status === "rejected") items.push({ l: "Jurídico rejeitou", cls: "border-red-500/40 text-red-300" });
  if (doc.status === "signed") items.push({ l: "Assinado", cls: "border-emerald-500/40 text-emerald-300" });
  else if (doc.status === "pending_signature") items.push({ l: "Em assinatura", cls: "border-blue-500/40 text-blue-300" });
  return (
    <div className="flex flex-wrap gap-1 justify-end">
      {items.map((i, idx) => (
        <Badge key={idx} variant="outline" className={`bg-transparent text-[10px] ${i.cls}`}>{i.l}</Badge>
      ))}
    </div>
  );
}

function DocumentReviewer({ doc, dealId, canApprove }: { doc: LegalDocument; dealId: string; canApprove: boolean }) {
  const approve = usePartnerApproveDocument();
  const sendHom = useSendHomologation();
  const reqSig = useRequestInternalSignatures();
  const { data: homs = [] } = useHomologations(doc.id);
  const { data: sigs = [] } = useInternalSignatures(doc.id);

  const [partnerComments, setPartnerComments] = useState("");
  const [lawyerName, setLawyerName] = useState("");
  const [lawyerEmail, setLawyerEmail] = useState("");
  const [signers, setSigners] = useState<{ name: string; email: string; role: any }[]>([
    { name: "", email: "", role: "seller" },
    { name: "", email: "", role: "buyer" },
  ]);

  const partnerOk = !!doc.partner_approved_at;

  async function doApprove() {
    try {
      await approve.mutateAsync({ document_id: doc.id, comments: partnerComments, deal_id: dealId });
      toast.success("Documento aprovado pelo sócio.");
      setPartnerComments("");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao aprovar");
    }
  }

  async function doSendHom() {
    if (!lawyerName || !lawyerEmail) { toast.error("Preencha nome e e-mail do advogado"); return; }
    try {
      const res = await sendHom.mutateAsync({ document_id: doc.id, lawyer_name: lawyerName, lawyer_email: lawyerEmail, deal_id: dealId });
      toast.success("Homologação criada.");
      await navigator.clipboard.writeText(res.public_url).catch(() => {});
      toast.message("Link copiado para a área de transferência.");
      setLawyerName(""); setLawyerEmail("");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar");
    }
  }

  async function doRequestSigs() {
    const valid = signers.filter((s) => s.name && s.email && s.role);
    if (valid.length === 0) { toast.error("Adicione ao menos um signatário"); return; }
    try {
      await reqSig.mutateAsync({ document_id: doc.id, signers: valid, deal_id: dealId });
      toast.success(`${valid.length} link(s) de assinatura gerados.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao solicitar assinaturas");
    }
  }

  return (
    <div className="grid grid-cols-12 gap-4 h-full overflow-hidden">
      <div className="col-span-7 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-zinc-100 break-words">{doc.label}</div>
          <StatusBadge doc={doc} />
        </div>
        <ScrollArea className="flex-1 border border-zinc-800 rounded bg-zinc-900/40 p-3">
          <pre className="text-[11px] text-zinc-200 whitespace-pre-wrap font-mono break-words">{doc.generated_body}</pre>
        </ScrollArea>
      </div>

      <div className="col-span-5 overflow-hidden">
        <ScrollArea className="h-full pr-2">
          <div className="space-y-4">

            <section className="border border-zinc-800 rounded p-3 bg-zinc-900/40">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 mb-2">
                <ShieldCheck className="h-3 w-3" /> 1. Aprovação do sócio
              </div>
              {partnerOk ? (
                <div className="text-xs text-emerald-300">
                  ✓ Aprovado em {new Date(doc.partner_approved_at!).toLocaleString("pt-BR")}
                  {doc.partner_comments && <div className="text-zinc-400 mt-1 break-words">"{doc.partner_comments}"</div>}
                </div>
              ) : canApprove ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Observações (opcional)"
                    value={partnerComments}
                    onChange={(e) => setPartnerComments(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100 min-h-[60px] text-xs"
                  />
                  <Button onClick={doApprove} disabled={approve.isPending} size="sm" className="w-full bg-volt text-carbon hover:bg-volt/90">
                    {approve.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                    Aprovar como sócio
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  Apenas usuários com papel admin podem aprovar.
                </div>
              )}
            </section>

            <section className={`border border-zinc-800 rounded p-3 bg-zinc-900/40 ${!partnerOk ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 mb-2">
                <Send className="h-3 w-3" /> 2. Homologação jurídica
              </div>
              <div className="space-y-2">
                <Input placeholder="Nome do advogado" value={lawyerName} onChange={(e) => setLawyerName(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs" />
                <Input placeholder="email@escritorio.com" value={lawyerEmail} onChange={(e) => setLawyerEmail(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs" />
                <Button onClick={doSendHom} disabled={sendHom.isPending} size="sm" className="w-full" variant="outline">
                  {sendHom.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                  Gerar link de homologação
                </Button>
              </div>
              {homs.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-zinc-800 pt-2">
                  {homs.map((h) => (
                    <HomItem key={h.id} h={h} />
                  ))}
                </div>
              )}
            </section>

            <section className={`border border-zinc-800 rounded p-3 bg-zinc-900/40 ${!partnerOk ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 mb-2">
                <PenTool className="h-3 w-3" /> 3. Assinatura interna
              </div>
              <div className="space-y-2">
                {signers.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1 items-center">
                    <Input placeholder="Nome" value={s.name} onChange={(e) => setSigners((arr) => arr.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} className="col-span-4 bg-zinc-900 border-zinc-800 text-zinc-100 text-xs h-8" />
                    <Input placeholder="email" value={s.email} onChange={(e) => setSigners((arr) => arr.map((x, i) => i === idx ? { ...x, email: e.target.value } : x))} className="col-span-5 bg-zinc-900 border-zinc-800 text-zinc-100 text-xs h-8" />
                    <Select value={s.role} onValueChange={(v) => setSigners((arr) => arr.map((x, i) => i === idx ? { ...x, role: v } : x))}>
                      <SelectTrigger className="col-span-2 bg-zinc-900 border-zinc-800 text-zinc-100 text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="col-span-1 h-8" onClick={() => setSigners((arr) => arr.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-3 w-3 text-zinc-500" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => setSigners((arr) => [...arr, { name: "", email: "", role: "witness" }])}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar signatário
                </Button>
                <Button onClick={doRequestSigs} disabled={reqSig.isPending} size="sm" className="w-full bg-volt text-carbon hover:bg-volt/90">
                  {reqSig.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <PenTool className="h-3 w-3 mr-1" />}
                  Gerar links de assinatura
                </Button>
              </div>
              {sigs.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-zinc-800 pt-2">
                  {sigs.map((s) => (
                    <SigItem key={s.id} s={s} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function HomItem({ h }: { h: any }) {
  const url = `${window.location.origin}/homologacao/${h.access_token}`;
  return (
    <div className="text-[11px] text-zinc-300">
      <div className="flex items-center justify-between gap-2">
        <span className="break-words min-w-0">{h.lawyer_name} ({h.lawyer_email})</span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado"); }}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <div className="text-[10px] text-zinc-500">
        {h.decision ? `${h.decision} em ${new Date(h.decided_at).toLocaleString("pt-BR")}` : h.viewed_at ? "Visualizado" : "Aguardando"}
      </div>
      {h.comments && <div className="text-[10px] text-zinc-400 italic break-words">"{h.comments}"</div>}
    </div>
  );
}

function SigItem({ s }: { s: any }) {
  const url = `${window.location.origin}/assinar/${s.sign_token}`;
  return (
    <div className="text-[11px] text-zinc-300">
      <div className="flex items-center justify-between gap-2">
        <span className="break-words min-w-0">{s.signer_name} ({s.signer_role})</span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado"); }}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <div className="text-[10px] text-zinc-500">
        {s.signed_at ? `Assinado em ${new Date(s.signed_at).toLocaleString("pt-BR")}` : s.viewed_at ? "Visualizado" : "Aguardando"}
      </div>
    </div>
  );
}
