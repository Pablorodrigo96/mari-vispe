import { Check } from "lucide-react";

interface WizardProgressProps {
  steps: { label: string; sub?: string }[];
  current: number;
}

export default function WizardProgress({ steps, current }: WizardProgressProps) {
  return (
    <ol className="space-y-5">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.label} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={[
                  "h-8 w-8 rounded-full border flex items-center justify-center text-xs font-mono transition-all",
                  done
                    ? "bg-volt/20 border-volt text-volt"
                    : active
                    ? "bg-volt text-carbon border-volt shadow-[0_0_24px_-4px_hsl(72_86%_68%/0.6)]"
                    : "bg-transparent border-white/15 text-white/40",
                ].join(" ")}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={[
                    "w-px flex-1 mt-1 mb-[-4px] min-h-[20px] transition-colors",
                    done ? "bg-volt/40" : "bg-white/10",
                  ].join(" ")}
                />
              )}
            </div>
            <div className="pb-4">
              <div
                className={[
                  "text-sm font-semibold transition-colors break-words",
                  active ? "text-bone" : done ? "text-white/70" : "text-white/40",
                ].join(" ")}
              >
                {s.label}
              </div>
              {s.sub && (
                <div className="text-xs text-white/35 mt-0.5 break-words">{s.sub}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
