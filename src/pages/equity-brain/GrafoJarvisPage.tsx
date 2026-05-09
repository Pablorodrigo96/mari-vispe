import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Map as MapIcon, Maximize2, Minimize2, Network, BookOpen } from "lucide-react";
import { JarvisGraph3D } from "@/components/equity-brain/jarvis/JarvisGraph3D";
import { Button } from "@/components/ui/button";

export default function GrafoJarvisPage() {
  const [presentation, setPresentation] = useState(false);

  useEffect(() => {
    if (presentation) {
      document.body.classList.add("eb-presentation");
      const style = document.createElement("style");
      style.id = "eb-presentation-style";
      style.textContent = `
        body.eb-presentation aside { display: none !important; }
        body.eb-presentation header { display: none !important; }
        body.eb-presentation main, body.eb-presentation [role="main"] { padding: 0 !important; }
      `;
      document.head.appendChild(style);
    }
    return () => {
      document.body.classList.remove("eb-presentation");
      document.getElementById("eb-presentation-style")?.remove();
    };
  }, [presentation]);

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-950">
      {!presentation && (
        <div className="flex items-center gap-2 px-2 sm:px-4 py-2 sm:py-2.5 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-emerald-400 uppercase whitespace-nowrap">
              Jarvis 3D
            </span>
            <span className="hidden md:inline text-[10px] text-zinc-500 truncate">
              · cérebro estratégico imersivo · sellers · buyers · teses · platforms
            </span>
          </div>

          <div className="flex-1" />

          <Link
            to="/equity-brain/grafo-jarvis/guia"
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-900/40 text-xs transition-colors"
            aria-label="Guia"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Guia</span>
          </Link>

          <Link
            to="/equity-brain/grafo"
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-emerald-300 hover:bg-zinc-800 text-xs transition-colors"
            aria-label="Modo 2D"
          >
            <Network className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Modo 2D</span>
          </Link>

          <Link
            to="/equity-brain/mapa"
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-emerald-300 hover:bg-zinc-800 text-xs transition-colors"
            aria-label="Mapa"
          >
            <MapIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mapa</span>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPresentation(true)}
            className="hidden md:flex bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-emerald-300 text-xs h-8"
          >
            <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
            Modo apresentação
          </Button>
        </div>
      )}

      {presentation && (
        <button
          onClick={() => setPresentation(false)}
          className="fixed top-3 right-3 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900/90 border border-zinc-700 text-zinc-300 hover:text-emerald-300 text-xs backdrop-blur"
        >
          <Minimize2 className="h-3.5 w-3.5" />
          Sair
        </button>
      )}

      <div className="flex-1 relative min-h-0">
        <JarvisGraph3D />
      </div>
    </div>
  );
}
