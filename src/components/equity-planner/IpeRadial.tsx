import { motion } from "framer-motion";

interface Props {
  value: number | null | undefined;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  floor?: number;
}

/**
 * Radial gauge para IPE (0-100).
 * SVG puro, sem lib. Anima do 0 até o valor.
 */
export default function IpeRadial({
  value,
  size = 168,
  stroke = 12,
  label = "IPE",
  sublabel,
  floor = 45,
}: Props) {
  const v = Math.max(0, Math.min(100, Number(value ?? 0)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  const floorDash = (floor / 100) * c;

  // Cor por faixa
  const color =
    v >= 70 ? "#22c55e" : v >= 55 ? "#D9F564" : v >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* trilho */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        {/* marca de piso */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={2}
          fill="none"
          strokeDasharray={`2 ${c}`}
          strokeDashoffset={-floorDash + 1}
        />
        {/* valor */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${dash} ${c}` }}
          transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] uppercase tracking-[0.25em] text-bone/60 font-semibold">
          {label}
        </span>
        <span className="text-4xl font-bold text-bone tabular-nums leading-none mt-1">
          {value ?? "—"}
        </span>
        <span className="text-[10px] text-bone/50 mt-1">
          {sublabel ?? `piso ${floor}`}
        </span>
      </div>
    </div>
  );
}
