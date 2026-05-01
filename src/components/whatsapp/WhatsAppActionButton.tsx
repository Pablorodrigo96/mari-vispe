// <WhatsAppActionButton> — Etapa 1 do redesign WhatsApp.
// Aparece em mandate/buyer/match/contact view. Clique:
//  1. POST generate-whatsapp-draft (Gemini via Lovable AI Gateway)
//  2. Modal editável com o rascunho
//  3. "Abrir no WhatsApp" → wa.me em nova aba + log via eb_open_whatsapp_action
//  4. Modal pós-envio: [✅ Mandei] [❌ Não foi] [⏰ Adiar 24h]
//
// Toda a lógica: deep link, sem API Meta, sem Twilio.

import { useState } from "react";
import { MessageCircle, Loader2, Send, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getWhatsAppLink, normalizeBrPhone } from "@/lib/whatsapp";

export type DraftType =
  | "first_contact"
  | "followup"
  | "valuation_send"
  | "meeting_request"
  | "match_announcement"
  | "generic";

interface WhatsAppActionButtonProps {
  phone: string | null | undefined;
  draftType?: DraftType;
  contactId?: string | null;
  mandateId?: string | null;
  buyerId?: string | null;
  matchId?: string | null;
  contactName?: string | null;
  extraContext?: string;
  source?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  onSent?: () => void;
}

type Step = "idle" | "drafting" | "review" | "post";

export function WhatsAppActionButton({
  phone, draftType = "generic", contactId, mandateId, buyerId, matchId,
  contactName, extraContext, source = "action_button", label,
  variant = "outline", size = "sm", className, onSent,
}: WhatsAppActionButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [generated, setGenerated] = useState("");
  const [edited, setEdited] = useState("");
  const [logId, setLogId] = useState<string | null>(null);
  const [actionLabel, setActionLabel] = useState<string>("Falar no WhatsApp");
  const [mode, setMode] = useState<"followup" | "initial" | null>(null);

  const phoneNorm = normalizeBrPhone(phone ?? "");
  const disabled = !phoneNorm;

  async function handleClick() {
    if (!phoneNorm) {
      toast({ title: "Sem telefone", description: "Esse contato não tem WhatsApp cadastrado.", variant: "destructive" });
      return;
    }
    setOpen(true);
    setStep("drafting");
    setGenerated(""); setEdited(""); setLogId(null); setMode(null);

    // A edge function decide automaticamente followup vs initial olhando o histórico.
    // Só repassamos um intent forçado se for um dos 3 casos específicos.
    const forceableIntents = ["valuation_send", "meeting_request", "match_announcement"] as const;
    const force_intent = (forceableIntents as readonly string[]).includes(draftType)
      ? (draftType as (typeof forceableIntents)[number])
      : undefined;

    try {
      const { data, error } = await supabase.functions.invoke("generate-whatsapp-draft", {
        body: {
          force_intent,
          contact_id: contactId ?? undefined,
          mandate_id: mandateId ?? undefined,
          buyer_id: buyerId ?? undefined,
          match_id: matchId ?? undefined,
          contact_name: contactName ?? undefined,
          extra_context: extraContext ?? undefined,
        },
      });
      if (error) throw error;
      const text = (data?.draft_text ?? "").trim();
      setGenerated(text);
      setEdited(text);
      setActionLabel(data?.suggested_action_label ?? actionLabel);
      setMode((data?.mode as "followup" | "initial" | undefined) ?? null);
      setStep("review");
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg.includes("429") || msg.includes("rate_limited")) {
        toast({ title: "Limite de IA", description: "Aguarde um instante e tente novamente.", variant: "destructive" });
      } else if (msg.includes("402") || msg.includes("credits")) {
        toast({ title: "Créditos de IA esgotados", description: "Adicione créditos no workspace.", variant: "destructive" });
      } else {
        toast({ title: "Falha ao gerar rascunho", description: msg.slice(0, 200), variant: "destructive" });
      }
      setOpen(false);
      setStep("idle");
    }
  }

  async function handleOpenWhatsApp() {
    if (!phoneNorm || !edited.trim()) return;
    const url = getWhatsAppLink(edited, phoneNorm);

    // Abrir em nova aba (jamais redireciona a aba atual)
    let opened = false;
    try {
      const w = window.open(url, "_blank", "noopener,noreferrer");
      opened = !!w;
    } catch { opened = false; }
    if (!opened) {
      try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
      toast({ title: "Pop-up bloqueado", description: "Link copiado para a área de transferência." });
    }

    // Log da abertura (registra o draft generated)
    try {
      const { data, error } = await supabase.rpc("eb_open_whatsapp_action", {
        p_draft_type: draftType,
        p_draft_text_generated: generated,
        p_phone_number: phoneNorm,
        p_contact_id: contactId ?? null,
        p_mandate_id: mandateId ?? null,
        p_buyer_id: buyerId ?? null,
        p_match_id: matchId ?? null,
        p_suggested_action_label: actionLabel,
        p_source: source,
      });
      if (error) throw error;
      setLogId(data as string);
    } catch (e: any) {
      console.warn("[WhatsAppAction] log open falhou", e);
    }

    setStep("post");
  }

  async function handleMark(action: "sent" | "not_sent" | "snoozed") {
    if (!logId) {
      // Sem logId, fecha mas avisa
      setOpen(false); setStep("idle");
      return;
    }
    try {
      const { error } = await supabase.rpc("eb_mark_whatsapp_action", {
        p_log_id: logId,
        p_marked_action: action,
        p_draft_text_sent: edited !== generated ? edited : null,
        p_snooze_hours: 24,
      });
      if (error) throw error;
      if (action === "sent") {
        toast({ title: "Registrado", description: "Atividade lançada no CRM." });
        onSent?.();
      } else if (action === "snoozed") {
        toast({ title: "Adiado por 24h" });
      }
    } catch (e: any) {
      toast({ title: "Falha ao registrar", description: e?.message ?? "", variant: "destructive" });
    }
    setOpen(false); setStep("idle");
  }

  return (
    <>
      <Button
        type="button" variant={variant} size={size} className={className}
        onClick={handleClick} disabled={disabled}
        title={disabled ? "Sem telefone cadastrado" : "Falar no WhatsApp"}
      >
        <MessageCircle className="h-4 w-4 mr-1.5" />
        {label ?? (contactName ? `Falar com ${contactName.split(" ")[0]}` : "WhatsApp")}
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setStep("idle"); } }}>
        <DialogContent className="max-w-lg bg-zinc-950 border-zinc-800 text-zinc-100">
          {step === "drafting" && (
            <>
              <DialogHeader>
                <DialogTitle>Gerando rascunho com Mari…</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Lendo contexto do deal e escrevendo a mensagem.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            </>
          )}

          {step === "review" && (
            <>
              <DialogHeader>
                <DialogTitle>Revisar mensagem</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Edite se quiser. Vai abrir o WhatsApp Web/App com este texto pronto.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                value={edited} onChange={(e) => setEdited(e.target.value)}
                rows={6} className="bg-zinc-900 border-zinc-800 text-zinc-100 text-sm"
              />
              <div className="text-[11px] text-zinc-500">
                Para: <span className="text-zinc-300">{phoneNorm}</span>
                {edited !== generated && <span className="ml-2 text-amber-400">(editado)</span>}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => { setOpen(false); setStep("idle"); }}>
                  Cancelar
                </Button>
                <Button onClick={handleOpenWhatsApp} disabled={!edited.trim()}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white">
                  <Send className="h-4 w-4 mr-1.5" /> Abrir no WhatsApp
                </Button>
              </DialogFooter>
            </>
          )}

          {step === "post" && (
            <>
              <DialogHeader>
                <DialogTitle>O que rolou?</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Marque em 1 clique. Tudo vai pro CRM automaticamente.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-2 py-2">
                <Button onClick={() => handleMark("sent")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white h-16 flex-col">
                  <Check className="h-5 w-5" /><span className="text-xs">Mandei</span>
                </Button>
                <Button onClick={() => handleMark("not_sent")}
                        variant="outline"
                        className="bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800 h-16 flex-col">
                  <X className="h-5 w-5" /><span className="text-xs">Não foi</span>
                </Button>
                <Button onClick={() => handleMark("snoozed")}
                        variant="outline"
                        className="bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800 h-16 flex-col">
                  <Clock className="h-5 w-5" /><span className="text-xs">Adiar 24h</span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
