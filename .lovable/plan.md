# Plano: novos setores e modelo de valuation

## 1. Novo setor: "Serviços de Lazer / Ativos Leves (Asset-Light)"

Negócios de lazer com baixa imobilização (clubes de assinatura, esportes, eventos recorrentes, lazer infantil, espaços compartilhados, experiências). Asset-light = margem alta + caixa rápido + múltiplos próximos de Serviços/SaaS.

**`src/lib/valuationCalculator.ts`** — adicionar em `sectorMultiples`:
```
"Lazer Asset-Light": { rev: 2.0, ebitda: 8.5, profit: 14.0 }
```
(entre Serviços e Telecom; benchmark calibrado entre Serviços `1.5/7.5/12.5` e SaaS, refletindo recorrência + ativos leves).

**`src/lib/sectorMapping.ts`** — adicionar `'Lazer Asset-Light'` ao type `BenchmarkKey` e duas opções no `SECTOR_OPTIONS` (bloco "Serviços B2B / B2C"):
- `{ label: 'Serviços de Lazer / Asset-Light (clubes, esportes, experiências)', benchmarkKey: 'Lazer Asset-Light' }`
- `{ label: 'Lazer / Entretenimento (parques, cinemas, eventos)', benchmarkKey: 'Serviços' }` (asset-heavy → proxy Serviços)

## 2. Novo tipo de empresa: "Franqueadora" (DCF)

Franqueadora = receita de royalties/taxas, capex baixíssimo, margem alta, crescimento moderado-alto via expansão de unidades, risco menor que startup (modelo provado) mas maior que tradicional (depende de rede).

**`src/lib/dcfCalculator.ts`** — adicionar em `companyTypeConfig`:
```
franqueadora: {
  label: 'Franqueadora',
  description: 'Receita recorrente de royalties + taxa de franquia. CapEx baixo, margem alta, crescimento via expansão de unidades. Premissa: rede consolidada com pipeline de novos franqueados.',
  growthRate: 0.25,        // 25% — entre nova economia (22%) e startup (35%)
  riskPremium: 0.0650,     // 6.5% — abaixo de nova economia (7.23%) por modelo provado
  wacc: 0.2150,            // 21.5% (Selic 15% + 6.5%)
  marginGrowth: true,      // +1 p.p./ano (alavancagem operacional via novas unidades)
}
```

**`src/components/valuation/StepCompanyType.tsx`** — adicionar ícone:
```
import { Store } from 'lucide-react';
const companyTypeIcons = { tradicional: Building2, nova_economia: Zap, startup: Rocket, franqueadora: Store };
```
O grid passa de 3 para 4 cards (`md:grid-cols-2 lg:grid-cols-4` ou manter 2 colunas em md).

**`src/components/valuation/StepCompanyProfile.tsx`** — adicionar 4ª opção `franqueadora` no array `companyTypes` (usado no wizard de Múltiplos), com ícone `Store` e copy curta ("Receita de royalties + expansão de rede").

## 3. Pontos que NÃO mudam

- Fórmula de DCF, fórmula de Múltiplos, Selic 15%, terminal growth 4.5%, range ±6% — intactos.
- `valuation_history` schema — `company_type` já é `text`, aceita `'franqueadora'` sem migration.
- `ValuationReportDialog`/`DCFReportDialog` — leem `companyTypeLabel` dinamicamente, não precisam mudar.
- `CertifierWizard` (usa `'Outros'` fixo) e `diagnosticCalculator` — sem impacto.
- Memórias, RLS, edge functions — nenhuma mudança.

## 4. Validação

- Smoke manual: `/valuation` (Múltiplos) e `/valuation-dcf` selecionando os 4 tipos + novo setor.
- Conferir que select de setor em `Valuation.tsx`/`ValuationMultiplos.tsx` lista as duas novas entradas.

## Resumo de arquivos

- `src/lib/valuationCalculator.ts` — +1 entrada em `sectorMultiples`
- `src/lib/sectorMapping.ts` — +1 chave em `BenchmarkKey`, +2 em `SECTOR_OPTIONS`
- `src/lib/dcfCalculator.ts` — +1 entrada em `companyTypeConfig`
- `src/components/valuation/StepCompanyType.tsx` — +1 ícone, grid responsivo
- `src/components/valuation/StepCompanyProfile.tsx` — +1 opção
