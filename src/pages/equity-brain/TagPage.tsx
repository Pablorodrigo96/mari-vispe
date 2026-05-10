import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Users, Building2, ChevronRight, Tag as TagIcon, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNotesByTag } from "@/hooks/useNotesByTag";
import { useTopTags } from "@/hooks/useTopTags";
import { unslugTag, tagSlug, tagParts, normalizeTag } from "@/lib/eb/tagHierarchy";
import { TagChip } from "@/components/equity-brain/notes/TagChip";
import { NoteRenderer } from "@/components/equity-brain/notes/NoteRenderer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EntityNote } from "@/hooks/useEntityNotes";

const SOURCE_META: Record<string, { Icon: any; color: string; route: (id: string) => string; label: string }> = {
  mandate: { Icon: Briefcase, color: "text-emerald-300", route: (id) => `/equity-brain/mandato/${id}`, label: "Mandato" },
  buyer_ma: { Icon: Users, color: "text-violet-300", route: (id) => `/equity-brain/buyer/${id}`, label: "Buyer" },
  company: { Icon: Building2, color: "text-amber-300", route: (id) => `/equity-brain/empresa/${id}`, label: "Empresa" },
  daily: { Icon: FileText, color: "text-zinc-300", route: (id) => `/equity-brain/diario/${id}`, label: "Diário" },
};

function useEntityLabels(notes: EntityNote[]) {
  const ids = useMemo(() => {
    const out = { mandate: new Set<string>(), buyer_ma: new Set<string>(), company: new Set<string>() };
    for (const n of notes) {
      if (n.entity_type === "mandate") out.mandate.add(n.entity_id);
      else if (n.entity_type === "buyer_ma") out.buyer_ma.add(n.entity_id);
      else if (n.entity_type === "company") out.company.add(n.entity_id);
    }
    return out;
  }, [notes]);

  return useQuery({
    enabled: notes.length > 0,
    queryKey: ["eb-tag-entity-labels", Array.from(ids.mandate), Array.from(ids.buyer_ma), Array.from(ids.company)],
    staleTime: 60_000,
    queryFn: async () => {
      const map: Record<string, string> = {};
      const tasks: Promise<void>[] = [];
      if (ids.mandate.size > 0) {
        tasks.push(
          (async () => {
            const { data } = await supabase
              .from("eb_mandates_enriched" as any)
              .select("id, razao_social, codename")
              .in("id", Array.from(ids.mandate));
            (data as any[] | null)?.forEach((r) => {
              map[`mandate:${r.id}`] = r.razao_social || r.codename || r.id.slice(0, 8);
            });
          })(),
        );
      }
      if (ids.buyer_ma.size > 0) {
        tasks.push(
          (async () => {
            const { data } = await supabase
              .from("eb_buyers_enriched" as any)
              .select("id, nome")
              .in("id", Array.from(ids.buyer_ma));
            (data as any[] | null)?.forEach((r) => {
              map[`buyer_ma:${r.id}`] = r.nome || r.id.slice(0, 8);
            });
          })(),
        );
      }
      if (ids.company.size > 0) {
        tasks.push(
          (async () => {
            const { data } = await supabase
              .from("eb_companies_enriched" as any)
              .select("cnpj, razao_social, nome_fantasia")
              .in("cnpj", Array.from(ids.company));
            (data as any[] | null)?.forEach((r) => {
              map[`company:${r.cnpj}`] = r.nome_fantasia || r.razao_social || r.cnpj;
            });
          })(),
        );
      }
      await Promise.all(tasks);
      return map;
    },
  });
}

export default function TagPage() {
  const params = useParams<{ slug: string }>();
  const tag = normalizeTag(unslugTag(params.slug ?? ""));
  const [includeDesc, setIncludeDesc] = useState(true);
  const [tab, setTab] = useState<"notes" | "entities" | "subtags">("notes");

  const { data: notes = [], isLoading } = useNotesByTag(tag, includeDesc, 100);
  const { data: labels = {} } = useEntityLabels(notes);
  const { data: allTopTags = [] } = useTopTags("mine", 365, 200);

  const parts = tagParts(tag);
  const breadcrumbs = useMemo(() => {
    const out: { label: string; tag: string }[] = [];
    for (let i = 1; i <= parts.length; i++) {
      const built = parts.slice(0, i).join("/");
      out.push({ label: parts[i - 1], tag: built });
    }
    return out;
  }, [parts]);

  // sub-tags = top tags starting with `${tag}/` (direct children only)
  const subtags = useMemo(() => {
    if (!tag) return [];
    const prefix = `${tag}/`;
    const map = new Map<string, number>();
    for (const r of allTopTags) {
      if (!r.tag.startsWith(prefix)) continue;
      const rest = r.tag.slice(prefix.length);
      const child = rest.split("/")[0];
      if (!child) continue;
      const full = `${tag}/${child}`;
      map.set(full, (map.get(full) || 0) + r.count);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([t, count]) => ({ tag: t, count }));
  }, [allTopTags, tag]);

  // Group entities (distinct from notes)
  const entities = useMemo(() => {
    const out = { mandate: new Map<string, number>(), buyer_ma: new Map<string, number>(), company: new Map<string, number>() };
    for (const n of notes) {
      if ((n.entity_type as string) === "daily") continue;
      const bucket = (out as any)[n.entity_type] as Map<string, number> | undefined;
      if (!bucket) continue;
      bucket.set(n.entity_id, (bucket.get(n.entity_id) || 0) + 1);
    }
    return out;
  }, [notes]);

  const totalEntities = entities.mandate.size + entities.buyer_ma.size + entities.company.size;

  if (!tag) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 p-6">
        <div className="text-sm text-zinc-400">Tag inválida.</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <TagIcon className="h-5 w-5 text-[#D9F564]" />
          <h1 className="text-xl font-semibold tracking-tight break-words">
            <span className="text-zinc-500">#</span>
            {tag}
          </h1>
          <Badge variant="outline" className="bg-transparent border-zinc-700 text-zinc-400 text-[10px]">
            {notes.length} {notes.length === 1 ? "nota" : "notas"}
          </Badge>
          <Badge variant="outline" className="bg-transparent border-zinc-700 text-zinc-400 text-[10px]">
            {totalEntities} {totalEntities === 1 ? "entidade" : "entidades"}
          </Badge>
        </div>

        {breadcrumbs.length > 1 && (
          <div className="flex items-center gap-1 mt-2 text-[11px] text-zinc-500 flex-wrap">
            {breadcrumbs.map((b, i) => (
              <span key={b.tag} className="inline-flex items-center gap-1">
                <Link
                  to={`/equity-brain/tag/${tagSlug(b.tag)}`}
                  className={cn(
                    "hover:text-zinc-200 transition-colors",
                    i === breadcrumbs.length - 1 && "text-zinc-300",
                  )}
                >
                  {b.label}
                </Link>
                {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3 text-zinc-700" />}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 mt-3">
          <label className="inline-flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer">
            <Switch checked={includeDesc} onCheckedChange={setIncludeDesc} />
            Incluir sub-tags
          </label>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-zinc-900/60 border border-zinc-800">
          <TabsTrigger value="notes" className="text-xs">Notas ({notes.length})</TabsTrigger>
          <TabsTrigger value="entities" className="text-xs">Entidades ({totalEntities})</TabsTrigger>
          <TabsTrigger value="subtags" className="text-xs">Sub-tags ({subtags.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-4">
          {isLoading ? (
            <div className="text-xs text-zinc-500">Carregando notas…</div>
          ) : notes.length === 0 ? (
            <div className="text-xs text-zinc-500 italic px-2 py-12 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded">
              Nenhuma nota usa essa tag ainda.
              <div className="text-[10px] text-zinc-600 mt-1">
                Adicione <span className="font-mono text-zinc-400">{tag}</span> ao campo de tags de qualquer nota para indexar aqui.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((n) => {
                const meta = SOURCE_META[n.entity_type] ?? SOURCE_META.company;
                const Icon = meta.Icon;
                const label = labels[`${n.entity_type}:${n.entity_id}`] ?? n.entity_id.slice(0, 12);
                return (
                  <div key={n.id} className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Link
                        to={meta.route(n.entity_id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded border bg-transparent transition-colors hover:bg-zinc-800/60",
                          meta.color,
                          "border-zinc-700 hover:border-zinc-500",
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        <span className="uppercase text-[9px] tracking-wider opacity-70">{meta.label}</span>
                        <span className="text-zinc-200 max-w-[200px] truncate">{label}</span>
                      </Link>
                      {n.title && <span className="text-sm font-semibold text-zinc-100 break-words">{n.title}</span>}
                      <span className="ml-auto text-[10px] text-zinc-500">
                        {new Date(n.updated_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-300 break-words">
                      <NoteRenderer body={n.body_md.slice(0, 320) + (n.body_md.length > 320 ? "…" : "")} />
                    </div>
                    {n.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {n.tags.map((t) => (
                          <TagChip key={t} tag={t} size="xs" />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="entities" className="mt-4 space-y-4">
          {(["mandate", "buyer_ma", "company"] as const).map((kind) => {
            const map = entities[kind];
            if (map.size === 0) return null;
            const meta = SOURCE_META[kind];
            const Icon = meta.Icon;
            return (
              <div key={kind}>
                <div className={cn("flex items-center gap-2 mb-2 text-xs uppercase tracking-wider", meta.color)}>
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}s · {map.size}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Array.from(map.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([id, count]) => {
                      const label = labels[`${kind}:${id}`] ?? id.slice(0, 12);
                      return (
                        <Link
                          key={id}
                          to={meta.route(id)}
                          className="rounded border border-zinc-800 bg-zinc-900/40 hover:border-zinc-600 transition-colors p-3 flex items-center gap-2"
                        >
                          <Icon className={cn("h-4 w-4", meta.color)} />
                          <span className="text-sm text-zinc-200 truncate flex-1">{label}</span>
                          <span className="text-[10px] text-zinc-500 tabular-nums">{count} {count === 1 ? "nota" : "notas"}</span>
                        </Link>
                      );
                    })}
                </div>
              </div>
            );
          })}
          {totalEntities === 0 && (
            <div className="text-xs text-zinc-500 italic px-2 py-8 text-center">
              Nenhuma entidade vinculada a essa tag ainda.
            </div>
          )}
        </TabsContent>

        <TabsContent value="subtags" className="mt-4">
          {subtags.length === 0 ? (
            <div className="text-xs text-zinc-500 italic px-2 py-8 text-center">
              Sem sub-tags para <span className="font-mono">{tag}</span>.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subtags.map((s) => (
                <Link
                  key={s.tag}
                  to={`/equity-brain/tag/${tagSlug(s.tag)}`}
                  className="inline-flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/40 hover:border-zinc-600 px-3 py-1.5 transition-colors"
                >
                  <TagIcon className="h-3 w-3 text-zinc-500" />
                  <span className="text-xs text-zinc-200">{s.tag}</span>
                  <span className="text-[10px] text-zinc-500 tabular-nums">{s.count}</span>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
