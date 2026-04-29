/**
 * Helpers WhatsApp para CRM (envio para terceiros, não para a Vispe).
 * O `whatsapp.ts` original é específico para o número da Vispe receber leads.
 * Este aqui é para o time do BDR contatar mandates/buyers a partir do CRM.
 */

export function normalizeBrazilPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // Already has country code
  if (digits.startsWith("55") && digits.length >= 12 && digits.length <= 13) return digits;
  // Local 10/11 digits → prepend 55
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  return digits;
}

export function whatsAppLinkFor(phoneRaw?: string | null, message?: string): string | null {
  const phone = normalizeBrazilPhone(phoneRaw);
  if (!phone) return null;
  const msg = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${phone}${msg}`;
}

export function formatBrazilPhone(raw?: string | null): string {
  if (!raw) return "—";
  const d = raw.replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) {
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  if (d.length === 12 && d.startsWith("55")) {
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  }
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return raw;
}

export const WHATSAPP_TEMPLATES = {
  mandate_first_contact: (nome: string, empresa: string) =>
    `Olá ${nome}! Aqui é da PME.B3 / Vispe Capital. Sobre a operação da ${empresa}: já temos o mandato ativo e estou prospectando compradores qualificados. Posso te chamar em 5 min para alinhar os próximos passos?`,
  mandate_followup_7d: (nome: string, empresa: string) =>
    `Oi ${nome}, tudo bem? Estou voltando para atualizar você sobre o andamento do mandato da ${empresa}. Tem 10 min hoje ou amanhã para uma call rápida?`,
  buyer_first_contact: (nome: string) =>
    `Olá ${nome}! Aqui é da PME.B3 / Vispe Capital. Vi seu interesse em adquirir ativos no setor — tenho algumas oportunidades alinhadas com seu perfil. Quer que eu envie os teasers?`,
  buyer_send_teaser: (nome: string, empresa: string, ticket: string) =>
    `${nome}, segue uma oportunidade que bate com seu mandato:\n\n• Empresa: ${empresa}\n• Ticket aproximado: ${ticket}\n\nQuer que eu agende uma call para detalhar?`,
  generic_followup: (nome: string) =>
    `Oi ${nome}! Tudo bem? Posso atualizar você sobre as últimas novidades?`,
} as const;

export type WhatsAppTemplateKey = keyof typeof WHATSAPP_TEMPLATES;
