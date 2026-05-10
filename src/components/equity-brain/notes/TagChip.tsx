import { Tag as TagIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { normalizeTag, tagColors, tagParts, tagSlug } from "@/lib/eb/tagHierarchy";

interface Props {
  tag: string;
  onClick?: (tag: string) => void;
  size?: "xs" | "sm";
  clickable?: boolean;
  className?: string;
}

export function TagChip({ tag, onClick, size = "xs", clickable = true, className }: Props) {
  const navigate = useNavigate();
  const norm = normalizeTag(tag);
  if (!norm) return null;
  const colors = tagColors(norm);
  const parts = tagParts(norm);
  const ns = parts.length > 1 ? parts[0] : null;
  const rest = ns ? parts.slice(1).join("/") : norm;

  const handle = (e: React.MouseEvent) => {
    if (!clickable) return;
    e.preventDefault();
    e.stopPropagation();
    if (onClick) onClick(norm);
    else navigate(`/equity-brain/tag/${tagSlug(norm)}`);
  };

  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-1.5 py-0.5 text-[10px]";

  return (
    <button
      type="button"
      onClick={handle}
      disabled={!clickable}
      className={cn(
        "inline-flex items-center gap-1 rounded border bg-transparent transition-colors",
        colors.ring,
        clickable && "hover:border-[#D9F564]/50 hover:bg-zinc-800/60 cursor-pointer",
        pad,
        className,
      )}
    >
      <TagIcon className="h-2.5 w-2.5 opacity-60 shrink-0" />
      {ns && <span className={cn("font-mono uppercase tracking-wide", colors.muted)}>{ns}</span>}
      {ns && <span className={colors.muted}>/</span>}
      <span className={cn("truncate max-w-[160px]", colors.text)}>{rest}</span>
    </button>
  );
}
