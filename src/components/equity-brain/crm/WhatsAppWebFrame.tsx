import { useMemo, useState } from "react";
import { ExternalLink, MessageCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useContacts, useLogActivity } from "@/hooks/useCrm";
import { whatsAppLinkFor, formatBrazilPhone, WHATSAPP_TEMPLATES } from "@/lib/crmWhatsapp";

/**
 * WhatsApp Web embarcado em iframe sandbox.
 * Aviso: WhatsApp Web tende a bloquear iframes com X-Frame-Options.
 * Quando isso ocorre, oferecemos fallback "Abrir em nova aba" e o registro
 * de atividade segue acontecendo via templates.
 */
export function WhatsAppWebFrame({
  entityType,
  entityId,
  entityName,
}: {
  entityType: "mandate" | "buyer";
  entityId: string;
  entityName: string;
}) {
  const { data: contacts = [] } = useContacts(entityType, entityId);
  const log = useLogActivity();
  const [contactIdx, setContactIdx] = useState(0);
  const [message, setMessage] = useState("");

  const contact = contacts[contactIdx];
  const phoneDigits = (contact?.telefone_e164 ?? "").replace(/\D/g, "");
  const text = encodeURIComponent(message ?? "");
  const webUrl = phoneDigits ? `https://web.whatsapp.com/send?phone=${phoneDigits}&text=${text}` : null;
  const waMeUrl = useMemo(
    () => whatsAppLinkFor(contact?.telefone_e164, message),
    [contact?.telefone_e164, message],
  );

  const templates =
    entityType === "mandate"
      ? [
          { key: "first", label: "Primeiro contato", text: WHATSAPP_TEMPLATES.mandate_first_contact(contact?.nome ?? "", entityName) },
          { key: "follow", label: "Follow-up 7d", text: WHATSAPP_TEMPLATES.mandate_followup_7d(contact?.nome ?? "", entityName) },
          { key: "gen", label: "Genérico", text: WHATSAPP_TEMPLATES.generic_followup(contact?.nome ?? "") },
        ]
      : [
          { key: "first", label: "Primeiro contato", text: WHATSAPP_TEMPLATES.buyer_first_contact(contact?.nome ?? "") },
          { key: "gen", label: "Genérico", text: WHATSAPP_TEMPLATES.generic_followup(contact?.nome ?? "") },
        ];

  function handleOpenExternal() {
    if (!waMeUrl) return;
    window.open(waMeUrl, "_blank", "noopener,noreferrer");
    log.mutate({
      entity_type: entityType,
      entity_id: entityId,
      kind: "whatsapp",
      direction: "out",
      body: message || "(envio via wa.me)",
      contact_id: contact?.id,
      metadata: { via: "wa.me" },
    });
  }

  if (contacts.length === 0) {
    return (
      <div className="p-6 text-center text-zinc-400 text-xs bg-zinc-900/40 border border-zinc-800 rounded">
        Nenhum contato cadastrado. Adicione um contato com telefone para conversar via WhatsApp.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Painel lateral de templates + contato */}
      <div className="col-span-12 md:col-span-4 space-y-3">
        <div>
          <label className="text-[10px] uppercase text-zinc-400 mb-1 block">Contato</label>
          <select
            value={contactIdx}
            onChange={(e) => setContactIdx(Number(e.target.value))}
            className="w-full h-9 text-xs bg-zinc-900 border border-zinc-800 rounded px-2 text-zinc-100"
          >
            {contacts.map((c: any, i: number) => (
              <option key={c.id} value={i}>
                {c.nome} {c.telefone_e164 ? `· ${formatBrazilPhone(c.telefone_e164)}` : "(sem telefone)"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase text-zinc-400 mb-1 block">Templates rápidos</label>
          <div className="flex flex-col gap-1">
            {templates.map((t) => (
              <Button
                key={t.key}
                size="sm"
                variant="outline"
                onClick={() => setMessage(t.text)}
                className="h-7 text-[10px] bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800 justify-start"
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase text-zinc-400 mb-1 block">Mensagem</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="Pré-preencha aqui ou edite o template selecionado…"
            className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs"
          />
        </div>

        <Button
          onClick={handleOpenExternal}
          disabled={!waMeUrl}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Abrir em nova aba (wa.me)
        </Button>

        <div className="flex items-start gap-2 p-2 rounded bg-zinc-900/60 border border-zinc-800 text-[10px] text-zinc-400">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            O WhatsApp pode bloquear o uso embarcado. Se o iframe ao lado pedir login mas
            não carregar, use o botão "Abrir em nova aba". Cada envio é registrado na timeline.
          </span>
        </div>
      </div>

      {/* Iframe do WhatsApp Web */}
      <div className="col-span-12 md:col-span-8">
        <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/40 h-[600px] flex flex-col">
          <div className="px-3 py-2 border-b border-zinc-800 text-[11px] text-zinc-300 flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
            WhatsApp Web embarcado{contact?.telefone_e164 ? ` · ${formatBrazilPhone(contact.telefone_e164)}` : ""}
          </div>
          {webUrl ? (
            <iframe
              src={webUrl}
              title="WhatsApp Web"
              className="w-full flex-1 bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs">
              Selecione um contato com telefone para iniciar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
