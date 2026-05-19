import { useRef, useState } from "react";
import { FileText, Upload, FileCheck2, FileSignature, Archive, Loader2, ExternalLink, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useDealDocuments,
  useStageDocRequirements,
  useUploadDealDocument,
  useArchiveDealDocument,
  useRequestSignature,
  useSimulateSign,
  getSignedUrl,
  type DealDocument,
} from "@/hooks/useDealDocuments";
import { useUserRoles } from "@/hooks/useUserRoles";

interface Props {
  dealId: string;
  stageKey: string;
}

const STATUS_LABEL: Record<DealDocument["status"], string> = {
  draft: "Rascunho",
  pending_signature: "Aguardando assinatura",
  signed: "Assinado",
  archived: "Arquivado",
};

const STATUS_CLS: Record<DealDocument["status"], string> = {
  draft: "bg-zinc-700/40 text-zinc-300 border-zinc-600",
  pending_signature: "bg-amber-500/15 text-amber-300 border-amber-700/40",
  signed: "bg-emerald-500/15 text-emerald-300 border-emerald-700/40",
  archived: "bg-zinc-800 text-zinc-500 border-zinc-700",
};

export function StageDocumentsPanel({ dealId, stageKey }: Props) {
  const reqs = useStageDocRequirements(stageKey);
  const docs = useDealDocuments(dealId, stageKey);
  const upload = useUploadDealDocument(dealId);
  const archive = useArchiveDealDocument(dealId);
  const requestSig = useRequestSignature(dealId);
  const simulateSign = useSimulateSign(dealId);
  const { isAdmin, canEditEB, isReadOnly } = useUserRoles();
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allDocs = docs.data ?? [];
  const requirements = reqs.data ?? [];

  const docByTemplate = (code: string) =>
    allDocs.find((d) => d.template_code === code && d.status !== "archived");

  const openDoc = async (path: string | null) => {
    if (!path) return;
    const url = await getSignedUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast.error("Não consegui gerar a URL do arquivo");
  };

  const onPickFile = (templateCode: string | null) => {
    setPendingTemplate(templateCode);
    fileInputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const tplCode = pendingTemplate;
    const tplReq = requirements.find((r) => r.template_code === tplCode);
    try {
      await upload.mutateAsync({
        file,
        label: tplReq?.template?.label ?? file.name,
        category: tplReq?.template?.category ?? "other",
        stageKey,
        templateCode: tplCode,
      });
      toast.success("Documento anexado");
    } catch (err: any) {
      toast.error(err?.message ?? "Falha no upload");
    } finally {
      setPendingTemplate(null);
    }
  };

  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 inline-flex items-center gap-1">
          <FileText className="h-3 w-3 text-[#D9F564]" /> Documentos desta etapa
        </div>
        {canEditEB && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPickFile(null)}
            disabled={upload.isPending}
            className="h-7 bg-transparent text-[11px]"
          >
            <Upload className="h-3 w-3 mr-1" /> Anexar livre
          </Button>
        )}
        {isReadOnly && (
          <span className="text-[10px] text-zinc-500">somente leitura</span>
        )}
      </div>

      <input ref={fileInputRef} type="file" hidden onChange={handleFile} />

      {/* Requisitos */}
      <ul className="space-y-1.5">
        {reqs.isLoading && (
          <li className="text-xs text-muted-foreground">Carregando requisitos…</li>
        )}
        {!reqs.isLoading && requirements.length === 0 && (
          <li className="text-xs text-muted-foreground">Nenhum requisito definido para esta etapa.</li>
        )}
        {requirements.map((r) => {
          const doc = docByTemplate(r.template_code);
          const hasIt = !!doc;
          return (
            <li
              key={r.id}
              className={cn(
                "flex items-start gap-2 rounded-md px-2 py-2 transition-colors border",
                hasIt ? "border-zinc-800 bg-zinc-900/40" : "border-zinc-800 bg-zinc-900/20",
              )}
            >
              <FileCheck2 className={cn("size-4 mt-0.5 shrink-0", hasIt ? "text-emerald-400" : "text-zinc-600")} />
              <div className="flex-1 min-w-0">
                <div className="text-sm break-words text-zinc-100 inline-flex items-center gap-1">
                  {r.template?.label ?? r.template_code}
                  {r.is_blocking && !hasIt && (
                    <Lock className="size-3 text-amber-400/80" aria-label="Bloqueante" />
                  )}
                  {r.template?.requires_signature && (
                    <ShieldCheck className="size-3 text-blue-300/80" aria-label="Requer assinatura" />
                  )}
                </div>
                {r.template?.description && (
                  <div className="text-[10px] text-muted-foreground mt-0.5 break-words">
                    {r.template.description}
                  </div>
                )}
                {doc && (
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", STATUS_CLS[doc.status])}>
                      {STATUS_LABEL[doc.status]}
                    </span>
                    {doc.storage_path && (
                      <button
                        type="button"
                        onClick={() => openDoc(doc.storage_path)}
                        className="text-[10px] text-[#D9F564] inline-flex items-center gap-0.5 hover:underline"
                      >
                        abrir <ExternalLink className="size-2.5" />
                      </button>
                    )}
                    {doc.signing_url && doc.status === "pending_signature" && (
                      <a
                        href={doc.signing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-amber-300 inline-flex items-center gap-0.5 hover:underline"
                      >
                        link assinatura <ExternalLink className="size-2.5" />
                      </a>
                    )}
                    {canEditEB && doc.status !== "signed" && doc.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => archive.mutate(doc.id)}
                        className="text-[10px] text-zinc-500 hover:text-rose-300 inline-flex items-center gap-0.5"
                      >
                        <Archive className="size-2.5" /> arquivar
                      </button>
                    )}
                    {canEditEB && doc.status === "draft" && r.template?.requires_signature && (
                      <button
                        type="button"
                        disabled={requestSig.isPending}
                        onClick={() =>
                          requestSig.mutateAsync(doc.id).then(
                            () => toast.success("Pedido de assinatura enviado (mock)"),
                            (err: any) => toast.error(err?.message ?? "Falha"),
                          )
                        }
                        className="text-[10px] text-blue-300 hover:underline inline-flex items-center gap-0.5"
                      >
                        <FileSignature className="size-2.5" /> pedir assinatura
                      </button>
                    )}
                    {isAdmin && doc.status === "pending_signature" && (
                      <button
                        type="button"
                        disabled={simulateSign.isPending}
                        onClick={() =>
                          simulateSign.mutateAsync(doc.id).then(
                            () => toast.success("Assinatura simulada"),
                            (err: any) => toast.error(err?.message ?? "Falha"),
                          )
                        }
                        className="text-[10px] text-emerald-300 hover:underline inline-flex items-center gap-0.5"
                      >
                        ✓ simular assinatura (admin)
                      </button>
                    )}
                  </div>
                )}
              </div>
              {canEditEB && !hasIt && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPickFile(r.template_code)}
                  disabled={upload.isPending}
                  className="h-7 bg-transparent text-[10px] shrink-0"
                >
                  {upload.isPending && pendingTemplate === r.template_code ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <>
                      <Upload className="size-3 mr-1" /> anexar
                    </>
                  )}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Outros docs (não vinculados a requisito) */}
      {allDocs.filter((d) => !d.template_code || !requirements.find((r) => r.template_code === d.template_code)).length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1.5">Outros documentos</div>
          <ul className="space-y-1">
            {allDocs
              .filter((d) => !d.template_code || !requirements.find((r) => r.template_code === d.template_code))
              .filter((d) => d.status !== "archived")
              .map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-[11px] text-zinc-300">
                  <FileText className="size-3 text-zinc-500" />
                  <span className="flex-1 truncate break-words">{d.label}</span>
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", STATUS_CLS[d.status])}>
                    {STATUS_LABEL[d.status]}
                  </span>
                  {d.storage_path && (
                    <button
                      type="button"
                      onClick={() => openDoc(d.storage_path)}
                      className="text-[#D9F564] hover:underline"
                    >
                      abrir
                    </button>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
