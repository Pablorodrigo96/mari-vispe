import { cn } from '@/lib/utils';

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
}

interface Connection {
  from: number;
  to: number;
  opacity: number;
}

const particles: Particle[] = [
  { x: 5, y: 10, size: 2, opacity: 0.3, delay: 0, duration: 8 },
  { x: 15, y: 80, size: 1.5, opacity: 0.2, delay: 1.2, duration: 7 },
  { x: 25, y: 30, size: 2.5, opacity: 0.25, delay: 0.5, duration: 9 },
  { x: 35, y: 65, size: 1, opacity: 0.15, delay: 2, duration: 6 },
  { x: 45, y: 15, size: 3, opacity: 0.35, delay: 0.8, duration: 10 },
  { x: 55, y: 85, size: 1.5, opacity: 0.2, delay: 1.5, duration: 7 },
  { x: 65, y: 40, size: 2, opacity: 0.3, delay: 0.3, duration: 8 },
  { x: 75, y: 70, size: 1, opacity: 0.15, delay: 2.5, duration: 6 },
  { x: 85, y: 20, size: 2.5, opacity: 0.25, delay: 1, duration: 9 },
  { x: 92, y: 55, size: 1.5, opacity: 0.2, delay: 0.7, duration: 7 },
  { x: 10, y: 50, size: 2, opacity: 0.2, delay: 1.8, duration: 8 },
  { x: 30, y: 90, size: 1, opacity: 0.15, delay: 2.2, duration: 6 },
  { x: 50, y: 45, size: 3, opacity: 0.3, delay: 0.4, duration: 10 },
  { x: 70, y: 5, size: 1.5, opacity: 0.2, delay: 1.6, duration: 7 },
  { x: 88, y: 75, size: 2, opacity: 0.25, delay: 0.9, duration: 9 },
  { x: 20, y: 60, size: 1, opacity: 0.1, delay: 3, duration: 6 },
  { x: 60, y: 25, size: 2.5, opacity: 0.2, delay: 1.3, duration: 8 },
  { x: 80, y: 50, size: 1.5, opacity: 0.15, delay: 2.8, duration: 7 },
];

const connections: Connection[] = [
  { from: 0, to: 2, opacity: 0.06 },
  { from: 2, to: 4, opacity: 0.05 },
  { from: 4, to: 8, opacity: 0.04 },
  { from: 6, to: 12, opacity: 0.06 },
  { from: 8, to: 9, opacity: 0.05 },
  { from: 10, to: 6, opacity: 0.04 },
  { from: 12, to: 16, opacity: 0.05 },
  { from: 14, to: 17, opacity: 0.04 },
];

interface ParticlesBackgroundProps {
  variant?: 'dark' | 'light';
  className?: string;
}

export function ParticlesBackground({ variant = 'dark', className }: ParticlesBackgroundProps) {
  const color = variant === 'dark' ? '255,255,255' : '0,0,0';

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {/* SVG connection lines */}
      <svg className="absolute inset-0 w-full h-full">
        {connections.map((conn, i) => {
          const from = particles[conn.from];
          const to = particles[conn.to];
          return (
            <line
              key={i}
              x1={`${from.x}%`}
              y1={`${from.y}%`}
              x2={`${to.x}%`}
              y2={`${to.y}%`}
              stroke={`rgba(${color},${conn.opacity})`}
              strokeWidth="1"
            />
          );
        })}
      </svg>

      {/* Floating dots */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: `rgba(${color},${p.opacity})`,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
