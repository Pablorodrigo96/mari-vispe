import { Link } from "react-router-dom";
import type { StoryItem } from "@/types/social";

export function StoriesBar({ stories }: { stories: StoryItem[] }) {
  return (
    <div className="overflow-x-auto no-scrollbar -mx-5 md:-mx-6 px-5 md:px-6 py-4 md:py-5">
      <ul className="flex gap-3 md:gap-4 min-w-min">
        {stories.map((s) => (
          <li key={s.id} className="shrink-0 w-[78px] md:w-[88px]">
            <Link to={`/investir/empresa/${s.company.symbol}`} className="block group">
              <div className="relative">
                <div className="p-[2px] rounded-full bg-gradient-to-tr from-volt via-volt to-amber-300">
                  <div className="p-[2px] rounded-full bg-carbon">
                    <img
                      src={s.company.avatar || s.media}
                      alt={s.company.name}
                      className="w-[70px] h-[70px] md:w-[80px] md:h-[80px] rounded-full object-cover"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-1.5 text-[11px] md:text-xs text-bone/85 text-center truncate group-hover:text-volt transition-colors">
                {s.company.name.split(" ")[0]}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
