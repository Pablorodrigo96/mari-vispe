import { Footer } from './Footer';
import { useInAppShell } from '@/contexts/AppShellContext';

/** Footer wrapper that hides itself for logged-in users inside the AppShell. */
export function PublicFooter() {
  const inShell = useInAppShell();
  if (inShell) return null;
  return <Footer />;
}
