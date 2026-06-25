import { Link } from "react-router-dom";
import { HUMAN_CATEGORIES } from "@/types/social";

export function CategoryStrip() {
  return (
    <div className="overflow-x-auto no-scrollbar -mx-5 md:-mx-6 px-5 md:px-6">
      <ul className="flex gap-2 min-w-min pb-1">
        {HUMAN_CATEGORIES.map((c) => (
          <li key={c.id} className="shrink-0">
            <Link
              to={`/investir/descobrir?cat=${c.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-bone/8 hover:bg-bone/15 border border-bone/10 text-bone/85 text-[12px] font-medium transition-colors"
            >
              <span>{c.emoji}</span>
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
