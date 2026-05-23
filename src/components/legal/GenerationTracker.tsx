import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Loader2, CheckCircle2, AlertCircle, X, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export type GenerationStatus = "running" | "done" | "error";

export interface GenerationJob {
  id: string;
  dealId: string;
  label: string;
  category?: string;
  startedAt: number;
  status: GenerationStatus;
  documentId?: string;
  errorMessage?: string;
}

interface Ctx {
  jobs: GenerationJob[];
  start: (job: Omit<GenerationJob, "startedAt" | "status">) => void;
  finish: (id: string, documentId: string) => void;
  fail: (id: string, errorMessage: string) => void;
  dismiss: (id: string) => void;
}

const GenerationTrackerContext = createContext<Ctx | null>(null);

export function GenerationTrackerProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);

  const start = useCallback((job: Omit<GenerationJob, "startedAt" | "status">) => {
    setJobs((s) => [...s.filter((j) => j.id !== job.id), { ...job, startedAt: Date.now(), status: "running" }]);
  }, []);
  const finish = useCallback((id: string, documentId: string) => {
    setJobs((s) => s.map((j) => (j.id === id ? { ...j, status: "done", documentId } : j)));
  }, []);
  const fail = useCallback((id: string, errorMessage: string) => {
    setJobs((s) => s.map((j) => (j.id === id ? { ...j, status: "error", errorMessage } : j)));
  }, []);
  const dismiss = useCallback((id: string) => {
    setJobs((s) => s.filter((j) => j.id !== id));
  }, []);

  return (
    <GenerationTrackerContext.Provider value={{ jobs, start, finish, fail, dismiss }}>
      {children}
    </GenerationTrackerContext.Provider>
  );
}

export function useGenerationTracker() {
  const ctx = useContext(GenerationTrackerContext);
  if (!ctx) throw new Error("useGenerationTracker must be used within GenerationTrackerProvider");
  return ctx;
}

// Safe non-throwing accessor for cases outside provider (e.g. public pages)
export function useGenerationTrackerSafe(): Ctx | null {
  return useContext(GenerationTrackerContext);
}

/**
 * Floating UI showing all in-flight generations. Mount once at app root.
 */
export function GenerationToaster() {
  const ctx = useContext(GenerationTrackerContext);
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!ctx?.jobs.some((j) => j.status === "running")) return;
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [ctx?.jobs]);

  // Auto-dismiss completed jobs after 20s
  useEffect(() => {
    if (!ctx) return;
    const completed = ctx.jobs.filter((j) => j.status !== "running");
    if (completed.length === 0) return;
    const timers = completed.map((j) =>
      setTimeout(() => ctx.dismiss(j.id), 20000),
    );
    return () => timers.forEach(clearTimeout);
  }, [ctx?.jobs.map((j) => j.id + j.status).join("|")]);

  if (!ctx || ctx.jobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-32px)] sm:w-96">
      {ctx.jobs.map((j) => {
        const elapsed = Math.floor((Date.now() - j.startedAt) / 1000);
        const m = Math.floor(elapsed / 60);
        const s = elapsed % 60;
        return (
          <div
            key={j.id}
            className="bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl p-3 flex items-start gap-3 text-zinc-100"
          >
            <div className="mt-0.5">
              {j.status === "running" && <Loader2 className="h-5 w-5 text-volt animate-spin" />}
              {j.status === "done" && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              {j.status === "error" && <AlertCircle className="h-5 w-5 text-red-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium break-words flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span className="break-words">{j.label}</span>
              </div>
              {j.status === "running" && (
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Gerando com Claude… {m > 0 ? `${m}m ` : ""}{s}s — você pode continuar navegando.
                </div>
              )}
              {j.status === "done" && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] text-emerald-300">Pronto.</span>
                  <button
                    onClick={() => {
                      navigate(`/equity-brain/deal/${j.dealId}`);
                      ctx.dismiss(j.id);
                    }}
                    className="text-[11px] text-volt hover:underline"
                  >
                    Abrir documento →
                  </button>
                </div>
              )}
              {j.status === "error" && (
                <div className="text-[11px] text-red-300 mt-0.5 break-words">
                  {j.errorMessage || "Falha na geração."}
                </div>
              )}
            </div>
            <button
              onClick={() => ctx.dismiss(j.id)}
              className="text-zinc-500 hover:text-zinc-300 shrink-0"
              aria-label="Dispensar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      {/* Tick to force re-render every second */}
      <span className="hidden">{tick}</span>
    </div>
  );
}
