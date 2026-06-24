import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export type HubItem = {
  to: string;
  title: string;
  description: string;
  image?: string;
};

export function HubGrid({ items }: { items: HubItem[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="group relative overflow-hidden rounded-2xl bg-graphite/60 border border-bone/10 hover:border-volt/40 transition-all"
        >
          {item.image && (
            <div className="aspect-[16/9] overflow-hidden">
              <img
                src={item.image}
                alt=""
                className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
                loading="lazy"
              />
            </div>
          )}
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-bone font-semibold text-lg leading-tight">
                {item.title}
              </h3>
              <ArrowRight className="w-4 h-4 text-volt opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
            </div>
            <p className="text-bone/60 text-sm mt-2 leading-relaxed">
              {item.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
