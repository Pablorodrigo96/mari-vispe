import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  className?: string;
  children?: React.ReactNode;
}

export function BBGPanel({ className = '', children }: Props) {
  return (
    <section
      className={`border border-zinc-800 bg-zinc-950/40 rounded-lg p-4 ${className}`}
    >
      {children}
    </section>
  );
}

export function BBGHeader({ title, accent }: { title: string; accent?: boolean }) {
  return (
    <div className="mb-3">
      <h2
        className={`text-[10px] uppercase tracking-[0.14em] font-semibold ${
          accent ? 'text-volt' : 'text-zinc-500'
        }`}
      >
        {title}
      </h2>
      <div className="h-px bg-zinc-800 mt-2" />
    </div>
  );
}

export function BBGEmpty({
  title,
  cta,
  to,
}: {
  title: string;
  cta?: string;
  to?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-2 py-4 text-xs text-zinc-500">
      <p className="leading-snug break-words">{title}</p>
      {cta && to && (
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-volt hover:underline font-medium"
        >
          {cta} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
