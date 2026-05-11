/**
 * Canonical domain helpers for Supabase Auth redirects.
 * Reset/recovery links MUST land on a stable, allowlisted domain
 * — never on the ephemeral lovable.app preview URL when running in prod.
 */

const CANONICAL_DOMAIN = 'https://mari.vispe.com.br';

function isProductionHost(host: string): boolean {
  return (
    host === 'mari.vispe.com.br' ||
    host === 'mari-vispe.lovable.app' ||
    host.endsWith('.vispe.com.br')
  );
}

/** URL to which Supabase will redirect after the user clicks the recovery email link. */
export function getResetRedirectUrl(): string {
  if (typeof window === 'undefined') return `${CANONICAL_DOMAIN}/reset-password`;
  const host = window.location.hostname;
  if (isProductionHost(host)) return `${CANONICAL_DOMAIN}/reset-password`;
  // Dev / Lovable preview sandboxes — keep current origin so testing works.
  return `${window.location.origin}/reset-password`;
}
