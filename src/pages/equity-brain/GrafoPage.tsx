import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Map as MapIcon, Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DealGraph } from "@/components/equity-brain/DealGraph";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UFS } from "@/lib/equityBrain";

export default function GrafoPage() {
  const [thesisKey, setThesisKey] = useState<string | null>(null);
  const [buyerId, setBuyerId] = useState<string | null>(null);
  const [ufs, setUfs] = useState<string[]>([]);
  const [presentation, setPresentation] = useState(false);

  // Toggle modo apresentação: esconde a sidebar do EquityBrainLayout
  useEffect(() => {
    if (presentation) {
      document.body.classList.add("eb-presentation");
      const style = document.createElement("style");
      style.id = "eb-presentation-style";
      style.textContent = `
        body.eb-presentation aside { display: none !important; }
        body.eb-presentation main, body.eb-presentation [role="main"] { padding: 0 !important; }
      `;
      document.head.appendChild(style);
    }
    return () => {
      document.body.classList.remove("eb-presentation");
      document.getElementById("eb-presentation-style")?.remove();
    };
  }, [presentation]);

  const thesesQ = useQuery({
    queryKey: ["grafo", "theses-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eb_investment_theses" as any)
        .select("thesis_key,display_name")
        .eq("active", true);
      return (data ?? []) as any[];
    },
  });

  const buyersQ = useQuery({
    queryKey: ["grafo", "buyers-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eb_buyers" as any)
        .select("id,nome")
        .order("nome");
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="flex flex-col h-[calc(100vh-1px)] bg-zinc-950">
      {/* Topbar */}
      {!presentation && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-950">
          <Select value={thesisKey ?? "__all"} onValueChange={(v) => setThesisKey(v === "__all" ? null : v)}>
            <SelectTrigger className="w-56 h-9 bg-zinc-900 border-zinc-800 text-zinc-200 text-xs">
              <SelectValue placeholder="Filtrar por tese" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="__all">Todas as teses</SelectItem>
              {(thesesQ.data ?? []).map((t: any) => (
                <SelectItem key={t.thesis_key} value={t.thesis_key}>
                  {t.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={buyerId ?? "__all"} onValueChange={(v) => setBuyerId(v === "__all" ? null : v)}>
            <SelectTrigger className="w-56 h-9 bg-zinc-900 border-zinc-800 text-zinc-200 text-xs">
              <SelectValue placeholder="Destacar buyer" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="__all">Todos os buyers</SelectItem>
              {(buyersQ.data ?? []).map((b: any) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 ml-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mr-1">UF:</span>
            {UFS.slice(0, 9).map((uf) => {
              const active = ufs.includes(uf);
              return (
                <button
                  key={uf}
                  onClick={() =>
                    setUfs((cur) => (cur.includes(uf) ? cur.filter((x) => x !== uf) : [...cur, uf]))
                  }
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                    active ? "bg-emerald-500 text-zinc-950" : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  }`}
                >
                  {uf}
                </button>
              );
            })}
            {ufs.length > 0 && (
              <button onClick={() => setUfs([])} className="text-[10px] text-zinc-500 hover:text-rose-400 ml-1">
                ×
              </button>
            )}
          </div>

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPresentation(true)}
            className="bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-emerald-300 text-xs"
          >
            <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
            Modo apresentação
          </Button>
        </div>
      )}

      {/* Botão sair da apresentação */}
      {presentation && (
        <button
          onClick={() => setPresentation(false)}
          className="fixed top-3 right-3 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900/90 border border-zinc-700 text-zinc-300 hover:text-emerald-300 text-xs backdrop-blur"
        >
          <Minimize2 className="h-3.5 w-3.5" />
          Sair
        </button>
      )}

      {/* Grafo */}
      <div className="flex-1 relative min-h-0">
        <DealGraph filterThesisKey={thesisKey} filterBuyerId={buyerId} filterUfs={ufs} />

        {!presentation && (
          <Link
            to="/equity-brain/mapa"
            className="absolute bottom-6 left-6 z-[10] flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold text-sm shadow-lg shadow-emerald-900/40 transition-colors"
          >
            <MapIcon className="h-4 w-4" />
            Trocar para Mapa →
          </Link>
        )}
      </div>
    </div>
  );
}
