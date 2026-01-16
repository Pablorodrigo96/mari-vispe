const WHATSAPP_PHONE = "5551992338258";

export function getWhatsAppLink(message?: string): string {
  const encodedMessage = message ? encodeURIComponent(message) : '';
  return `https://api.whatsapp.com/send/?phone=${WHATSAPP_PHONE}&text=${encodedMessage}&type=phone_number&app_absent=0`;
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
  
  // Try opening in new tab/window first
  try {
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (newWindow) {
      return true;
    }
  } catch (e) {
    // Popup blocked or error, continue to fallback
  }
  
  // Fallback: try top-level navigation (works in iframes)
  try {
    if (isInIframe() && window.top) {
      window.top.location.href = url;
      return true;
    }
  } catch (e) {
    // Cross-origin or blocked, continue to final fallback
  }
  
  // Final fallback: try current window navigation
  try {
    window.location.href = url;
    return true;
  } catch (e) {
    // Everything failed
  }
  
  // Copy link to clipboard as last resort
  try {
    await navigator.clipboard.writeText(url);
    return false; // Returns false to indicate link was copied, not opened
  } catch (e) {
    return false;
  }
}
