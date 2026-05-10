// Tag hierarchy convention: lowercase strings using `/` as separator.
// Examples: setor/saas, setor/saas/horizontal, estagio/pre-loi, prioridade/quente.

export function normalizeTag(raw: string): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-z0-9/\-]/g, "");
}

export function tagParts(tag: string): string[] {
  return normalizeTag(tag).split("/").filter(Boolean);
}

export function tagNamespace(tag: string): string | null {
  const parts = tagParts(tag);
  return parts.length > 1 ? parts[0] : null;
}

export function tagAncestors(tag: string): string[] {
  const parts = tagParts(tag);
  const out: string[] = [];
  for (let i = 1; i <= parts.length; i++) {
    out.push(parts.slice(0, i).join("/"));
  }
  return out;
}

export function tagSlug(tag: string): string {
  return normalizeTag(tag).replace(/\//g, "__");
}

export function unslugTag(slug: string): string {
  return normalizeTag((slug || "").replace(/__/g, "/"));
}

export function groupTagsByNamespace(tags: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const raw of tags) {
    const t = normalizeTag(raw);
    if (!t) continue;
    const ns = tagParts(t)[0] || "_";
    (out[ns] ||= []).push(t);
  }
  return out;
}

// Fixed namespace palette → tailwind color tokens.
export function tagColors(tag: string): { ring: string; text: string; muted: string } {
  const ns = tagParts(tag)[0] || "";
  switch (ns) {
    case "setor":
      return { ring: "border-cyan-500/30", text: "text-cyan-200", muted: "text-cyan-500/70" };
    case "estagio":
      return { ring: "border-amber-500/30", text: "text-amber-200", muted: "text-amber-500/70" };
    case "tese":
      return { ring: "border-violet-500/30", text: "text-violet-200", muted: "text-violet-500/70" };
    case "prioridade":
      return { ring: "border-red-500/30", text: "text-red-200", muted: "text-red-500/70" };
    default:
      return { ring: "border-zinc-700", text: "text-zinc-300", muted: "text-zinc-500" };
  }
}
