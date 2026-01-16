const WHATSAPP_PHONE = "5551992338258";

export function getWhatsAppLink(message?: string): string {
  const encodedMessage = message ? encodeURIComponent(message) : '';
  return `https://api.whatsapp.com/send/?phone=${WHATSAPP_PHONE}&text=${encodedMessage}&type=phone_number&app_absent=0`;
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    // If we can't access window.top due to cross-origin restrictions, we're likely in an iframe
    return true;
  }
}

export function getWhatsAppTarget(): "_blank" | "_top" {
  return isInIframe() ? "_top" : "_blank";
}
