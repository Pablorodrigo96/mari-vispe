import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { MariBrainDrawer } from "./MariBrainDrawer";
import { cn } from "@/lib/utils";

export function MariBrainFab() {
  const [open, setOpen] = useState(false);

  // Atalho ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        // Evita conflito com inputs comuns? Atalho global proposital.
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-5 right-5 z-40 group",
          "h-14 w-14 rounded-full bg-[#D9F564] text-[#0A0A0A] shadow-lg shadow-[#D9F564]/20",
          "flex items-center justify-center hover:scale-105 transition-transform",
          "ring-2 ring-[#D9F564]/30 hover:ring-[#D9F564]/50",
        )}
        aria-label="Abrir Mari Brain (⌘K)"
        title="Mari Brain — IA M&A (⌘K)"
      >
        <Sparkles className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-[#0A0A0A] text-[#D9F564] rounded-full px-1.5 py-0.5 ring-2 ring-[#D9F564]">
          IA
        </span>
        <span className="absolute right-full mr-3 px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-100 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-zinc-700">
          Mari Brain · ⌘K
        </span>
      </button>
      <MariBrainDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
