import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { useBuyerDealAccessList } from "@/hooks/useBuyerDealAccess";
import { DealQAPanel } from "./DealQAPanel";
import { cn } from "@/lib/utils";

interface Props {
  dealId: string;
  readOnly?: boolean;
}

/**
 * Staff view: lista buyers com acesso ativo + painel Q&A do buyer selecionado.
 */
export function StaffQASection({ dealId, readOnly }: Props) {
  const list = useBuyerDealAccessList(dealId);
  const active = (list.data ?? []).filter((r) => !r.revoked_at);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && active.length > 0) setSelected(active[0].buyer_user_id);
  }, [active, selected]);

  if (active.length === 0) {
    return (
      <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 inline-flex items-center gap-1">
          <Users className="h-3 w-3 text-[#D9F564]" /> Q&A com compradores
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Nenhum comprador com acesso ativo. Conceda acesso acima para abrir Q&A.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {active.map((b) => {
          const isSel = selected === b.buyer_user_id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelected(b.buyer_user_id)}
              className={cn(
                "text-[10px] px-2 py-1 rounded border transition-colors",
                isSel
                  ? "bg-[#D9F564]/15 border-[#D9F564]/40 text-[#D9F564]"
                  : "bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:border-zinc-600",
              )}
            >
              {b.buyer_user_id.slice(0, 8)}… · {b.access_level}
            </button>
          );
        })}
      </div>
      {selected && (
        <DealQAPanel
          dealId={dealId}
          buyerUserId={selected}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
