import { useState } from "react";
import { Loader2, Database, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const SETORES = ["tech","saude","industria","servicos","comercio","educacao","alimentacao","logistica","agro","construcao","energia","telecom"];

export function ExpandRFBDialog({
  buyerId,
  mandateId,
  target = "companies",
  defaultSetores,
  defaultUfs,
  triggerLabel,
  onCompleted,
}: {
  buyerId?: string;
  mandateId?: string;
  target?: "companies" | "buyers";
  defaultSetores?: string[];
  defaultUfs?: string[];
  triggerLabel?: string;
  onCompleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [setores, setSetores] = useState<string[]>(defaultSetores ?? []);
  const [ufs, setUfs] = useState<string[]>(defaultUfs ?? []);
  const [capitalMin, setCapitalMin] = useState<string>("100000");
  const [idadeMin, setIdadeMin] = useState<string>("3");
  const [limit, setLimit] = useState<string>("50");
  const [result, setResult] = useState<any | null>(null);
  const { toast } = useToast();

  function toggle(arr: string[], v: string, setter: (a: string[]) => void) {
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  async function run(dryRun: boolean) {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("expand-companies-from-rfb", {
        body: {
          buyer_id: buyerId,
          dry_run: dryRun,
          filters: {
            setores, ufs,
            capital_min: Number(capitalMin) || 0,
            idade_min_anos: Number(idadeMin) || 0,
            limit: Number(limit) || 50,
          },
        },
      });
      if (error) throw error;
      setResult(data);
      if (!dryRun && data?.imported > 0) {
        toast({
          title: `${data.imported} empresas importadas da base RFB`,
          description: "Marcadas como 'não qualificadas'. Recalculando matches…",
        });
        onCompleted?.();
      } else if (!dryRun) {
        toast({ title: "Nenhuma empresa nova encontrada", description: "Tente relaxar os filtros." });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"
          className="h-8 text-xs bg-transparent border-emerald-700/60 text-emerald-300 hover:bg-emerald-950/40">
          <Database className="h-3.5 w-3.5 mr-1.5" />
          Expandir busca na Base RFB (5M)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            Expandir para Base Nacional (Receita Federal)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="text-xs text-zinc-400">
            Importa empresas da base RFB que se encaixam neste comprador. Elas entram como
            <span className="mx-1 px-1.5 py-0.5 text-[10px] rounded border border-zinc-700 bg-zinc-900 text-zinc-300">não qualificadas</span>
            e ficam visíveis nos matches para você qualificar após o primeiro contato.
          </p>

          <div>
            <Label className="text-xs text-zinc-300">Setores</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {SETORES.map((s) => (
                <button key={s}
                  onClick={() => toggle(setores, s, setSetores)}
                  className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                    setores.includes(s)
                      ? "border-emerald-600 bg-emerald-950/40 text-emerald-300"
                      : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                  }`}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-zinc-300">UFs</Label>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {UFS.map((u) => (
                <button key={u}
                  onClick={() => toggle(ufs, u, setUfs)}
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                    ufs.includes(u)
                      ? "border-emerald-600 bg-emerald-950/40 text-emerald-300"
                      : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                  }`}>{u}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-zinc-300">Capital social mín. (R$)</Label>
              <Input value={capitalMin} onChange={(e) => setCapitalMin(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs text-zinc-300">Idade mín. (anos)</Label>
              <Input value={idadeMin} onChange={(e) => setIdadeMin(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs text-zinc-300">Limite (até 200)</Label>
              <Input value={limit} onChange={(e) => setLimit(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 h-8 text-xs mt-1" />
            </div>
          </div>

          {result && (
            <div className="text-xs bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-1">
              {result.dry_run ? (
                <div className="text-zinc-300">
                  <strong className="text-emerald-300">{result.would_import}</strong> empresas seriam importadas
                  (de {result.scanned} varridas).
                </div>
              ) : (
                <div className="text-zinc-300">
                  <strong className="text-emerald-300">{result.imported}</strong> empresas importadas
                  · {result.match_triggered ? "matches recalculados ✓" : "match não disparado"}
                </div>
              )}
              {result.message && <div className="text-zinc-400">{result.message}</div>}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={loading} onClick={() => run(true)}
            className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null} Pré-visualizar
          </Button>
          <Button disabled={loading} onClick={() => run(false)}
            className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950">
            {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Database className="h-3 w-3 mr-1" />}
            Importar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
