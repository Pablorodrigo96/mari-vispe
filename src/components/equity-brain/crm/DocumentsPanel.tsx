import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Upload, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useLogActivity } from "@/hooks/useCrm";
import { relativeTime } from "@/lib/equityBrain";

type Doc = {
  id: string;
  doc_kind: string;
  version: number;
  file_url: string;
  file_name: string | null;
  created_at: string;
};

const KINDS = [
  { value: "nda", label: "NDA" },
  { value: "teaser", label: "Teaser" },
  { value: "infopack", label: "Infopack" },
  { value: "other", label: "Outro" },
];

export function DocumentsPanel({
  entityType,
  entityId,
}: {
  entityType: "mandate" | "buyer";
  entityId: string;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [kind, setKind] = useState("teaser");
  const [uploading, setUploading] = useState(false);
  const log = useLogActivity();

  async function load() {
    const { data, error } = await supabase
      .schema("equity_brain" as any)
      .from("crm_documents" as any)
      .select("id, doc_kind, version, file_url, file_name, created_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });
    if (!error) setDocs((data ?? []) as Doc[]);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [entityId, entityType]);

  async function handleUpload(file: File) {
    try {
      setUploading(true);
      const path = `${entityType}/${entityId}/${kind}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("crm-docs").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("crm-docs").createSignedUrl(path, 60 * 60 * 24 * 7);
      const file_url = signed.data?.signedUrl ?? path;

      // version = max(version)+1 for this kind
      const sameKind = docs.filter(d => d.doc_kind === kind);
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
        <select value={kind} onChange={(e) => setKind(e.target.value)}
          className="h-9 text-xs bg-zinc-950 border border-zinc-800 rounded px-2 text-zinc-100">
          {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <label className="flex-1">
          <input type="file" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0]; if (f) handleUpload(f);
          }} />
          <span className="inline-flex items-center justify-center w-full h-9 text-xs border border-dashed border-zinc-700 rounded bg-zinc-950 text-zinc-300 cursor-pointer hover:bg-zinc-900">
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            {uploading ? "Enviando…" : "Selecionar arquivo"}
          </span>
        </label>
      </div>

      {docs.length === 0 && (
        <div className="text-xs text-zinc-400 p-4 text-center bg-zinc-900/40 border border-zinc-800 rounded">
          Nenhum documento ainda.
        </div>
      )}

      {docs.map((d) => (
        <div key={d.id} className="flex items-center gap-3 p-3 border border-zinc-800 bg-zinc-900/40 rounded">
          <FileText className="h-4 w-4 text-zinc-300" />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-zinc-100 break-words">
              {d.file_name ?? d.file_url} <span className="text-[10px] text-zinc-500">v{d.version}</span>
            </div>
            <div className="text-[10px] text-zinc-500 uppercase">{d.doc_kind} · {relativeTime(d.created_at)}</div>
          </div>
          <a href={d.file_url} target="_blank" rel="noopener noreferrer"
             className="text-zinc-300 hover:text-emerald-300">
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      ))}
    </div>
  );
}
