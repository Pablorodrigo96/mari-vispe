import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, FileText, CheckCircle2, AlertCircle, Trash2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Doc {
  id: string;
  file_name: string;
  doc_type: string | null;
  extraction_status: string;
  extraction_summary: string | null;
  extraction_error: string | null;
  created_at: string;
}

interface Props {
  assessmentId: string | null;
  companyId?: string | null;
  /** Called whenever a document finishes extraction (so caller can re-run compute). */
  onExtracted?: (doc: Doc) => void;
  compact?: boolean;
}

const DOC_TYPES = [
  { value: "balanco", label: "Balanço Patrimonial" },
  { value: "dre", label: "DRE" },
  { value: "contrato_cliente", label: "Contrato com cliente" },
  { value: "contrato_socios", label: "Contrato social / acordo de sócios" },
  { value: "organograma", label: "Organograma" },
  { value: "diagnostico_reuniao", label: "Diagnóstico de reunião" },
  { value: "outro", label: "Outro" },
];

export default function EquityDocsUpload({ assessmentId, companyId, onExtracted, compact }: Props) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("outro");

  const load = async () => {
    if (!user || !assessmentId) return;
    const { data } = await supabase
      .from("equity_company_documents")
      .select("id, file_name, doc_type, extraction_status, extraction_summary, extraction_error, created_at")
      .eq("user_id", user.id)
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: false });
    setDocs((data as Doc[]) || []);
  };

  useEffect(() => { load(); }, [assessmentId, user?.id]);

  const handleFile = async (file: File) => {
    if (!user || !assessmentId) {
      toast.error("Crie/identifique o diagnóstico antes de anexar documentos.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo > 20MB. Resuma ou divida.");
      return;
    }
    setUploading(true);
    try {
      const path = `${user.id}/${assessmentId}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const up = await supabase.storage.from("equity-planner-docs").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || "application/octet-stream",
      });
      if (up.error) throw up.error;
      const { data: row, error: insErr } = await supabase
        .from("equity_company_documents")
        .insert({
          user_id: user.id,
          company_id: companyId || null,
          assessment_id: assessmentId,
          file_name: file.name,
          file_path: path,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          doc_type: docType,
          extraction_status: "pending",
        })
        .select()
        .single();
      if (insErr) throw insErr;
      toast.success("Arquivo enviado. Rodando IA…");
      await load();

      // Fire extraction (don't await UI)
      const { data: ext, error: eErr } = await supabase.functions.invoke("equity-planner-extract", {
        body: { documentId: row.id },
      });
      if (eErr || ext?.error) {
        toast.error("Falha na extração: " + (eErr?.message || ext?.error));
      } else {
        toast.success("Documento extraído ✔");
        onExtracted?.(row as Doc);
      }
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error("Falha no upload: " + (e?.message || "erro"));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (d: Doc) => {
    if (!confirm("Remover este documento?")) return;
    await supabase.from("equity_company_documents").delete().eq("id", d.id);
    await load();
  };

  return (
    <Card className={`!bg-slate-900/60 backdrop-blur-md border-volt/10 ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-volt" /> Documentos da empresa
          </h3>
          <p className="text-xs text-muted-foreground">PDF, CSV ou texto. A IA extrai os dados e enriquece o diagnóstico.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="bg-background border border-input rounded-md text-xs p-1.5"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            disabled={uploading}
          >
            {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-volt/30 bg-volt/10 text-volt text-sm cursor-pointer hover:bg-volt/20 ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Anexar
            <input
              type="file"
              accept=".pdf,.txt,.csv,.xlsx,.xls,.docx"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {docs.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-volt/15 rounded">
          Sem documentos ainda — opcional, mas turbina a precisão do diagnóstico.
        </p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="p-3 rounded border border-volt/10 bg-slate-950/40">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {d.extraction_status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                    {d.extraction_status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-volt" />}
                    {d.extraction_status === "pending" && <Sparkles className="h-3.5 w-3.5 text-volt/70" />}
                    {d.extraction_status === "error" && <AlertCircle className="h-3.5 w-3.5 text-rose-400" />}
                    <span className="text-sm font-medium break-words">{d.file_name}</span>
                    {d.doc_type && <Badge variant="outline" className="text-[10px] border-volt/30 text-volt">{d.doc_type}</Badge>}
                  </div>
                  {d.extraction_summary && (
                    <p className="text-xs text-muted-foreground mt-1.5 break-words border-l-2 border-volt/30 pl-2">
                      {d.extraction_summary}
                    </p>
                  )}
                  {d.extraction_error && (
                    <p className="text-xs text-rose-400 mt-1 break-words">{d.extraction_error}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(d)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
