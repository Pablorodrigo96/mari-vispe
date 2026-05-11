import { useState } from "react";
import { Sparkles, Copy, Loader2, RefreshCw, Phone, MessageCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Channel = "call" | "whatsapp" | "email";

const CHANNELS: { value: Channel; label: string; icon: typeof Phone }[] = [
  { value: "call", label: "Call", icon: Phone },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "email", label: "Email", icon: Mail },
];

interface Props {
  cnpj?: string | null;
  buyerId?: string | null;
}

export function GeneratePitchCard({ cnpj, buyerId }: Props) {
  const [channel, setChannel] = useState<Channel>("call");
  const [loading, setLoading] = useState(false);
  const [pitch, setPitch] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [opener, setOpener] = useState<string>("");
  const [cached, setCached] = useState(false);

  async function generate(force = false) {
    if (!cnpj) {
      toast.error("CNPJ não disponível");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("claude-generate-pitch", {
        body: { cnpj, buyer_id: buyerId ?? undefined, channel, force_refresh: force },
      });
      if (error) throw error;
      if (data?.skipped) {
        setPitch(data.pitch ?? "");
        setSubject("");
        setOpener("");
        setCached(true);
        toast.success("Pitch carregado do cache");
        return;
      }
      const parsed = data?.parsed;
      if (!parsed?.pitch) throw new Error("Resposta inválida da IA");
      setPitch(parsed.pitch);
      setSubject(parsed.subject ?? "");
      setOpener(parsed.abertura_curta ?? "");
      setCached(false);
      toast.success(`Pitch gerado · ${data?.tokens?.output ?? 0} tokens`);
    } catch (e: any) {
      console.error("generate pitch error:", e);
      toast.error(e?.message ?? "Erro ao gerar pitch");
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string, label = "Copiado") {
    navigator.clipboard.writeText(text);
    toast.success(label);
  }

  return (
    <div className="rounded border border-[#D9F564]/30 bg-zinc-900/60 p-4 relative">
      <div className="absolute -top-2 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#D9F564] text-zinc-900 tracking-wider">
        NOVO ✨
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-[#D9F564]" />
        <div className="text-sm font-semibold text-zinc-100">Mari sugere o pitch</div>
        <div className="text-[10px] text-zinc-500 ml-auto">IA · personalizado para este match</div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            const active = channel === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setChannel(c.value)}
                className={cn(
                  "text-[11px] px-2 h-7 inline-flex items-center gap-1 rounded border transition-colors",
                  active
                    ? "border-[#D9F564] text-[#D9F564] bg-[#D9F564]/10"
                    : "border-zinc-800 text-zinc-400 bg-transparent hover:text-zinc-200"
                )}
              >
                <Icon className="h-3 w-3" /> {c.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => generate(false)}
          disabled={loading || !cnpj}
          className="text-[11px] px-3 h-7 inline-flex items-center gap-1 rounded bg-[#D9F564] text-zinc-900 font-semibold hover:opacity-90 disabled:opacity-50 ml-auto"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {pitch ? "Regenerar" : "Gerar pitch"}
        </button>
        {pitch && (
          <button
            onClick={() => generate(true)}
            disabled={loading}
            title="Forçar regenerar (ignora cache)"
            className="text-[11px] px-2 h-7 inline-flex items-center gap-1 rounded border border-zinc-800 text-zinc-400 hover:text-[#D9F564]"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>

      {!pitch && !loading && (
        <div className="text-[11px] text-zinc-500 italic">
          Clique em "Gerar pitch" para a Mari montar um pitch consultivo personalizado para este {channel === "email" ? "e-mail" : channel === "whatsapp" ? "WhatsApp" : "call"}.
        </div>
      )}

      {pitch && (
        <div className="space-y-2">
          {cached && (
            <div className="text-[10px] text-amber-400">↻ Cache · clique no botão de refresh para regenerar</div>
          )}
          {opener && (
            <div className="rounded bg-zinc-950/60 border border-zinc-800 p-2.5">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[9px] uppercase tracking-wider text-zinc-500">Abertura curta</div>
                <button onClick={() => copy(opener, "Abertura copiada")} className="text-zinc-400 hover:text-[#D9F564]">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="text-xs text-zinc-200 break-words">{opener}</div>
            </div>
          )}
          {subject && (
            <div className="rounded bg-zinc-950/60 border border-zinc-800 p-2.5">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[9px] uppercase tracking-wider text-zinc-500">Assunto do e-mail</div>
                <button onClick={() => copy(subject, "Assunto copiado")} className="text-zinc-400 hover:text-[#D9F564]">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="text-xs text-zinc-200 break-words">{subject}</div>
            </div>
          )}
          <div className="rounded bg-zinc-950/60 border border-zinc-800 p-2.5">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">Pitch completo</div>
              <button onClick={() => copy(pitch, "Pitch copiado")} className="text-zinc-400 hover:text-[#D9F564]">
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <div className="text-xs text-zinc-200 whitespace-pre-wrap break-words leading-relaxed">{pitch}</div>
          </div>
        </div>
      )}
    </div>
  );
}
