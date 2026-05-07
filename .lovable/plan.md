## Objetivo

Filtrar do ranking e do mapa de "candidatos complementares" (Anatel) os provedores que não fazem sentido para M&A:
- **Big Telcos**: Vivo, Claro, Tim, Oi (e variações de razão social).
- **Muito pequenos**: provedores com `acessos` totais (somados nas cidades dentro da área) **< 1.000**.

## Mudanças

### 1. `src/hooks/useAnatelMarketRadius.ts`

Adicionar uma camada de filtro logo após a agregação por provedor (`provMap`) e antes do cálculo de score/ordenação.

a) **Constantes no topo do arquivo** (acima do `useAnatelMarketRadius`):

```ts
const BIG_TELCO_CNPJ_ROOTS = new Set<string>([
  "40432544", // Vivo / Telefônica Brasil
  "02558157", // Vivo (legado)
  "76535764", // Claro / Embratel
  "40432544", // (placeholder caso já exista)
  "02421421", // Tim
  "76535764",
  "33000118", // Oi (Telemar)
  "76535764",
  "05423963", // Oi Móvel
  "33530486", // Oi (legado)
]);

const BIG_TELCO_NAME_PATTERNS = [
  /\bvivo\b/i,
  /telef[oô]nica\b/i,
  /\bclaro\b/i,
  /embratel/i,
  /\btim\b/i,
  /\boi\b\s*(s\.?a|m[oó]vel|fixa)?/i,
  /telemar/i,
  /algar\s*tele/i,
  /sercomtel/i,
];

const MIN_ACESSOS_CANDIDATE = 1000;

function isBigTelco(empresa: string, cnpj: string): boolean {
  const root = (cnpj || "").replace(/\D/g, "").slice(0, 8);
  if (BIG_TELCO_CNPJ_ROOTS.has(root)) return true;
  const name = String(empresa || "");
  return BIG_TELCO_NAME_PATTERNS.some((re) => re.test(name));
}
```

b) **Aplicar filtro** no `Array.from(provMap.values()).map(...)`:

- Antes do `.map`, fazer `.filter((a) => a.acessos >= MIN_ACESSOS_CANDIDATE && !isBigTelco(a.empresa, a.cnpj))`.
- Garante que big telcos e provedores < 1.000 acessos **não aparecem nem no ranking nem no mapa** (já que `MarketCandidate` é montado a partir do mesmo array no `MapaPage.tsx`).

c) **Retorno**: incluir contagem opcional `excludedBigTelcos` e `excludedSmall` no resultado para debug futuro (sem usar agora). Fora do escopo se atrapalhar — deixar comentado.

### 2. `src/components/equity-brain/MarketRadiusPanel.tsx`

Atualizar o subtítulo/tooltip para deixar explícito o filtro:

- Adicionar microcopy abaixo do título "Buscar empresas no raio":
  `"Excluindo grandes operadoras (Vivo, Claro, Tim, Oi) e provedores com menos de 1.000 acessos."`

### 3. Não muda

- `MapaPage.tsx` não precisa de mudança: ele consome `result.providers` como `marketCandidates`, então o filtro no hook já retira os pinos do mapa.
- `AnatelProviderMap.tsx` não muda.
- Edge function `anatel-query` não muda.

## Resultado esperado

Após aprovação: ao buscar candidatos no raio, big telcos (Vivo/Claro/Tim/Oi/Embratel/Telemar) e provedores < 1.000 acessos são removidos antes do ranking. O mapa só mostra ISPs relevantes para M&A, e o painel exibe a regra ativa.

## Pergunta opcional

Se quiser, posso transformar o threshold de 1.000 acessos em um **slider configurável** no `MarketRadiusPanel` (range 0–10.000, padrão 1.000), para você ajustar caso a caso. Hoje fica fixo em 1.000.
