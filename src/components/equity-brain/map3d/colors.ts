// Espelha PHASE_COLORS de MandateMap.tsx em RGB para uso em Deck.gl.
export type RGBA = [number, number, number, number];

export const PHASE_COLORS_RGB: Record<string, [number, number, number]> = {
  match: [59, 130, 246],     // #3b82f6
  cold: [148, 163, 184],     // #94a3b8
  nbo: [245, 158, 11],       // #f59e0b
  spa: [139, 92, 246],       // #8b5cf6
  closed: [16, 185, 129],    // #10b981
  cancelado: [239, 68, 68],  // #ef4444
};

export const VOLT_RGB: [number, number, number] = [217, 245, 100]; // #D9F564

export function colorByPhase(phase: string | null | undefined, alpha = 220): RGBA {
  if (!phase) return [...VOLT_RGB, alpha];
  const rgb = PHASE_COLORS_RGB[phase] ?? VOLT_RGB;
  return [rgb[0], rgb[1], rgb[2], alpha];
}
