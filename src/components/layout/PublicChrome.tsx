import { Header } from './Header';
import { useInAppShell } from '@/contexts/AppShellContext';

/**
 * Drop-in replacement for `<Header />` in pages that can be rendered both
 * publicly (visitor) and inside the authenticated AppShell.
 *
 * - Visitor → renders the full public Header.
 * - Logged-in (inside AppShell) → renders nothing, since the AppTopbar already
 *   provides navigation.
 */
export function PublicChrome() {
  const inShell = useInAppShell();
  if (inShell) return null;
  return <Header />;
}
