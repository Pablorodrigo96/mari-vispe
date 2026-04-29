import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { EBSidebar } from "./EBSidebar";
import { VerticalSelector } from "./VerticalSelector";
import { Input } from "@/components/ui/input";
import { MariBrainFab } from "./mari/MariBrainFab";

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
    <div className="dark min-h-screen bg-zinc-950 text-zinc-100 flex">
      <EBSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-30 flex items-center gap-3 px-6">
          <form onSubmit={onSubmit} className="relative w-72 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Busca por CNPJ (14 dígitos)"
              className="pl-9 h-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-700"
            />
          </form>
          <div className="ml-3">
            <VerticalSelector />
          </div>
          <div className="ml-auto text-xs text-zinc-500">
            Cockpit interno · admin / advisor
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <MariBrainFab />
    </div>
  );
}
