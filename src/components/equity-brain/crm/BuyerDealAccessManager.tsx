import { useState } from "react";
import { Shield, ShieldCheck, Trash2, UserPlus, Loader2 } from "lucide-react";
import {
  useBuyerDealAccessList,
  useGrantBuyerAccess,
  useRevokeBuyerAccess,
} from "@/hooks/useBuyerDealAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  dealId: string;
}

export function BuyerDealAccessManager({ dealId }: Props) {
  const list = useBuyerDealAccessList(dealId);
  const grant = useGrantBuyerAccess(dealId);
  const revoke = useRevokeBuyerAccess(dealId);
  const [buyerUserId, setBuyerUserId] = useState("");
  const [level, setLevel] = useState<"teaser" | "full">("teaser");

  const rows = list.data ?? [];
  const active = rows.filter((r) => !r.revoked_at);

  const handleGrant = async () => {
    const id = buyerUserId.trim();
    if (!id || id.length < 10) {
      toast.error("Cole o ID do comprador (UUID do usuário)");
      return;
    }
    try {
      await grant.mutateAsync({ buyerUserId: id, accessLevel: level });
      toast.success("Acesso concedido");
      setBuyerUserId("");
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao conceder acesso");
    }
  };

  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 inline-flex items-center gap-1">
        <Shield className="h-3 w-3 text-[#D9F564]" /> Sala do comprador
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <Input
          value={buyerUserId}
          onChange={(e) => setBuyerUserId(e.target.value)}
          placeholder="UUID do usuário comprador"
          className="h-8 text-xs bg-zinc-900/60 border-zinc-700"
        />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as "teaser" | "full")}
          className="h-8 text-xs rounded border border-zinc-700 bg-zinc-900/60 px-2 text-zinc-200"
        >
          <option value="teaser">Teaser</option>
          <option value="full">Full</option>
        </select>
        <Button
          size="sm"
          onClick={handleGrant}
          disabled={grant.isPending}
          className="h-8 bg-[#D9F564] text-black hover:bg-[#D9F564]/90 text-xs"
        >
          {grant.isPending ? (
            <Loader2 className="size-3 animate-spin mr-1" />
          ) : (
            <UserPlus className="size-3 mr-1" />
          )}
          Conceder
        </Button>
      </div>

      {list.isLoading ? (
        <div className="text-xs text-muted-foreground">Carregando…</div>
      ) : active.length === 0 ? (
        <div className="text-xs text-muted-foreground">Nenhum comprador com acesso ativo.</div>
      ) : (
        <ul className="space-y-1">
          {active.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded border border-zinc-800 bg-zinc-900/30 px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-zinc-100 font-mono break-all">
                  {r.buyer_user_id}
                </div>
                <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1.5 mt-0.5">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded border",
                      r.access_level === "full"
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-700/40"
                        : "bg-zinc-700/40 text-zinc-300 border-zinc-600",
                    )}
                  >
                    {r.access_level}
                  </span>
                  <ShieldCheck className="size-3" /> desde{" "}
                  {new Date(r.granted_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  revoke.mutateAsync(r.id).then(
                    () => toast.success("Acesso revogado"),
                    (err: any) => toast.error(err?.message ?? "Falha"),
                  )
                }
                className="text-[10px] text-rose-300 hover:text-rose-200 inline-flex items-center gap-1"
                title="Revogar acesso"
              >
                <Trash2 className="size-3" /> revogar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
