import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "bone" | "carbon" | "graphite" | "volt";

const toneClass: Record<Tone, string> = {
  bone: "bg-[#FAFAF7] text-carbon",
  carbon: "bg-carbon text-bone",
  graphite: "bg-[#1a1a1a] text-bone",
  volt: "bg-volt text-carbon",
};

export function SectionBand({
  tone = "carbon",
  className,
  innerClassName,
  children,
  id,
  compact = false,
}: {
  tone?: Tone;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
  id?: string;
  compact?: boolean;
}) {
  return (
    <section id={id} className={cn(toneClass[tone], className)}>
      <div
        className={cn(
          "max-w-[1200px] mx-auto px-5 md:px-6",
          compact ? "py-10 md:py-14" : "py-12 md:py-24",
          innerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
