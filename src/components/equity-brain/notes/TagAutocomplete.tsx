import { useMemo } from "react";
import { useTopTags } from "@/hooks/useTopTags";
import { normalizeTag } from "@/lib/eb/tagHierarchy";

interface Props {
  /** raw input value, comma-separated */
  value: string;
  onSelect: (next: string) => void;
}

function splitInput(raw: string): { head: string; current: string } {
  const idx = raw.lastIndexOf(",");
  if (idx === -1) return { head: "", current: raw };
  return { head: raw.slice(0, idx + 1), current: raw.slice(idx + 1) };
}

export function TagAutocomplete({ value, onSelect }: Props) {
  const { data: top = [] } = useTopTags("mine", 60, 30);
  const { head, current } = splitInput(value);
  const fragment = current.trim().toLowerCase();

  const suggestions = useMemo(() => {
    const all = top.map((t) => t.tag);
    if (!fragment) return all.slice(0, 8);
    return all.filter((t) => t.startsWith(fragment) && t !== fragment).slice(0, 10);
  }, [top, fragment]);

  if (suggestions.length === 0) return null;

  function pick(tag: string) {
    const norm = normalizeTag(tag);
    const prefix = head.trim().length > 0 ? `${head.replace(/,\s*$/, ", ")}` : "";
    onSelect(`${prefix}${norm}, `);
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {suggestions.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => pick(t)}
          className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-300 hover:border-[#D9F564]/50 hover:bg-zinc-800/60 transition-colors"
        >
          {t}
        </button>
      ))}
    </div>
  );
}
