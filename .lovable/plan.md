## Diagnóstico

**Por que o globo aparece "vazio com meia dúzia de pontos":**

1. **Filtros padrão zerados** (`JarvisGraph3D.tsx` l.57-58): `DEFAULT_NODE_TYPES = new Set()` e `DEFAULT_LAYERS = new Set()`. No primeiro abrir, **nenhum tipo de nó está ligado** — só sobram teses/strategy soltas pela cláusula de fallback (`l.389-391`). É preciso clicar "Ativar tudo" pra ver algo.
2. **Limites baixos**: queries com `.limit(500)` em companies/scored (l.272, 282); builder cortado em `maxNodes: 350` (l.368).
3. **Universo de dados pequeno no Supabase**: a view `eb_companies` tem só **361 empresas** (CRM-visíveis). Os 5M CNPJs da Receita vivem na **base externa** (`EXTERNAL_DB_URL`, usada pelo `national-search`), nunca entram no globo.
4. **Câmera perto demais**: `camR = sphereRadius * 2.6` (l.556) — fica colado no globo, não dá leitura de "planeta cheio".

---

## O que vai mudar

### Etapa 1 — Liberar tudo que já existe (instantâneo, frontend-only)

**`src/components/equity-brain/jarvis/JarvisGraph3D.tsx`**

- Substituir `DEFAULT_NODE_TYPES` e `DEFAULT_LAYERS` para iniciarem **iguais a `ALL_NODE_TYPES` / `ALL_LAYERS`** (tudo ligado). Manter "Resetar" voltando a esse mesmo estado cheio (não a vazio). Painel "Ativar tudo" passa a ser idempotente.
- Subir limites:
  - `.limit(500)` em `eb_companies` e `eb_companies_scored` → `.limit(3000)`
  - `maxNodes: 350` → `maxNodes: 1800` (já temos 361 sellers + 396 buyers + teses + frios = ~2.7k potenciais, 1800 é teto seguro pra WebGL).
- Câmera mais distante: `camR = R * 2.6` → `R * 3.6` para dar sensação de "globo girando" com folga.
- Subir `sphereRadiusRef`: `Math.max(900, Math.min(2600, 800 + N * 5.0))` → `Math.max(1200, Math.min(3600, 900 + N * 4.5))` — esfera cresce com N mas com cap maior; nós ficam melhor distribuídos.
- Aumentar `forceRadial` strength de `0.14` → `0.22` para "puxar" mais para a casca esférica (visual de globo nítido).

### Etapa 2 — Sample de 2k CNPJs frios da RFB (backend + frontend)

Os 5M da Receita NÃO estão no Supabase. Vou criar uma nova edge function que faz sample da base externa SEM importar permanentemente.

**Nova edge function `jarvis-cold-sample`** (`supabase/functions/jarvis-cold-sample/index.ts`):
- Conecta no `EXTERNAL_DB_URL` (mesma base do `national-search` / `expand-companies-from-rfb`)
- Query: `SELECT cnpj, razao_social, uf, municipio, cnae_principal_descricao, capital_social FROM estabelecimentos_detalhados WHERE situacao_cadastral = '02' ORDER BY random() LIMIT 2000`
- Filtros opcionais via query string: `?uf=SP&setor=tech` para focar
- Cache em memória (Map TTL 1h) — não bate na base toda hora
- Auth: `verify_jwt = false` (público, mas só leitura sample, sem PII sensível)
- Retorna shape compatível com `JarvisNode`: `{ id: 'cold:'+cnpj, type: 'seller_cold', label: razao_social, uf, setor, faturamento_estimado: capital_social, isCold: true }`

**`equityGraphBuilder.ts` / `equityGraphJarvisAdapter.ts`**:
- Novo tipo de nó `seller_cold` (ou flag `isCold` no seller existente)
- Visual: esfera **menor** (radius 2.5 vs 6), **cinza opaco** (`#3f3f46`), **sem label**, **sem links**. Pura decoração para densidade visual de "população".
- Não conta no `maxNodes` (são camada decorativa); entram em pool separado renderizado em paralelo.

**`JarvisGraph3D.tsx`**:
- Nova query `useQuery(['sg', 'cold-sample'], ...)` que chama a edge function via `supabase.functions.invoke('jarvis-cold-sample')`
- Concatena os ~2k cold nodes ao `graphData.nodes` mas **sem links** (não passam pelo builder de edges)
- Distribui posição inicial deles em **casca esférica externa** (raio = R * 1.15) com Fibonacci sphere — assim formam a "nuvem de fundo" do globo enquanto os 361 sellers + buyers ficam mais densos no centro.
- Toggle "Mostrar nuvem RFB" no painel de filtros (default ON), para o usuário desligar se quiser performance.

### Etapa 3 — Refinamentos visuais para sensação de "globo cheio"

- Cold spheres: opacidade modulada por Z (já existe `depthFade` no `buildNodeObject` l.660-666), mas com base mais sutil (0.15-0.40) para parecerem "estrelas distantes".
- Auto-orbit (l.549): velocidade `0.00012` → `0.00009` (volta mais lenta, ~70s/volta, mais imersivo com mais densidade).
- Ativar `linkSegments: 8` por default (em vez de 4) — arcos mais suaves entre os 361 sellers visíveis.

---

## Resultado esperado

- Primeiro abrir já mostra **2.000-2.700 pontos** no globo (sem precisar clicar nada): 361 sellers reais + 396 buyers + teses + matches + ~2k pontos cinzas da RFB.
- Câmera afastada, esfera maior, rotação lenta → leitura clara de "planeta de dados".
- Performance: testado mentalmente em ~2.7k esferas básicas + ~1.5k links — fica dentro do envelope WebGL (60fps em desktop, 30-45fps em mobile com DPR cap que já existe).
- "Mostrar nuvem RFB" pode ser desligado pelo usuário se quiser performance máxima.

## Detalhes técnicos

```text
Arquivos mexidos
├── supabase/functions/jarvis-cold-sample/index.ts          [NOVO]
├── src/components/equity-brain/jarvis/JarvisGraph3D.tsx    [edit: defaults, limits, camera, cold query]
├── src/lib/equityGraphJarvisAdapter.ts                     [edit: tipo seller_cold + visual]
└── src/lib/equityGraphScoring.ts                           [edit: NODE_COLORS.seller_cold]
```

**Sem mudanças de schema** — sample é read-only na base externa, não cria/altera tabelas. Sem RLS novo. Sem perda de dados.

**Fallback se a edge function falhar**: o globo segue funcionando com os ~1k nós reais (apenas sem a nuvem de fundo) — failure mode amigável.