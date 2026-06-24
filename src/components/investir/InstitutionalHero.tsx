import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; to?: string };

export function InstitutionalHero({
  kicker,
  title,
  subtitle,
  image,
  crumbs,
  children,
  align = "left",
}: {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  image?: string;
  crumbs?: Crumb[];
  children?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <section className="relative bg-carbon text-bone border-b border-bone/10 overflow-hidden">
      {image && (
        <>
          <img
            src={image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-25"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-carbon/70 via-carbon/80 to-carbon" />
        </>
      )}
      <div
        className={cn(
          "relative max-w-[1200px] mx-auto px-5 md:px-6 py-12 md:py-20",
          align === "center" && "text-center",
        )}
      >
        {crumbs && crumbs.length > 0 && (
          <nav className="text-xs text-bone/50 mb-4 flex flex-wrap items-center gap-1">
            <Link to="/investir" className="hover:text-volt">
              mari.invest
            </Link>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                {c.to ? (
                  <Link to={c.to} className="hover:text-volt">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-bone/80">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {kicker && (
          <div className="text-[11px] uppercase tracking-[0.18em] text-volt font-semibold mb-3">
            {kicker}
          </div>
        )}
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] max-w-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 md:mt-6 text-base md:text-lg text-bone/70 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-6 md:mt-8">{children}</div>}
      </div>
    </section>
  );
}
