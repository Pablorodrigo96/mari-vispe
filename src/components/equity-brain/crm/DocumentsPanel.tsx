import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, ExternalLink, Tag } from "lucide-react";
import { toast } from "sonner";
import { useLogActivity } from "@/hooks/useCrm";
import { useCompanyListing } from "@/hooks/useCompanyListing";
import { useAutoLogIdentityAccess } from "@/hooks/useLogIdentityAccess";
import { relativeTime } from "@/lib/equityBrain";
import { cn } from "@/lib/utils";

type Source = "crm" | "vdr" | "cadastro";

type UnifiedDoc = {
  id: string;
  source: Source;
  kind: string;
  version?: number | null;
  file_url: string;
  file_name: string | null;
  created_at: string;
  status?: string | null;
};

const KINDS = [
  { value: "nda", label: "NDA" },
  { value: "teaser", label: "Teaser" },
  { value: "infopack", label: "Infopack" },
  { value: "other", label: "Outro" },
];

const SOURCE_META: Record<Source, { label: string; cls: string }> = {
  crm: { label: "CRM", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  vdr: { label: "VDR Marketplace", cls: "bg-sky-500/10 text-sky-300 border-sky-500/30" },
  cadastro: { label: "Cadastro / Contador", cls: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
};

interface Props {
  entityType: "mandate" | "buyer";
  entityId: string;
  /**
   * Quando informado, agrega documentos vindos do marketplace
   * (vdr_documents + listing_financial_docs) da listing vinculada ao CNPJ.
   */
  companyContext?: { cnpj?: string | null };
}

export function DocumentsPanel({ entityType, entityId, companyContext }: Props) {
  const [docs, setDocs] = useState<UnifiedDoc[]>([]);
  const [filter, setFilter] = useState<"all" | Source>("all");
  const [kind, setKind] = useState("teaser");
  const [uploading, setUploading] = useState(false);
  const log = useLogActivity();

  const cnpj = companyContext?.cnpj ?? null;
  const { data: listing } = useCompanyListing(cnpj);

  // Auto-log: ver documentos com identidade real conta como "implicit disclosure"
  useAutoLogIdentityAccess({
    enabled: !!cnpj,
    entityType,
    entityId,
    cnpj,
    context: "docs_panel",
  });

  async function load() {
    const out: UnifiedDoc[] = [];

    // 1. CRM docs (sempre)
    const crm = await supabase
      .schema("equity_brain" as any)
      .from("crm_documents" as any)
      .select("id, doc_kind, version, file_url, file_name, created_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });
    if (!crm.error && crm.data) {
      for (const d of crm.data as any[]) {
        out.push({
          id: `crm:${d.id}`,
          source: "crm",
          kind: d.doc_kind,
          version: d.version,
          file_url: d.file_url,
          file_name: d.file_name,
          created_at: d.created_at,
        });
      }
    }

    // 2 + 3. Marketplace (apenas se houver listing)
    if (listing?.id) {
      const [vdr, fin] = await Promise.all([
        supabase
          .from("vdr_documents")
          .select("id, doc_name, doc_category, file_url, status, created_at")
          .eq("listing_id", listing.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("listing_financial_docs")
          .select("id, file_name, file_type, file_url, status, created_at")
          .eq("listing_id", listing.id)
          .order("created_at", { ascending: false }),
      ]);
      if (!vdr.error && vdr.data) {
        for (const d of vdr.data as any[]) {
          out.push({
            id: `vdr:${d.id}`,
            source: "vdr",
            kind: d.doc_category ?? "vdr",
            file_url: d.file_url,
            file_name: d.doc_name,
            status: d.status,
            created_at: d.created_at,
          });
        }
      }
      if (!fin.error && fin.data) {
        for (const d of fin.data as any[]) {
          out.push({
            id: `cad:${d.id}`,
            source: "cadastro",
            kind: d.file_type ?? "financeiro",
            file_url: d.file_url,
            file_name: d.file_name,
            status: d.status,
            created_at: d.created_at,
          });
        }
      }
    }

    out.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    setDocs(out);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, entityType, listing?.id]);

  const filtered = useMemo(
    () => (filter === "all" ? docs : docs.filter((d) => d.source === filter)),
    [docs, filter],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: docs.length, crm: 0, vdr: 0, cadastro: 0 };
    for (const d of docs) c[d.source]++;
    return c;
  }, [docs]);

  async function handleUpload(file: File) {
    try {
      setUploading(true);
      const path = `${entityType}/${entityId}/${kind}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("crm-docs").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("crm-docs")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      const file_url = signed.data?.signedUrl ?? path;

      const sameKind = docs.filter((d) => d.source === "crm" && d.kind === kind);
      const nextVersion = (sameKind[0]?.version ?? 0) + 1;

      const { data: u } = await supabase.auth.getUser();
      const ins = await supabase
        .schema("equity_brain" as any)
        .from("crm_documents" as any)
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          doc_kind: kind,
          version: nextVersion,
          file_url,
          file_name: file.name,
          uploaded_by: u.user?.id,
        })
        .select()
        .single();
      if (ins.error) throw ins.error;

      log.mutate({
        entity_type: entityType,
        entity_id: entityId,
        kind: "note",
        direction: "system",
        body: `Documento ${kind.toUpperCase()} v${nextVersion} carregado: ${file.name}`,
        metadata: { doc_kind: kind, version: nextVersion },
      });

      toast.success("Documento carregado");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 border border-zinc-800 bg-zinc-900/40 rounded">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="h-9 text-xs bg-zinc-950 border border-zinc-800 rounded px-2 text-zinc-100"
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <label className="flex-1">
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
          <span className="inline-flex items-center justify-center w-full h-9 text-xs border border-dashed border-zinc-700 rounded bg-zinc-950 text-zinc-300 cursor-pointer hover:bg-zinc-900">
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            {uploading ? "Enviando…" : "Adicionar documento ao CRM"}
          </span>
        </label>
      </div>

      {/* Filtros por origem */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "crm", "vdr", "cadastro"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "text-[11px] px-2.5 py-1 rounded border transition-colors",
              filter === f
                ? "border-[#D9F564]/50 bg-[#D9F564]/10 text-[#D9F564]"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100",
            )}
          >
            {f === "all" ? "Todos" : SOURCE_META[f].label}{" "}
            <span className="text-zinc-500">· {counts[f] ?? 0}</span>
          </button>
        ))}
        {cnpj && !listing && (
          <span className="text-[10px] text-zinc-500 ml-2">
            Empresa sem listing no marketplace — apenas docs do CRM disponíveis.
          </span>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="text-xs text-zinc-400 p-4 text-center bg-zinc-900/40 border border-zinc-800 rounded">
          Nenhum documento nesta origem.
        </div>
      )}

      {filtered.map((d) => {
        const meta = SOURCE_META[d.source];
        return (
          <div
            key={d.id}
            className="flex items-center gap-3 p-3 border border-zinc-800 bg-zinc-900/40 rounded"
          >
            <FileText className="h-4 w-4 text-zinc-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-zinc-100 break-words">
                {d.file_name ?? d.file_url}
                {d.version != null && (
                  <span className="text-[10px] text-zinc-500 ml-1">v{d.version}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border",
                    meta.cls,
                  )}
                >
                  <Tag className="h-2.5 w-2.5" /> {meta.label}
                </span>
                <span className="text-[10px] text-zinc-500 uppercase">{d.kind}</span>
                {d.status && (
                  <span className="text-[10px] text-zinc-500">· {d.status}</span>
                )}
                <span className="text-[10px] text-zinc-500">· {relativeTime(d.created_at)}</span>
              </div>
            </div>
            <a
              href={d.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 hover:text-emerald-300"
              title="Abrir documento"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        );
      })}
    </div>
  );
}
