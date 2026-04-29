import { useState } from "react";
import { Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateBuyerPrefs, useRematchBuyer } from "@/hooks/useCrm";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export function PreferencesEditor({ buyer }: { buyer: any }) {
  const upd = useUpdateBuyerPrefs();
  const rematch = useRematchBuyer();
  const [ufs, setUfs] = useState<string[]>(buyer.ufs_interesse ?? []);
  const [setores, setSetores] = useState<string>((buyer.setores_interesse ?? []).join(", "));
  const [tMin, setTMin] = useState<string>(buyer.ticket_min ?? "");
  const [tMax, setTMax] = useState<string>(buyer.ticket_max ?? "");

  function toggle(uf: string) {
    setUfs(p => p.includes(uf) ? p.filter(x => x !== uf) : [...p, uf]);
  }

  async function save() {
    await upd.mutateAsync({
      buyer_id: buyer.id,
      ufs_interesse: ufs,
      setores_interesse: setores.split(",").map(s => s.trim()).filter(Boolean),
      ticket_min: tMin ? Number(tMin) : null,
      ticket_max: tMax ? Number(tMax) : null,
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] uppercase text-zinc-500 mb-1 block">UFs de interesse</label>
        <div className="flex flex-wrap gap-1">
          {UFS.map(uf => (
            <button key={uf} onClick={() => toggle(uf)}
                    className={`px-2 py-1 text-[10px] rounded border ${
                      ufs.includes(uf)
                        ? "bg-emerald-600/30 border-emerald-600 text-emerald-200"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                    }`}>
              {uf}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] uppercase text-zinc-500 mb-1 block">Setores (separar por vírgula)</label>
        <Input value={setores} onChange={e => setSetores(e.target.value)}
               className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs h-8" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase text-zinc-500 mb-1 block">Ticket mín (R$)</label>
          <Input type="number" value={tMin} onChange={e => setTMin(e.target.value)}
                 className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs h-8" />
        </div>
        <div>
          <label className="text-[10px] uppercase text-zinc-500 mb-1 block">Ticket máx (R$)</label>
          <Input type="number" value={tMax} onChange={e => setTMax(e.target.value)}
                 className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs h-8" />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
        <Button onClick={save} disabled={upd.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white">
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {upd.isPending ? "Salvando..." : "Salvar (dispara rematch automático)"}
        </Button>
        <Button variant="outline" onClick={() => rematch.mutate(buyer.id)} disabled={rematch.isPending}
                className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${rematch.isPending ? "animate-spin" : ""}`} />
          Match Now
        </Button>
      </div>
      <div className="text-[10px] text-zinc-500">
        Ao salvar, o motor recalcula matches em segundos e a aba "Matches" atualiza sozinha.
      </div>
    </div>
  );
}
