// Static coordinate dictionary for Brazilian cities and state capitals
// Used to position map markers from listings' city/state fields

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

// Major cities dictionary (city name lowercase -> coordinates)
const cityCoordinates: Record<string, CityCoordinates> = {
  // São Paulo
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

  // Rio de Janeiro
  'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
  'niterói': { lat: -22.8833, lng: -43.1036 },
  'petrópolis': { lat: -22.5046, lng: -43.1824 },

  // Minas Gerais
  'belo horizonte': { lat: -19.9167, lng: -43.9345 },
  'uberlândia': { lat: -18.9186, lng: -48.2772 },
  'juiz de fora': { lat: -21.7642, lng: -43.3503 },
  'contagem': { lat: -19.9312, lng: -44.0539 },

  // Paraná
  'curitiba': { lat: -25.4284, lng: -49.2733 },
  'londrina': { lat: -23.3045, lng: -51.1696 },
  'maringá': { lat: -23.4273, lng: -51.9375 },

  // Rio Grande do Sul
  'porto alegre': { lat: -30.0346, lng: -51.2177 },
  'caxias do sul': { lat: -29.1681, lng: -51.1794 },

  // Santa Catarina
  'florianópolis': { lat: -27.5954, lng: -48.548 },
  'joinville': { lat: -26.3045, lng: -48.8487 },
  'blumenau': { lat: -26.9194, lng: -49.0661 },
  'balneário camboriú': { lat: -26.9906, lng: -48.6352 },

  // Bahia
  'salvador': { lat: -12.9714, lng: -38.5124 },

  // Pernambuco
  'recife': { lat: -8.0476, lng: -34.877 },

  // Ceará
  'fortaleza': { lat: -3.7172, lng: -38.5433 },

  // Pará
  'belém': { lat: -1.4558, lng: -48.5024 },

  // Goiás
  'goiânia': { lat: -16.6869, lng: -49.2648 },

  // Distrito Federal
  'brasília': { lat: -15.7975, lng: -47.8919 },

  // Amazonas
  'manaus': { lat: -3.119, lng: -60.0217 },

  // Maranhão
  'são luís': { lat: -2.5297, lng: -44.2825 },

  // Mato Grosso do Sul
  'campo grande': { lat: -20.4697, lng: -54.6201 },

  // Mato Grosso
  'cuiabá': { lat: -15.596, lng: -56.0969 },

  // Espírito Santo
  'vitória': { lat: -20.3155, lng: -40.3128 },

  // Rio Grande do Norte
  'natal': { lat: -5.7945, lng: -35.211 },

  // Paraíba
  'joão pessoa': { lat: -7.115, lng: -34.863 },

  // Alagoas
  'maceió': { lat: -9.6658, lng: -35.7353 },

  // Sergipe
  'aracaju': { lat: -10.9091, lng: -37.0677 },

  // Piauí
  'teresina': { lat: -5.0892, lng: -42.8019 },

  // Tocantins
  'palmas': { lat: -10.1689, lng: -48.3317 },

  // Rondônia
  'porto velho': { lat: -8.7612, lng: -63.9004 },

  // Acre
  'rio branco': { lat: -9.9754, lng: -67.8249 },

  // Roraima
  'boa vista': { lat: 2.8195, lng: -60.6714 },

  // Amapá
  'macapá': { lat: 0.034, lng: -51.0694 },
};

export function getCoordinates(city: string | null, state: string | null): CityCoordinates | null {
  // Try city first
  if (city) {
    const coords = cityCoordinates[city.toLowerCase().trim()];
    if (coords) return coords;
  }

  // Fallback to state capital
  if (state) {
    const stateUpper = state.toUpperCase().trim();
    const coords = stateCapitals[stateUpper];
    if (coords) return coords;
  }

  return null;
}
