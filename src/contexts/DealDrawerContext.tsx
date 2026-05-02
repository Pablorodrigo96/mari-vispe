import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { DealDrawer } from "@/components/deal/DealDrawer";

interface DealDrawerCtx {
  openDeal: (mandateId: string) => void;
  closeDeal: () => void;
  currentMandateId: string | null;
}

const Ctx = createContext<DealDrawerCtx | null>(null);

export function DealDrawerProvider({ children }: { children: ReactNode }) {
  const [currentMandateId, setCurrentMandateId] = useState<string | null>(null);
  const openDeal = useCallback((id: string) => setCurrentMandateId(id), []);
  const closeDeal = useCallback(() => setCurrentMandateId(null), []);
  return (
    <Ctx.Provider value={{ openDeal, closeDeal, currentMandateId }}>
      {children}
      <DealDrawer
        mandateId={currentMandateId}
        open={!!currentMandateId}
        onOpenChange={(o) => !o && closeDeal()}
      />
    </Ctx.Provider>
  );
}

export function useDealDrawer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDealDrawer must be used inside DealDrawerProvider");
  return ctx;
}
