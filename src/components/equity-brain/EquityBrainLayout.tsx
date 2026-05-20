import { Suspense, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { EBSidebar } from "./EBSidebar";
import { VerticalSelector } from "./VerticalSelector";
import { Input } from "@/components/ui/input";
import { MariBrainFab } from "./mari/MariBrainFab";
import { DealDrawerProvider } from "@/contexts/DealDrawerContext";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ContentLoader } from "@/components/layout/RouteLoader";

export function EquityBrainLayout() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cnpj = search.replace(/\D/g, "");
    if (cnpj.length === 14) {
      navigate(`/equity-brain/empresa/${cnpj}`);
      setSearch("");
    }
  }

  return (
    <DealDrawerProvider>
      <SidebarProvider defaultOpen>
        <div className="dark min-h-screen w-full bg-zinc-950 text-zinc-100 flex">
          <EBSidebar />
          <SidebarInset className="bg-zinc-950 min-w-0 flex-1">
            <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-30 flex items-center gap-2 px-3 md:px-6">
              <SidebarTrigger className="text-zinc-400 hover:text-zinc-100" />
              <form onSubmit={onSubmit} className="relative w-48 md:w-72 max-w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Busca CNPJ"
                  className="pl-9 h-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-700"
                />
              </form>
              <div className="ml-2 hidden md:block">
                <VerticalSelector />
              </div>
              <div className="ml-auto text-[11px] text-zinc-500 hidden lg:block">
                Cockpit interno · admin / advisor
              </div>
            </header>
            <main className="flex-1 overflow-auto">
              <Suspense fallback={<ContentLoader dark />}>
                <Outlet />
              </Suspense>
            </main>
          </SidebarInset>
          <MariBrainFab />
        </div>
      </SidebarProvider>
    </DealDrawerProvider>
  );
}
