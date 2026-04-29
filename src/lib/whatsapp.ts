const WHATSAPP_PHONE = "5551992338258";

/**
 * Normalize a Brazilian phone number to E.164 (digits only, with country code).
 * Returns null when there aren't enough digits.
 */
export function normalizeBrPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // Already with country code (55 + 10/11 digits)
  if (digits.length >= 12 && digits.startsWith("55")) return digits;
  // Bare 10/11-digit Brazilian number → prepend 55
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  // Anything else (could be international) — return as-is
  return digits;
}

/**
 * Build a wa.me link.
 *  - getWhatsAppLink("texto")                 → mari platform number (legacy)
 *  - getWhatsAppLink("texto", "5511999998888") → contact's number
 */
export function getWhatsAppLink(message?: string, phone?: string | null): string {
  const encodedMessage = message ? encodeURIComponent(message) : "";
  const target = normalizeBrPhone(phone) ?? WHATSAPP_PHONE;
  return `https://wa.me/${target}?text=${encodedMessage}`;
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

export function getWhatsAppTarget(): "_blank" | "_top" {
  return isInIframe() ? "_top" : "_blank";
}

export async function openWhatsApp(message?: string): Promise<boolean> {
  const url = getWhatsAppLink(message);
  
  // Try opening in new tab/window - never redirect current page
  try {
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (newWindow) {
      return true;
    }
  } catch (e) {
    // Popup blocked or error
  }
  
  // If popup was blocked, copy link to clipboard (user stays on page)
  try {
    await navigator.clipboard.writeText(url);
    return false; // Returns false to indicate link was copied, not opened
  } catch (e) {
    return false;
  }
}
