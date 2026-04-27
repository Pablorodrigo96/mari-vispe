import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Star, Loader2, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { OUTCOMES, TIMING_OPTIONS, DOR_OPTIONS } from "@/lib/equityBrain";
import { cn } from "@/lib/utils";

interface QuickCallModalProps {
  cnpj: string;
  razaoSocial?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

export function QuickCallModal({ cnpj, razaoSocial, open, onOpenChange, onSubmitted }: QuickCallModalProps) {
  const [outcome, setOutcome] = useState("qualified");
  const [interest, setInterest] = useState(3);
  const [timing, setTiming] = useState("6m");
  const [dor, setDor] = useState("crescimento");
  const [notes, setNotes] = useState("");
  const [nextPitch, setNextPitch] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const m = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("feedback-from-call", {
        body: {
          cnpj,
          outcome,
          interest_level: interest,
          timing_estimado: timing,
          dor_principal: dor,
          raw_notes: notes || undefined,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success("Feedback registrado", {
        description: `Score recalculando… ${data?.signals_added?.length ? `${data.signals_added.length} sinal(is) novo(s).` : ""}`,
      });
      setNotes("");
      onSubmitted?.();
      // Se a IA gerou um próximo pitch, mantém o modal aberto pra mostrar
      if (data?.next_pitch) {
        setNextPitch(data.next_pitch);
      } else {
        onOpenChange(false);
      }
    },
    onError: (e: any) => {
      toast.error("Falha ao registrar", { description: e?.message ?? "Erro desconhecido" });
    },
  });

  const handleClose = (v: boolean) => {
    if (!v) {
      setNextPitch(null);
      setCopied(false);
    }
    onOpenChange(v);
  };

  const copyPitch = async () => {
    if (!nextPitch) return;
    const text = nextPitch.pitch ?? nextPitch.abertura_curta ?? JSON.stringify(nextPitch);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Pitch copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="dark bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            {nextPitch ? "Próximo pitch sugerido" : "Registrar call"} · <span className="text-emerald-400">{razaoSocial ?? cnpj}</span>
          </DialogTitle>
        </DialogHeader>

        {nextPitch && (
          <div className="rounded-lg border border-emerald-700/40 bg-emerald-950/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-300 text-xs uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              Pitch gerado por Claude (Fase 7)
            </div>
            {nextPitch.abertura_curta && (
              <div>
                <div className="text-[10px] uppercase text-zinc-500 mb-1">Abertura curta</div>
                <div className="text-sm text-zinc-100 break-words">{nextPitch.abertura_curta}</div>
              </div>
            )}
            {nextPitch.pitch && (
              <div>
                <div className="text-[10px] uppercase text-zinc-500 mb-1">Pitch completo</div>
                <div className="text-sm text-zinc-200 whitespace-pre-wrap break-words">{nextPitch.pitch}</div>
              </div>
            )}
            {nextPitch.subject && (
              <div>
                <div className="text-[10px] uppercase text-zinc-500 mb-1">Assunto</div>
                <div className="text-sm text-zinc-200 break-words">{nextPitch.subject}</div>
              </div>
            )}
            <Button onClick={copyPitch} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold">
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copiado" : "Copiar pitch"}
            </Button>
          </div>
        )}

        {!nextPitch && (
        <div className="space-y-4">

          <div>
            <Label className="text-xs uppercase tracking-wider text-zinc-400">Resultado</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2">
              {OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOutcome(o.value)}
                  className={cn(
                    "px-2 py-1.5 rounded text-xs border transition-colors",
                    outcome === o.value
                      ? "bg-emerald-900/40 text-emerald-200 border-emerald-700"
                      : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-zinc-400">
              Interesse ({interest}/5)
            </Label>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInterest(i)}
                  className="p-1"
                >
                  <Star
                    className={cn(
                      "h-6 w-6 transition-colors",
                      i <= interest ? "text-amber-400 fill-amber-400" : "text-zinc-700",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-zinc-400">Timing</Label>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {TIMING_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTiming(t.value)}
                    className={cn(
                      "px-2 py-1.5 rounded text-xs border transition-colors",
                      timing === t.value
                        ? "bg-blue-900/40 text-blue-200 border-blue-700"
                        : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-zinc-400">Dor principal</Label>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {DOR_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDor(d.value)}
                    className={cn(
                      "px-2 py-1.5 rounded text-xs border transition-colors",
                      dor === d.value
                        ? "bg-amber-900/40 text-amber-200 border-amber-700"
                        : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-zinc-400">
              Notas da call <span className="text-zinc-600">(≥ 50 chars dispara IA)</span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sócio fundador (62 anos), filhos não querem assumir, fatura ~R$ 8M/ano, EBITDA 18%…"
              className="mt-2 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 min-h-[120px]"
            />
            <div className="text-[10px] text-zinc-600 mt-1 text-right tabular-nums">{notes.length} chars</div>
          </div>
        </div>
        )}

        {!nextPitch && (
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleClose(false)}
            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => m.mutate()}
            disabled={m.isPending}
            className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold"
          >
            {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar feedback"}
          </Button>
        </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
