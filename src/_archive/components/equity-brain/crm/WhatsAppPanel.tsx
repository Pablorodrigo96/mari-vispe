import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useContacts, useLogActivity } from "@/hooks/useCrm";
import { whatsAppLinkFor, formatBrazilPhone, WHATSAPP_TEMPLATES } from "@/lib/crmWhatsapp";

export function WhatsAppPanel({ entityType, entityId, entityName }:
  { entityType: "mandate" | "buyer"; entityId: string; entityName: string }) {
  const { data: contacts = [] } = useContacts(entityType, entityId);
  const log = useLogActivity();
  const [message, setMessage] = useState("");
  const [contactIdx, setContactIdx] = useState(0);
  const contact = contacts[contactIdx];

  const templates = entityType === "mandate"
    ? [
        { key: "first", label: "Primeiro contato", text: WHATSAPP_TEMPLATES.mandate_first_contact(contact?.nome ?? "", entityName) },
        { key: "follow", label: "Follow-up 7d",  text: WHATSAPP_TEMPLATES.mandate_followup_7d(contact?.nome ?? "", entityName) },
        { key: "gen",   label: "Genérico",        text: WHATSAPP_TEMPLATES.generic_followup(contact?.nome ?? "") },
      ]
    : [
        { key: "first", label: "Primeiro contato", text: WHATSAPP_TEMPLATES.buyer_first_contact(contact?.nome ?? "") },
        { key: "gen",   label: "Genérico",        text: WHATSAPP_TEMPLATES.generic_followup(contact?.nome ?? "") },
      ];

  function handleSend() {
    if (!contact?.telefone_e164 || !message.trim()) return;
    const url = whatsAppLinkFor(contact.telefone_e164, message);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    log.mutate({
      entity_type: entityType, entity_id: entityId, kind: "whatsapp", direction: "out",
      body: message, contact_id: contact.id,
    });
    setMessage("");
  }

  if (contacts.length === 0) {
    return <div className="p-6 text-center text-zinc-500 text-xs bg-zinc-900/40 border border-zinc-800 rounded">
      Nenhum contato cadastrado. Adicione um contato com telefone para usar o WhatsApp.
    </div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select value={contactIdx} onChange={(e) => setContactIdx(Number(e.target.value))}
                className="flex-1 h-9 text-xs bg-zinc-900 border border-zinc-800 rounded px-2 text-zinc-100">
          {contacts.map((c: any, i: number) => (
            <option key={c.id} value={i}>
              {c.nome} {c.telefone_e164 ? `· ${formatBrazilPhone(c.telefone_e164)}` : "(sem telefone)"}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1">
        {templates.map(t => (
          <Button key={t.key} size="sm" variant="outline"
                  onClick={() => setMessage(t.text)}
                  className="h-7 text-[10px] bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            {t.label}
          </Button>
        ))}
      </div>

      <Textarea value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Mensagem (será aberta no WhatsApp Web)..." rows={5}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs" />

      <div className="flex items-center justify-between">
        <div className="text-[10px] text-zinc-500">
          Cada envio abre o WhatsApp Web e fica registrado na timeline.
        </div>
        <Button onClick={handleSend} disabled={!contact?.telefone_e164 || !message.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white">
          <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Abrir WhatsApp
        </Button>
      </div>
    </div>
  );
}
