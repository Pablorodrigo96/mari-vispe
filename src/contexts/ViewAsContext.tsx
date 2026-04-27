import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ViewAsPersona =
  | 'real'
  | 'admin'
  | 'head_parcerias'
  | 'bdr'
  | 'parceiro'
  | 'franqueado'
  | 'consultor'
  | 'seller'
  | 'buyer'
  | 'visitante';

interface ViewAsContextType {
  viewAs: ViewAsPersona;
  setViewAs: (p: ViewAsPersona) => void;
  resetViewAs: () => void;
}

const ViewAsContext = createContext<ViewAsContextType | undefined>(undefined);

const STORAGE_KEY = 'pmeb3.view_as';

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [viewAs, setViewAsState] = useState<ViewAsPersona>('real');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ViewAsPersona | null;
      if (stored) setViewAsState(stored);
    } catch {
      // ignore
    }
  }, []);

  const setViewAs = (p: ViewAsPersona) => {
    setViewAsState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      // ignore
    }
  };

  const resetViewAs = () => setViewAs('real');

  return (
    <ViewAsContext.Provider value={{ viewAs, setViewAs, resetViewAs }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error('useViewAs must be used within ViewAsProvider');
  return ctx;
}

export const PERSONA_LABELS: Record<ViewAsPersona, string> = {
  real: 'Visão Real',
  admin: 'Como Admin',
  head_parcerias: 'Como Head de Parcerias',
  bdr: 'Como BDR',
  parceiro: 'Como Parceiro Contábil',
  franqueado: 'Como Franqueado',
  consultor: 'Como Consultor',
  seller: 'Como Vendedor',
  buyer: 'Como Comprador',
  visitante: 'Como Visitante (deslogado)',
};
