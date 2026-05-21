import { useSearchParams, Link } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { List, LayoutGrid, Map as MapIcon, Network, Zap, Plus } from "lucide-react";
import MandatosTablePage from "./MandatosTablePage";
import PipelineKanbanPage from "./PipelineKanbanPage";
import MapaPage from "./MapaPage";
import GrafoPage from "./GrafoPage";
import MyCompaniesPage from "./MyCompaniesPage";
import QuickFillPage from "./QuickFillPage";
import ProspectionTab from "./pipeline/ProspectionTab";
import ParesTab from "./pipeline/ParesTab";

type Tab = "prospeccao" | "mandatos" | "empresas" | "pares";
type View = "lista" | "kanban" | "mapa" | "grafo";

const TABS: { id: Tab; label: string }[] = [
  { id: "prospeccao", label: "Prospecção" },
  { id: "mandatos", label: "Mandatos" },
  { id: "pares", label: "Pares" },
  { id: "empresas", label: "Empresas" },
];

const VIEWS: { id: View; label: string; Icon: any }[] = [
  { id: "lista", label: "Lista", Icon: List },
  { id: "kanban", label: "Kanban", Icon: LayoutGrid },
  { id: "mapa", label: "Mapa", Icon: MapIcon },
  { id: "grafo", label: "Grafo", Icon: Network },
];

export default function PipelinePage() {
  const [params, setParams] = useSearchParams();
  const tabRaw = params.get("tab");
  const viewRaw = params.get("view");
  const tab: Tab =
    tabRaw === "empresas" ? "empresas" :
    tabRaw === "prospeccao" ? "prospeccao" :
    tabRaw === "pares" ? "pares" : "mandatos";
  const view: View =
    viewRaw === "lista" || viewRaw === "mapa" || viewRaw === "grafo" ? viewRaw : "kanban";
  const [quickFillOpen, setQuickFillOpen] = useState(false);

  function update(next: { tab?: Tab; view?: View }) {
    const np = new URLSearchParams(params);
    if (next.tab !== undefined) {
      if (next.tab === "mandatos") np.delete("tab");
      else np.set("tab", next.tab);
    }
    if (next.view !== undefined) {
      if (next.view === "kanban") np.delete("view");
      else np.set("view", next.view);
    }
    setParams(np, { replace: true });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs + actions */}
      <div className="border-b border-zinc-800 bg-zinc-950 px-6 pt-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="flex items-end gap-1">
            {TABS.map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => update({ tab: t.id })}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                    isActive
                      ? "border-[#D9F564] text-[#D9F564]"
                      : "border-transparent text-zinc-500 hover:text-zinc-200",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "mandatos" && (
            <div className="flex items-center gap-2 pb-2">
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
                {VIEWS.map((v) => {
                  const isActive = view === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => update({ view: v.id })}
                      title={v.label}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors",
                        isActive
                          ? "bg-zinc-800 text-[#D9F564]"
                          : "text-zinc-400 hover:text-zinc-100",
                      )}
                    >
                      <v.Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{v.label}</span>
                    </button>
                  );
                })}
              </div>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 bg-transparent border-zinc-700 text-zinc-100 hover:bg-zinc-800"
              >
                <Link to="/equity-brain/crm/mandate/new">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Novo mandato
                </Link>
              </Button>
              <Button
                size="sm"
                onClick={() => setQuickFillOpen(true)}
                className="h-8 bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90 font-semibold"
              >
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Preencher rápido
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "prospeccao" ? (
          <ProspectionTab />
        ) : tab === "pares" ? (
          <ParesTab />
        ) : tab === "empresas" ? (
          <MyCompaniesPage />
        ) : view === "lista" ? (
          <MandatosTablePage />
        ) : view === "kanban" ? (
          <PipelineKanbanPage />
        ) : view === "mapa" ? (
          <MapaPage />
        ) : (
          <GrafoPage />
        )}
      </div>

      <Sheet open={quickFillOpen} onOpenChange={setQuickFillOpen}>
        <SheetContent
          side="right"
          className="dark bg-zinc-950 border-l border-zinc-800 text-zinc-100 w-full sm:max-w-[1100px] p-0 overflow-y-auto"
        >
          <QuickFillPage />
        </SheetContent>
      </Sheet>
    </div>
  );
}
