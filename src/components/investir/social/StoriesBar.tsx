import { useState } from "react";
import type { StoryItem } from "@/types/social";
import { StoryViewer } from "./StoryViewer";

export function StoriesBar({ stories }: { stories: StoryItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <div className="overflow-x-auto no-scrollbar -mx-5 md:-mx-6 px-5 md:px-6 py-4 md:py-5">
        <ul className="flex gap-3 md:gap-4 min-w-min">
          {stories.map((s, idx) => {
            const isFounder = s.actor === "founder";
            return (
              <li key={s.id} className="shrink-0 w-[78px] md:w-[88px]">
                <button
                  onClick={() => setOpen(idx)}
                  className="block group w-full text-left"
                  aria-label={`Story de ${s.company.name}`}
                >
                  <div
                    className={`p-[2px] rounded-full ${
                      s.isLive
                        ? "bg-gradient-to-tr from-pink-500 via-volt to-rose-400 animate-pulse"
                        : isFounder
                        ? "bg-gradient-to-tr from-pink-400 via-volt to-amber-300"
                        : "bg-gradient-to-tr from-volt via-volt to-amber-300"
                    }`}
                  >
                    <div className="p-[2px] rounded-full bg-carbon relative">
                      <img
                        src={(isFounder && s.founderAvatar) || s.company.avatar || s.media}
                        alt={s.company.name}
                        className="w-[70px] h-[70px] md:w-[80px] md:h-[80px] rounded-full object-cover"
                      />
                      {s.isLive && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-wider bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                          ao vivo
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1.5 text-[11px] md:text-xs text-bone/85 text-center truncate group-hover:text-volt transition-colors">
                    {isFounder
                      ? (s.founderName?.split(" ")[0] || "Fundador")
                      : s.company.name.split(" ")[0]}
                  </div>
                  {isFounder && (
                    <div className="text-[9px] text-pink-300 text-center -mt-0.5">fundador</div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {open !== null && (
        <StoryViewer
          stories={stories}
          startIndex={open}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
