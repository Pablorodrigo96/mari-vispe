const WHATSAPP_PHONE = "5551992338258";

export function getWhatsAppLink(message?: string): string {
  const encodedMessage = message ? encodeURIComponent(message) : '';
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodedMessage}`;
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
