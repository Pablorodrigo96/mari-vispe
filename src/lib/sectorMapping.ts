/**
 * Lista expandida de setores exibida nos seletores de Valuation,
 * com DE-PARA para as chaves do `sectorMultiples` em valuationCalculator.ts.
 *
 * IMPORTANTE: Não alteramos o cálculo de valuation nem os múltiplos de mercado.
 * Quando um setor novo não tem benchmark próprio, mapeamos para o setor
 * existente mais próximo (proxy) para que o valuation continue funcionando.
 */

export type BenchmarkKey =
  | 'SaaS'
  | 'Fintech'
  | 'E-commerce'
  | 'Saúde'
  | 'Agronegócio'
  | 'Educação'
  | 'Logística'
  | 'Indústria'
  | 'Varejo'
  | 'Serviços'
  | 'Outros';

export interface SectorOption {
  /** Label exibido na UI (gravado em valuation_history.segment) */
  label: string;
  /** Chave do sectorMultiples usada para os cálculos (proxy quando necessário) */
  benchmarkKey: BenchmarkKey;
}

/**
 * Ordem importa: setores prioritários para a mari aparecem primeiro.
 * "Tecnologia & Telecom (ISP)" abre a lista por ser foco estratégico.
 */
export const SECTOR_OPTIONS: SectorOption[] = [
  // === Foco mari ===
  { label: 'Tecnologia & Telecom (ISP / Provedores de Internet)', benchmarkKey: 'SaaS' },
  { label: 'Tecnologia (Software / SaaS)', benchmarkKey: 'SaaS' },
  { label: 'Telecom (Operadoras / Infraestrutura)', benchmarkKey: 'SaaS' },
  { label: 'TI / Outsourcing / Data Center', benchmarkKey: 'Serviços' },

  // === Financeiro ===
  { label: 'Fintech', benchmarkKey: 'Fintech' },
  { label: 'Serviços Financeiros / Crédito', benchmarkKey: 'Fintech' },
  { label: 'Seguros / Insurtech', benchmarkKey: 'Fintech' },

  // === Digital ===
  { label: 'E-commerce / Marketplace', benchmarkKey: 'E-commerce' },
  { label: 'Marketing Digital / Mídia / Publicidade', benchmarkKey: 'Serviços' },

  // === Saúde ===
  { label: 'Saúde (Clínicas / Hospitais)', benchmarkKey: 'Saúde' },
  { label: 'Laboratórios / Diagnósticos', benchmarkKey: 'Saúde' },
  { label: 'Farmacêutica / Healthtech', benchmarkKey: 'Saúde' },
  { label: 'Beleza & Estética', benchmarkKey: 'Serviços' },

  // === Educação ===
  { label: 'Educação / Edtech', benchmarkKey: 'Educação' },

  // === Indústria & infraestrutura ===
  { label: 'Indústria / Manufatura', benchmarkKey: 'Indústria' },
  { label: 'Construção Civil / Engenharia', benchmarkKey: 'Indústria' },
  { label: 'Imobiliário / Real Estate', benchmarkKey: 'Indústria' },
  { label: 'Energia & Utilities', benchmarkKey: 'Indústria' },
  { label: 'Mineração / Metalurgia', benchmarkKey: 'Indústria' },
  { label: 'Automotivo / Autopeças', benchmarkKey: 'Indústria' },
  { label: 'Química / Petroquímica', benchmarkKey: 'Indústria' },

  // === Consumo & varejo ===
  { label: 'Varejo / Comércio', benchmarkKey: 'Varejo' },
  { label: 'Alimentos & Bebidas (Indústria)', benchmarkKey: 'Indústria' },
  { label: 'Restaurantes / Food Service', benchmarkKey: 'Serviços' },
  { label: 'Bens de Consumo', benchmarkKey: 'Varejo' },

  // === Logística & agro ===
  { label: 'Logística / Transporte', benchmarkKey: 'Logística' },
  { label: 'Agronegócio / Agro', benchmarkKey: 'Agronegócio' },
  { label: 'Pet & Veterinária', benchmarkKey: 'Varejo' },

  // === Serviços B2B / B2C ===
  { label: 'Consultoria / Serviços Profissionais', benchmarkKey: 'Serviços' },
  { label: 'Jurídico / Contábil', benchmarkKey: 'Serviços' },
  { label: 'Recursos Humanos / Recrutamento', benchmarkKey: 'Serviços' },
  { label: 'Turismo / Hospitalidade / Hotelaria', benchmarkKey: 'Serviços' },
  { label: 'Mídia / Entretenimento / Eventos', benchmarkKey: 'Serviços' },
  { label: 'Limpeza / Facilities / Segurança', benchmarkKey: 'Serviços' },

  // === Outros ===
  { label: 'Outros', benchmarkKey: 'Outros' },
];

/**
 * Resolve o label exibido para a chave de benchmark (proxy de mercado).
 * Retorna o próprio label se não houver match — `normalizeSegment` faz o resto.
 */
export function resolveBenchmarkKey(label: string): string {
  if (!label) return 'Outros';
  const exact = SECTOR_OPTIONS.find((s) => s.label === label);
  if (exact) return exact.benchmarkKey;
  const ci = SECTOR_OPTIONS.find(
    (s) => s.label.toLowerCase() === label.toLowerCase()
  );
  if (ci) return ci.benchmarkKey;
  return label;
}
