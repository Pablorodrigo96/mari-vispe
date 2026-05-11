// Parser leve de **bold** inline + suporte a bullets " · "
import { ReactNode } from "react";

export function renderRich(text?: string | null): ReactNode {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

export function RichParagraph({ text, className = "" }: { text?: string | null; className?: string }) {
  if (!text) return null;
  // Separa bullets " · " em lista quando presentes
  const bulletMatch = text.match(/(.+?)([·•] .+)/s);
  if (bulletMatch && (text.match(/ · /g)?.length ?? 0) >= 2) {
    const intro = bulletMatch[1].trim();
    const bullets = text
      .slice(intro.length)
      .split(/ · /)
      .map((b) => b.replace(/^[·•] /, "").trim())
      .filter(Boolean);
    return (
      <div className={className}>
        {intro && <p className="mb-3 break-words">{renderRich(intro)}</p>}
        <ul className="space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="relative pl-4 break-words">
              <span className="absolute left-0 top-[0.6em] h-px w-2 bg-accent" />
              {renderRich(b)}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return <p className={`${className} break-words`}>{renderRich(text)}</p>;
}
