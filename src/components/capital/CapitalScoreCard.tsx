import { useEffect, useState } from 'react';

interface CapitalScoreCardProps {
  score: number | null;
  size?: 'sm' | 'lg';
}

const getScoreConfig = (score: number) => {
  if (score >= 80) return { label: 'Excelente', color: 'text-emerald-500', stroke: 'stroke-emerald-500', bg: 'bg-emerald-500/10' };
  if (score >= 60) return { label: 'Bom', color: 'text-blue-500', stroke: 'stroke-blue-500', bg: 'bg-blue-500/10' };
  if (score >= 40) return { label: 'Moderado', color: 'text-amber-500', stroke: 'stroke-amber-500', bg: 'bg-amber-500/10' };
  return { label: 'Inicial', color: 'text-muted-foreground', stroke: 'stroke-muted-foreground', bg: 'bg-muted' };
};

export function CapitalScoreCard({ score, size = 'lg' }: CapitalScoreCardProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const s = score ?? 0;
  const config = getScoreConfig(s);

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 1200;
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * s));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [s]);

  const r = size === 'lg' ? 45 : 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (animatedScore / 100) * circumference;
  const svgSize = size === 'lg' ? 120 : 72;

  return (
    <div className={`flex flex-col items-center gap-2 ${config.bg} rounded-xl p-4`}>
      <svg width={svgSize} height={svgSize} className="-rotate-90">
        <circle cx={svgSize / 2} cy={svgSize / 2} r={r} fill="none" strokeWidth={size === 'lg' ? 8 : 5} className="stroke-muted" />
        <circle
          cx={svgSize / 2} cy={svgSize / 2} r={r} fill="none"
          strokeWidth={size === 'lg' ? 8 : 5}
          strokeLinecap="round"
          className={`${config.stroke} transition-all duration-1000`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="text-center -mt-1">
        <p className={`font-bold ${size === 'lg' ? 'text-2xl' : 'text-lg'} ${config.color}`}>{animatedScore}</p>
        <p className={`text-xs ${config.color} font-medium`}>{config.label}</p>
      </div>
    </div>
  );
}
