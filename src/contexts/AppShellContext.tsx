import { createContext, useContext } from 'react';

const AppShellContext = createContext<{ inAppShell: boolean }>({ inAppShell: false });

export const AppShellProvider = AppShellContext.Provider;

/**
 * Returns true when the current page is being rendered inside the authenticated AppShell
 * (sidebar + topbar). Pages should hide their own <Header/> and <Footer/> in that case.
 */
export function useInAppShell() {
  return useContext(AppShellContext).inAppShell;
}
