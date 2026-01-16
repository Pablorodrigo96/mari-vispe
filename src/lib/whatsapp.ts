const WHATSAPP_PHONE = "5551992338258";

export function getWhatsAppLink(message?: string): string {
  const encodedMessage = message ? encodeURIComponent(message) : '';
  return `https://api.whatsapp.com/send/?phone=${WHATSAPP_PHONE}&text=${encodedMessage}&type=phone_number&app_absent=0`;
}
