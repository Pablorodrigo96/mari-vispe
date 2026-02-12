// Geocoding module for Brazilian cities
// Uses multi-layer caching: memory → localStorage → static dictionary → Nominatim API → state capital fallback

export interface CityCoordinates {
  lat: number;
  lng: number;
}

// State capitals (fallback when city is not found)
export const stateCapitals: Record<string, CityCoordinates> = {
  AC: { lat: -9.9754, lng: -67.8249 },
  AL: { lat: -9.6658, lng: -35.7353 },
  AM: { lat: -3.119, lng: -60.0217 },
  AP: { lat: 0.034, lng: -51.0694 },
  BA: { lat: -12.9714, lng: -38.5124 },
  CE: { lat: -3.7172, lng: -38.5433 },
  DF: { lat: -15.7975, lng: -47.8919 },
  ES: { lat: -20.3155, lng: -40.3128 },
  GO: { lat: -16.6869, lng: -49.2648 },
  MA: { lat: -2.5297, lng: -44.2825 },
  MG: { lat: -19.9167, lng: -43.9345 },
  MS: { lat: -20.4697, lng: -54.6201 },
  MT: { lat: -15.596, lng: -56.0969 },
  PA: { lat: -1.4558, lng: -48.5024 },
  PB: { lat: -7.115, lng: -34.863 },
  PE: { lat: -8.0476, lng: -34.877 },
  PI: { lat: -5.0892, lng: -42.8019 },
  PR: { lat: -25.4284, lng: -49.2733 },
  RJ: { lat: -22.9068, lng: -43.1729 },
  RN: { lat: -5.7945, lng: -35.211 },
  RO: { lat: -8.7612, lng: -63.9004 },
  RR: { lat: 2.8195, lng: -60.6714 },
  RS: { lat: -30.0346, lng: -51.2177 },
  SC: { lat: -27.5954, lng: -48.548 },
  SE: { lat: -10.9091, lng: -37.0677 },
  SP: { lat: -23.5505, lng: -46.6333 },
  TO: { lat: -10.1689, lng: -48.3317 },
};

// Static dictionary for major cities (fast synchronous lookup)
const cityCoordinates: Record<string, CityCoordinates> = {
  'são paulo': { lat: -23.5505, lng: -46.6333 },
  'campinas': { lat: -22.9099, lng: -47.0626 },
  'santos': { lat: -23.9608, lng: -46.3336 },
  'ribeirão preto': { lat: -21.1767, lng: -47.8208 },
  'sorocaba': { lat: -23.5015, lng: -47.4526 },
  'são josé dos campos': { lat: -23.1896, lng: -45.8841 },
  'osasco': { lat: -23.5325, lng: -46.7917 },
  'guarulhos': { lat: -23.4538, lng: -46.5333 },
  'santo andré': { lat: -23.6737, lng: -46.5432 },
  'são bernardo do campo': { lat: -23.6914, lng: -46.5646 },
  'piracicaba': { lat: -22.7338, lng: -47.6476 },
  'jundiaí': { lat: -23.1857, lng: -46.8978 },
  'bauru': { lat: -22.3246, lng: -49.0871 },
  'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
  'niterói': { lat: -22.8833, lng: -43.1036 },
  'petrópolis': { lat: -22.5046, lng: -43.1824 },
  'belo horizonte': { lat: -19.9167, lng: -43.9345 },
  'uberlândia': { lat: -18.9186, lng: -48.2772 },
  'juiz de fora': { lat: -21.7642, lng: -43.3503 },
  'contagem': { lat: -19.9312, lng: -44.0539 },
  'curitiba': { lat: -25.4284, lng: -49.2733 },
  'londrina': { lat: -23.3045, lng: -51.1696 },
  'maringá': { lat: -23.4273, lng: -51.9375 },
  'porto alegre': { lat: -30.0346, lng: -51.2177 },
  'caxias do sul': { lat: -29.1681, lng: -51.1794 },
  'gravataí': { lat: -29.9439, lng: -50.992 },
  'canoas': { lat: -29.9178, lng: -51.1837 },
  'novo hamburgo': { lat: -29.6788, lng: -51.1306 },
  'são leopoldo': { lat: -29.7604, lng: -51.1472 },
  'florianópolis': { lat: -27.5954, lng: -48.548 },
  'joinville': { lat: -26.3045, lng: -48.8487 },
  'blumenau': { lat: -26.9194, lng: -49.0661 },
  'balneário camboriú': { lat: -26.9906, lng: -48.6352 },
  'salvador': { lat: -12.9714, lng: -38.5124 },
  'recife': { lat: -8.0476, lng: -34.877 },
  'fortaleza': { lat: -3.7172, lng: -38.5433 },
  'belém': { lat: -1.4558, lng: -48.5024 },
  'goiânia': { lat: -16.6869, lng: -49.2648 },
  'brasília': { lat: -15.7975, lng: -47.8919 },
  'manaus': { lat: -3.119, lng: -60.0217 },
  'são luís': { lat: -2.5297, lng: -44.2825 },
  'campo grande': { lat: -20.4697, lng: -54.6201 },
  'cuiabá': { lat: -15.596, lng: -56.0969 },
  'vitória': { lat: -20.3155, lng: -40.3128 },
  'natal': { lat: -5.7945, lng: -35.211 },
  'joão pessoa': { lat: -7.115, lng: -34.863 },
  'maceió': { lat: -9.6658, lng: -35.7353 },
  'aracaju': { lat: -10.9091, lng: -37.0677 },
  'teresina': { lat: -5.0892, lng: -42.8019 },
  'palmas': { lat: -10.1689, lng: -48.3317 },
  'porto velho': { lat: -8.7612, lng: -63.9004 },
  'rio branco': { lat: -9.9754, lng: -67.8249 },
  'boa vista': { lat: 2.8195, lng: -60.6714 },
  'macapá': { lat: 0.034, lng: -51.0694 },
};

// ---- Caching layers ----

const CACHE_KEY = 'brazil_geocode_cache';
const memoryCache = new Map<string, CityCoordinates>();

function cacheKey(city: string, state: string): string {
  return `${city.toLowerCase().trim()}|${state.toUpperCase().trim()}`;
}

function loadLocalStorageCache(): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, CityCoordinates>;
    for (const [k, v] of Object.entries(parsed)) {
      memoryCache.set(k, v);
    }
  } catch {
    // ignore corrupt cache
  }
}

function saveToLocalStorage(key: string, coords: CityCoordinates): void {
  memoryCache.set(key, coords);
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[key] = coords;
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    // storage full or unavailable
  }
}

// Load localStorage cache on module init
loadLocalStorageCache();

// ---- Synchronous lookup (fast path) ----

export function getCoordinates(city: string | null, state: string | null): CityCoordinates | null {
  if (city && state) {
    const key = cacheKey(city, state);
    const cached = memoryCache.get(key);
    if (cached) return cached;
  }

  if (city) {
    const coords = cityCoordinates[city.toLowerCase().trim()];
    if (coords) return coords;
  }

  if (state) {
    const coords = stateCapitals[state.toUpperCase().trim()];
    if (coords) return coords;
  }

  return null;
}

// ---- Nominatim API (async, rate-limited) ----

let lastRequestTime = 0;

async function fetchFromNominatim(city: string, state: string): Promise<CityCoordinates | null> {
  // Respect 1 req/s rate limit
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastRequestTime));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime = Date.now();

  try {
    const params = new URLSearchParams({
      city,
      state,
      country: 'Brazil',
      format: 'json',
      limit: '1',
    });

    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'QueroNegocio/1.0 (marketplace app)' },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // network error
  }
  return null;
}

// ---- Async lookup (full pipeline) ----

export async function getCoordinatesAsync(
  city: string | null,
  state: string | null
): Promise<CityCoordinates | null> {
  // 1. Try synchronous path first (memory cache, static dict, state capital)
  if (city && state) {
    const key = cacheKey(city, state);
    const cached = memoryCache.get(key);
    if (cached) return cached;

    // Static dictionary
    const staticCoords = cityCoordinates[city.toLowerCase().trim()];
    if (staticCoords) {
      saveToLocalStorage(key, staticCoords);
      return staticCoords;
    }
  }

  if (city) {
    const staticCoords = cityCoordinates[city.toLowerCase().trim()];
    if (staticCoords) return staticCoords;
  }

  // 2. Try Nominatim API
  if (city && state) {
    const coords = await fetchFromNominatim(city, state);
    if (coords) {
      const key = cacheKey(city, state);
      saveToLocalStorage(key, coords);
      return coords;
    }
  }

  // 3. Fallback to state capital
  if (state) {
    const coords = stateCapitals[state.toUpperCase().trim()];
    if (coords) return coords;
  }

  return null;
}

// ---- Batch resolver for map component ----

export async function resolveAllCoordinates(
  items: Array<{ city: string | null; state: string | null; id: string }>
): Promise<Map<string, CityCoordinates>> {
  const results = new Map<string, CityCoordinates>();
  const needsApi: typeof items = [];

  // First pass: resolve from sync sources
  for (const item of items) {
    const sync = getCoordinates(item.city, item.state);
    if (sync) {
      results.set(item.id, sync);
    } else if (item.city && item.state) {
      needsApi.push(item);
    }
  }

  // Second pass: resolve unknowns via API (sequentially to respect rate limit)
  for (const item of needsApi) {
    const coords = await getCoordinatesAsync(item.city, item.state);
    if (coords) {
      results.set(item.id, coords);
    }
  }

  return results;
}
