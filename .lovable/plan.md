## 3 correções pontuais

### 1. Carrossel da home rodando rápido demais
**Arquivo:** `src/components/home/HeroCarousel.tsx` (linha 56)
- Hoje: `AUTOPLAY_DELAY = 6500` (6,5s)
- Mudar para `8000` (8s). A barra de progresso já lê dessa constante, então acompanha automaticamente.

### 2. Tela branca ao clicar "Ver Relatório" em valuation antigo
**Causa raiz:** `ValuationReportDialog` e `DCFReportDialog` chamam `result.calculatedAt.toLocaleDateString(...)`. Quando o valuation acabou de ser calculado, `calculatedAt` é um `Date` (vem do `valuationCalculator.ts`). Mas quando vem do `valuation_history` (JSON do Supabase), `calculatedAt` é uma **string** ISO — então `.toLocaleDateString is not a function` derruba a página inteira (o erro do console confirma).

**Correção:** em `src/components/valuation/ValuationReportDialog.tsx` (linha 53) e `src/components/valuation/DCFReportDialog.tsx` (linha 44), tornar `formatDate` tolerante:
```ts
const formatDate = (date: Date | string) => {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};
```
Aplica também onde é passado para o `addText` do PDF (mesmas linhas 83/450 e 74/184 — já cobertas pela mesma função).

### 3. "Não conseguimos salvar seu valuation" ao criar novo
**Causa raiz (confirmada pelo console):**
```
type "equity_brain.qualification_status_enum" does not exist
```
A migration `20260501151525_...sql` (linha 74) criou o trigger `guard_synthetic_company_unqualified` referenciando o tipo `equity_brain.qualification_status_enum`, mas o tipo real chama-se `equity_brain.qualification_status` (sem o sufixo `_enum`). Esse trigger dispara em `BEFORE INSERT` em `equity_brain.companies`.

O fluxo é: insert em `valuation_history` → trigger `trg_sync_valuation_to_eb` → `ingest_valuation()` → insert em `equity_brain.companies` com CNPJ sintético `VL…` → trigger guard quebra com tipo inexistente → insert raiz falha → toast de erro.

**Correção (alinhada à decisão anterior: valuations NÃO entram no grafo):** nova migration que:
1. `DROP TRIGGER IF EXISTS trg_sync_valuation_to_eb ON public.valuation_history;` — remove a sincronização automática de valuation → grafo (advisor pode puxar manualmente quando quiser).
2. Corrige o cast do trigger guard: `…::equity_brain.qualification_status_enum` → `…::equity_brain.qualification_status` (mantém a proteção para outros CNPJs sintéticos `VL%`/`CR%` que já existirem ou venham de outras origens).
3. Mantemos as funções `ingest_valuation` / `sync_valuation_to_eb` no banco (não destrutivo) para uso manual futuro.

### Fora de escopo
- Não mexer na lógica de crédito (já está correta: salva antes de consumir).
- Não mexer em RLS / roles.
- Não tocar em `equity_brain.companies` existentes que vieram de valuation antigos (se houver — limpeza pode ser feita depois sob demanda).

### Resultado esperado
- Carrossel troca a cada 8s.
- "Ver Relatório" abre normalmente para qualquer valuation salvo.
- Novo valuation salva sem erro e o grafo de empresas fica intocado por valuations.
