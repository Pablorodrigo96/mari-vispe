// Lookup de coordenadas por código IBGE (5570+ municípios brasileiros).
// Aceita códigos com 7 dígitos. Carregado uma única vez via import dinâmico.

import data from "@/data/ibgeMunicipios.json";

const map = data as unknown as Record<string, [number, number]>;

export function getCoordsByIbge(code: string | null | undefined): { lat: number; lng: number } | null {
  if (!code) return null;
  const k = String(code).replace(/\D/g, "");
  if (!k) return null;
  // tenta 7 dígitos e 6 (sem dígito verificador)
  const candidates = [k, k.slice(0, 7), k.slice(0, 6)];
  for (const c of candidates) {
    const v = map[c];
    if (v) return { lat: v[0], lng: v[1] };
  }
  // tenta achar prefixo de 6 dígitos (algumas bases truncam)
  if (k.length === 6) {
    for (const key of Object.keys(map)) {
      if (key.startsWith(k)) {
        const v = map[key];
        return { lat: v[0], lng: v[1] };
      }
    }
  }
  return null;
}
