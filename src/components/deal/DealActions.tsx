import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, FileText, Upload, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { whatsAppLinkFor } from "@/lib/crmWhatsapp";
import { useAuth } from "@/contexts/AuthContext";

export function DealActions({ mandateId }: { mandateId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const { data: mandate } = useQuery({
    queryKey: ["deal-actions-meta", mandateId],
    queryFn: async () => {
      const { data } = await supabase
        .schema("equity_brain" as any)
        .from("mandates")
        .select("contato_telefone, contato_nome, comprador_nome")
        .eq("id", mandateId)
        .maybeSingle();
      return data;
    },
  });

  const saveNote = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .schema("equity_brain" as any)
        .from("crm_activities")
        .insert({
          entity_type: "mandate",
          entity_id: mandateId,
          kind: "note",
          body: noteText.trim(),
          created_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nota salva");
      setNoteText("");
      setNoteOpen(false);
      qc.invalidateQueries({ queryKey: ["deal-timeline", mandateId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function handleWhatsApp() {
    const phone = mandate?.contato_telefone;
    if (!phone) {
      toast.error("Sem telefone cadastrado para este mandato");
      return;
    }
    const link = whatsAppLinkFor(phone, `Olá ${mandate?.contato_nome || ""}, tudo bem?`);
    if (link) {
      window.open(link, "_blank");
      // log activity (best-effort)
      if (user) {
        supabase.schema("equity_brain" as any).from("crm_activities").insert({
          entity_type: "mandate",
          entity_id: mandateId,
          kind: "whatsapp",
          body: "WhatsApp aberto via DealDrawer",
          created_by: user.id,
        }).then(() => qc.invalidateQueries({ queryKey: ["deal-timeline", mandateId] }));
      }
    }
  }

  return (
    <>
      <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/40">
        <div className="grid grid-cols-3 gap-2">
          <Button
            size="sm" variant="outline"
            className="bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800 h-8"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> WhatsApp
          </Button>
          <Button
            size="sm" variant="outline"
            className="bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800 h-8"
            onClick={() => setNoteOpen(true)}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" /> Nota
          </Button>
          <Button
            size="sm" variant="outline"
            className="bg-transparent border-zinc-700 text-zinc-500 hover:bg-zinc-800 h-8"
            onClick={() => toast.info("Upload de docs em breve")}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Doc
          </Button>
        </div>
      </div>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="dark bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Nova nota</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Anote aqui o que precisa ficar registrado…"
            className="min-h-[120px] bg-zinc-900 border-zinc-800 text-zinc-100"
          />
          <DialogFooter>
            <Button
              variant="outline" className="bg-transparent border-zinc-700"
              onClick={() => setNoteOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={!noteText.trim() || saveNote.isPending}
              className="bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90"
              onClick={() => saveNote.mutate()}
            >
              {saveNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Salvar nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DealOpenFullPage({ mandateId }: { mandateId: string }) {
  return (
    <a
      href={`/equity-brain/crm/mandate/${mandateId}`}
      className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-[#D9F564] py-3 border-t border-zinc-800"
    >
      Abrir página completa <ExternalLink className="h-3 w-3" />
    </a>
  );
}
