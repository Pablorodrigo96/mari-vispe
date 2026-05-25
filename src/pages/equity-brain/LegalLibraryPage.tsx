import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText, Search, ExternalLink, Eye, Download, ChevronDown, ChevronRight,
  Sparkles, Loader2, Filter,
} from "lucide-react";
import { useLegalLibrary, getDealDocumentBody, getDealDocumentSignedUrl, LibraryDoc } from "@/hooks/useLegalLibrary";
import { WordPreview } from "@/components/legal/WordPreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "all", label: "Todos os tipos" },
  { value: "nda", label: "NDA" },
  { value: "nbo", label: "NBO" },
  { value: "term_sheet", label: "Term Sheet" },
  { value: "spa", label: "SPA" },
  { value: "teaser", label: "Teaser" },
  { value: "infopack", label: "Infopack" },
  { value: "other", label: "Outros" },
];

const STATUSES = [
  { value: "all", label: "Todos os status" },
  { value: "draft", label: "Rascunho" },
  { value: "pending_signature", label: "Aguardando assinatura" },
  { value: "signed", label: "Assinado" },
  { value: "archived", label: "Arquivado" },
  { value: "uploaded", label: "Carregado" },
];

const SOURCES = [
  { value: "all", label: "Todas as origens" },
  { value: "deal_documents", label: "Gerados por IA" },
  { value: "crm_documents", label: "Uploads CRM" },
];

function statusBadge(status: string, homologation?: string | null) {
  const map: Record<string, string> = {
    draft: "bg-zinc-700/30 text-zinc-300 border-zinc-600/40",
    pending_signature: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    signed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    archived: "bg-zinc-800/60 text-zinc-500 border-zinc-700/40",
    uploaded: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  };
  const labels: Record<string, string> = {
    draft: "Rascunho",
    pending_signature: "Aguardando assinatura",
    signed: "Assinado",
    archived: "Arquivado",
    uploaded: "Carregado",
  };
  const cls = map[status] ?? "bg-zinc-700/30 text-zinc-300 border-zinc-600/40";
  let label = labels[status] ?? status;
  if (status !== "signed" && homologation && homologation !== "none") {
    if (homologation === "pending") label = "Aguardando homologação";
    else if (homologation === "approved") label = "Homologado";
    else if (homologation === "rejected") label = "Homologação rejeitada";
  }
  return (
    <span className={cn("inline-flex items-center text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border", cls)}>
      {label}
    </span>
  );
}

function categoryBadge(cat: string) {
  const map: Record<string, string> = {
    nda: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    nbo: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    term_sheet: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    spa: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  };
  const cls = map[cat] ?? "bg-zinc-700/30 text-zinc-300 border-zinc-600/40";
  return (
    <span className={cn("inline-flex items-center text-[10px] uppercase font-semibold tracking-wide px-1.5 py-0.5 rounded border", cls)}>
      {cat}
    </span>
  );
}

export default function LegalLibraryPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [clientKey, setClientKey] = useState("all");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [previewDoc, setPreviewDoc] = useState<LibraryDoc | null>(null);
  const [previewBody, setPreviewBody] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const { data, isLoading } = useLegalLibrary({ search, category, status, source, clientKey });

  const allGroups = useLegalLibrary({}); // para o dropdown de clientes (sem filtro)
  const clientOptions = useMemo(() => {
    const groups = allGroups.data?.groups ?? [];
    return [
      { value: "all", label: "Todos os clientes" },
      ...groups.map((g) => ({ value: g.key, label: g.label })),
    ];
  }, [allGroups.data]);

  const toggleGroup = (k: string) => setOpenGroups((p) => ({ ...p, [k]: !p[k] }));

  async function openPreview(doc: LibraryDoc) {
    setPreviewDoc(doc);
    setPreviewBody("");
    if (doc.source === "deal_documents" && doc.has_body) {
      setPreviewLoading(true);
      const realId = doc.id.replace(/^dd:/, "");
      const body = await getDealDocumentBody(realId);
      setPreviewBody(body ?? "_Documento sem corpo gerado._");
      setPreviewLoading(false);
    } else if (doc.source === "deal_documents" && doc.storage_path) {
      const url = await getDealDocumentSignedUrl(doc.storage_path);
      if (url) {
        window.open(url, "_blank");
        setPreviewDoc(null);
      } else {
        toast.error("Não foi possível gerar o link do arquivo.");
        setPreviewDoc(null);
      }
    } else if (doc.file_url) {
      window.open(doc.file_url, "_blank");
      setPreviewDoc(null);
    }
  }

  const groups = data?.groups ?? [];
  const totalDocs = data?.docs.length ?? 0;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#D9F564]" />
            Biblioteca de Documentos
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Todos os documentos jurídicos (NDA, NBO, Term Sheet, SPA) e uploads do CRM,
            agrupados por cliente. {totalDocs} documento(s) listado(s).
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, cliente, codinome…"
            className="w-full h-9 pl-8 pr-3 text-xs bg-zinc-950 border border-zinc-800 rounded text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
        <select value={source} onChange={(e) => setSource(e.target.value)} className="h-9 text-xs bg-zinc-950 border border-zinc-800 rounded px-2 text-zinc-100">
          {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 text-xs bg-zinc-950 border border-zinc-800 rounded px-2 text-zinc-100">
          {CATEGORIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 text-xs bg-zinc-950 border border-zinc-800 rounded px-2 text-zinc-100">
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={clientKey} onChange={(e) => setClientKey(e.target.value)} className="h-9 text-xs bg-zinc-950 border border-zinc-800 rounded px-2 text-zinc-100 max-w-[260px]">
          {clientOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {(search || category !== "all" || status !== "all" || source !== "all" || clientKey !== "all") && (
          <Button
            size="sm"
            variant="ghost"
            className="h-9 text-xs text-zinc-400 hover:text-zinc-100"
            onClick={() => { setSearch(""); setCategory("all"); setStatus("all"); setSource("all"); setClientKey("all"); }}
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-zinc-400 p-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando documentos…
        </div>
      )}

      {/* Empty */}
      {!isLoading && groups.length === 0 && (
        <div className="text-center text-sm text-zinc-400 p-12 border border-dashed border-zinc-800 rounded-lg bg-zinc-900/30">
          <FileText className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
          Nenhum documento encontrado com os filtros atuais.
        </div>
      )}

      {/* Lista agrupada */}
      <div className="space-y-3">
        {groups.map((g) => {
          const isOpen = openGroups[g.key] ?? true;
          return (
            <div key={g.key} className="border border-zinc-800 bg-zinc-900/40 rounded-lg overflow-hidden">
              {/* Cabeçalho do cliente */}
              <button
                onClick={() => toggleGroup(g.key)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-900/80 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                  <div className="min-w-0 text-left">
                    <div className="text-sm font-semibold text-zinc-100 break-words">{g.label}</div>
                    {g.subtitle && (
                      <div className="text-[11px] text-zinc-500 mt-0.5">{g.subtitle}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                    {g.docs.length} doc{g.docs.length !== 1 ? "s" : ""}
                  </span>
                  {g.deal_pair_id && (
                    <Link
                      to={`/equity-brain/par/${g.deal_pair_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] text-[#D9F564] hover:underline inline-flex items-center gap-1"
                    >
                      Abrir par <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-zinc-800 divide-y divide-zinc-800/70">
                  {g.docs.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900/60">
                      <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-zinc-100 break-words">
                          {d.label}
                          {d.version_number ? (
                            <span className="text-[10px] text-zinc-500 ml-1.5">v{d.version_number}</span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {categoryBadge(d.category)}
                          {statusBadge(d.status, d.homologation_status)}
                          {d.source === "deal_documents" && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                              <Sparkles className="h-2.5 w-2.5 text-[#D9F564]" />
                              IA
                              {d.ai_model ? ` · ${d.ai_model}` : ""}
                              {typeof d.critique_score === "number" ? ` · score ${d.critique_score.toFixed(1)}` : ""}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-500">
                            · {new Date(d.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-zinc-300 hover:text-zinc-100"
                          onClick={() => openPreview(d)}
                          title="Visualizar"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                        </Button>
                        {d.source === "deal_documents" && d.storage_path && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-zinc-400 hover:text-zinc-100"
                            onClick={async () => {
                              const url = await getDealDocumentSignedUrl(d.storage_path!);
                              if (url) window.open(url, "_blank");
                              else toast.error("Falha ao gerar link.");
                            }}
                            title="Baixar"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal preview Word */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => { if (!o) setPreviewDoc(null); }}>
        <DialogContent className="dark bg-zinc-950 border-zinc-800 max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2 break-words">
              <FileText className="h-4 w-4 text-[#D9F564]" />
              {previewDoc?.label}
            </DialogTitle>
            {previewDoc && (
              <div className="text-[11px] text-zinc-500">
                Cliente: <span className="text-zinc-300">{previewDoc.client_label}</span>
              </div>
            )}
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400 p-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando conteúdo…
            </div>
          ) : previewBody ? (
            <WordPreview body={previewBody} title={previewDoc?.label} />
          ) : (
            <div className="text-xs text-zinc-400 p-6 text-center">Sem conteúdo para visualizar.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
