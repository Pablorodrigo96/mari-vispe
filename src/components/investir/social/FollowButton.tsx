import { useEffect, useState } from "react";
import { Plus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Follow é otimista. Persiste em company_follows quando o usuário está logado e
// o símbolo bate com um token real; caso contrário só guarda em localStorage.
export function FollowButton({
  symbol,
  tokenId,
  compact,
}: {
  symbol: string;
  tokenId?: string;
  compact?: boolean;
}) {
  const storageKey = `mari_follow_${symbol}`;
  const [followed, setFollowed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [realTokenId, setRealTokenId] = useState<string | null>(tokenId || null);

  useEffect(() => {
    setFollowed(localStorage.getItem(storageKey) === "1");
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, [storageKey]);

  useEffect(() => {
    if (realTokenId || !symbol) return;
    supabase
      .from("tokens")
      .select("id")
      .eq("symbol", symbol)
      .maybeSingle()
      .then(({ data }) => setRealTokenId(data?.id || null));
  }, [symbol, realTokenId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !followed;
    setFollowed(next);
    localStorage.setItem(storageKey, next ? "1" : "0");
    if (!userId || !realTokenId) return;
    if (next) {
      await supabase.from("company_follows").insert({ user_id: userId, token_id: realTokenId });
    } else {
      await supabase.from("company_follows").delete().eq("user_id", userId).eq("token_id", realTokenId);
    }
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "shrink-0 inline-flex items-center gap-1 rounded-full font-semibold transition-colors",
        compact ? "px-3 py-1 text-[11px]" : "px-4 py-1.5 text-xs",
        followed
          ? "bg-bone/10 text-bone/75 hover:bg-bone/15"
          : "bg-volt text-carbon hover:bg-volt/90",
      )}
    >
      {followed ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
      {followed ? "Seguindo" : "Seguir"}
    </button>
  );
}
