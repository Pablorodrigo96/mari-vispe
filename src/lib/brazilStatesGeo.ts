/**
 * Loader do GeoJSON dos 27 estados brasileiros.
 * Carrega lazy de CDN (~80KB) e cacheia em localStorage por 24h
 * para evitar inflar o bundle e bater o CDN a cada navegação.
 */

const CACHE_KEY = "eb_brazil_states_geojson_v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

const SOURCE_URL =
  "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson";

export interface BrazilStatesGeoJSON {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { name: string; sigla?: string; [k: string]: unknown };
    geometry: any;
  }>;
}

// O GeoJSON original usa `name` (ex: "São Paulo"). Convertemos para sigla.
const NAME_TO_UF: Record<string, string> = {
  "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM",
  "Bahia": "BA", "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES",
  "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
  "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
  "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ",
  "Rio Grande do Norte": "RN", "Rio Grande do Sul": "RS", "Rondônia": "RO",
  "Roraima": "RR", "Santa Catarina": "SC", "São Paulo": "SP",
  "Sergipe": "SE", "Tocantins": "TO",
};

let memoryCache: BrazilStatesGeoJSON | null = null;

export async function loadBrazilStatesGeo(): Promise<BrazilStatesGeoJSON> {
  if (memoryCache) return memoryCache;

  // Cache em localStorage
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { ts, data } = JSON.parse(raw) as { ts: number; data: BrazilStatesGeoJSON };
      if (Date.now() - ts < CACHE_TTL_MS && data?.features?.length === 27) {
        memoryCache = enrichWithUf(data);
        return memoryCache;
      }
    }
  } catch {
    // ignora cache corrompido
  }

  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Falha ao carregar GeoJSON dos estados (${res.status})`);
  const data = (await res.json()) as BrazilStatesGeoJSON;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // localStorage cheio — segue com cache em memória
  }

  memoryCache = enrichWithUf(data);
  return memoryCache;
}

function enrichWithUf(geo: BrazilStatesGeoJSON): BrazilStatesGeoJSON {
  return {
    ...geo,
    features: geo.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        sigla: NAME_TO_UF[f.properties.name] ?? f.properties.sigla ?? "",
      },
    })),
  };
}
