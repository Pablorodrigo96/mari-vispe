
## Diagnóstico

O HTML que você anexou (`relatorio_isp_brasil_2025.html`) entrega:
- **15 players** no ranking com share %, delta absoluto em texto (“+106 mil em 2025”) e cor por bucket.
- **Eficiência** com 4 cards grandes mostrando valor + denominador (“Lucro 2025: R$ 6,17 bi · HC ~30 mi”), não só uma frase solta.
- **Velocidade** com 10 players, net adds/dia + /ano e classificação orgânico/inorgânico/tecnologia em texto.
- **Head-to-head** com 4 métricas, cada uma com label + número grande + sub-explicação.
- **M&A** com ~10 deals, valor + delta string com contexto (clientes, regiões, status CADE).
- **Conclusão** editorial em 3 parágrafos longos com bold inline + assinatura.
- Tipografia editorial (Bricolage Grotesque + JetBrains Mono), grid sutil ao fundo, cores quentes (teal/violet/amber/coral).

O que a Mari está entregando hoje:
- Schema só pede **4-6 players** no ranking (vs 15) → resposta rasa.
- Eficiência sem denominador, velocidade só com %, head-to-head sem `sub`, M&A sem texto de contexto, conclusão em 3 frases curtas.
- UI usa `bg-card`/`text-foreground` genérico sem hierarquia editorial. Sem grid, sem gradientes, sem buckets de cor por posição.

A solução não é mudar de modelo (Perplexity sonar-pro é o correto para grounding + citações). É **pedir muito mais coisa, com mais estrutura, e pedir profundidade explícita** — e expandir os componentes pra renderizar o que vier.

## O que muda

### 1. Prompt do Perplexity (`supabase/functions/research-sector/index.ts`)

Reescrever o `SYSTEM_PROMPT` com:
- **Mínimos quantitativos obrigatórios**: 10-15 players no ranking, 4 cards no eficiência, 8-10 no velocidade, 6-10 deals no M&A. Se faltar fonte, marcar `estimativa: true` em vez de cortar.
- **Profundidade editorial obrigatória**: cada `comentario` precisa ter 60-120 palavras, com 2-4 frases analíticas e 3-5 bullets curtos (estrutura já usada no HTML de referência). `punch_line` final em cada painel.
- **Conclusão setorial estendida**: além de `vencedores/consolidadores/alvos/punch_line`, adicionar `paragrafos: string[]` (3 parágrafos editoriais) e `tres_blocos: { executam, consolidam, atrasados }`.
- **Regras anti-rasura**: explicitar “não retorne menos de 10 players”, “se um campo não tem fonte, devolva valor + `fonte: 'estimativa'`”, “use Anatel, B3 releases, TELETIME, Brazil Journal, Pipeline, NeoFeed, sites oficiais como fontes preferidas”.
- Aumentar `max_tokens` de 8000 → 16000 e definir `search_recency_filter: 'year'`, com fallback de modelo opcional para `sonar-deep-research` quando `force_refresh` for true (mais caro, mais profundo).

Schema JSON expandido — campos novos:
- `painel_1_ranking.players[]`: adicionar `variacao_absoluta_label` (string “+106 mil em 2025”), `cor_bucket` (`top|positivo|negativo|neutro`), `subtitulo` (string “Líder de mercado”).
- `painel_2_eficiencia.cards[]`: adicionar `denominador` (string “Lucro 2025: R$ 6,17 bi · HC ~30 mi”) e `cor` (1-4).
- `painel_3_velocidade.players[]`: adicionar `net_adds_ano_label`, `net_adds_dia_label`, `classificacao` (`organico|inorganico|tecnologia|hibrido`).
- `painel_4_head_to_head.metricas[]`: trocar `valor_a|valor_b` por `{ label, valor_a: { num, sub }, valor_b: { num, sub } }`. Manter retrocompat: aceitar ambos no front.
- `painel_5_mna.deals[]`: adicionar `contexto` (string com clientes/regiões/status) e `status` (`concluido|anunciado|pendente_cade`).
- `conclusao_setorial`: adicionar `paragrafos: string[]` e `tres_blocos`.

Validação no edge: aceitar `partial` se faltar até 2 painéis, mas log explícito em `geracao_erro` listando quantos itens vieram em cada painel — pra termos métrica de qualidade.

### 2. Fallback de qualidade com segunda IA (Lovable AI Gateway / Gemini)

Se Perplexity retornar `< 8 players` no ranking OU `< 5 deals` no M&A OU algum painel ausente, fazer **uma segunda chamada de enriquecimento** com `google/gemini-2.5-pro` via Lovable AI Gateway, mandando o JSON parcial + lista de citações do Perplexity como contexto e pedindo apenas para **expandir/completar** os painéis fracos (sem reinventar números). A Gemini não pesquisa, mas ajuda a estruturar texto editorial dos `comentario` e `conclusao_setorial.paragrafos` — onde o Perplexity costuma ficar telegráfico. Log do enriquecimento em `geracao_erro` (“enriched_by_gemini: painel_5_mna”).

### 3. Redesenho dos componentes

Mantém os tokens Mari (`bg-background`, `bg-card`, `accent` = Volt, `text-foreground`/`muted-foreground`), mas adiciona hierarquia editorial:

**Página `Inteligencia.tsx`**:
- Container max-w-6xl, padding generoso (py-16), grid sutil de fundo (`bg-[linear-gradient(...)]` com `mask-image` radial — só CSS Tailwind, sem nova dep).
- Espaçamento entre painéis aumentado pra `mb-24`.

**`InteligenciaHero`**:
- Eyebrow “Análise consolidada do setor” com bolinha pulsante Volt.
- Headline com `text-5xl lg:text-7xl`, peso 800, tracking-tight, com palavra em destaque envolvida por gradiente Volt→Bone.
- Lead em 18px, max-w-720.
- Metadata em barra de baixo (período, fontes, data).

**`PainelRanking`** (mais editorial):
- Header de seção: número “01 — PARTICIPAÇÃO DE MERCADO” + título grande + fonte alinhada à direita.
- Linhas grid `50px 240px 1fr 140px` com cor de barra rotativa por bucket (Volt, Volt-dim, amber, rose, violet).
- Renderiza `variacao_absoluta_label` quando vier (e cai pra YoY % senão).
- Mostra `subtitulo` abaixo do nome.
- Hover sutil + animação de barra.

**`PainelEficiencia`** (4 cards grandes):
- Layout `repeat(auto-fit, minmax(240px, 1fr))`.
- Valor em `text-5xl font-bold` com cor rotativa (4 buckets).
- Denominador em mono pequeno.
- Círculo decorativo no canto inferior direito (CSS).

**`PainelVelocidade`**:
- Tabela visual com 10 linhas, mostra `net_adds_dia_label` em destaque (“+1.970/dia”) e `net_adds_ano_label` em mono pequeno (“+719 mil/ano”).
- Chip de classificação ao lado do nome (Orgânico / M&A / Tech).

**`PainelHeadToHead`** (layout vs editorial):
- Grid `1fr 200px 1fr` com divisores verticais.
- Coluna esquerda nome rosé+, direita violet, círculo central “VS” grande.
- Cada métrica: label uppercase pequeno + número grande (28px) + sub mono pequeno.
- Em mobile, vira stack vertical com divisores horizontais.

**`PainelMnA`**:
- Mesma linguagem do Ranking (linhas com barra de tamanho relativa ao valor), mas com ★ no lugar da posição quando `destaque: true`.
- `contexto` aparece abaixo do nome do deal (subtítulo).
- Delta string mostra `valor`+contexto inline.

**`ConclusaoSetorial`**:
- Card grande com gradient radial (Volt no canto, amber no oposto).
- H2 grande com palavra em destaque.
- Renderiza `paragrafos[]` (3 parágrafos editoriais) se vier; senão cai pro layout atual (3 cards).
- Assinatura em mono no rodapé.

**`shared/CommentaryBox`**:
- Adicionar barra Volt vertical à esquerda + suporte a `<strong>` inline (renderizando `comentario` com `dangerouslySetInnerHTML` só se vier marcado — ou parsear `**bold**` markdown simples com regex). E renderizar `punch_line` em destaque final quando vier separado.

### 4. Cache invalidation

Como o schema muda, todas as entradas em `equity_brain.sector_research` ficam desatualizadas (campos faltando). Solução:
- Bumpar uma constante `PAYLOAD_SCHEMA_VERSION = 2` no edge e gravar em coluna nova `schema_version int default 1`.
- Hook `useSectorResearch` ignora cache (`isMissing = true`) se `schema_version < 2` → força regeração na primeira visita.
- Migration: `ALTER TABLE equity_brain.sector_research ADD COLUMN schema_version int default 1;`.

### 5. Smoke

Depois de aprovar, rodar `force_refresh: true` no setor `isp-banda-larga` e validar:
- ≥ 10 players no ranking.
- 4 cards em eficiência com denominador.
- ≥ 8 players em velocidade com classificação.
- Head-to-head com sub em cada métrica.
- ≥ 6 deals com contexto.
- Conclusão com 3 parágrafos.

Se a Perplexity sozinha não entregar isso, o fallback Gemini cobre.

## Arquivos afetados

- **edit** `supabase/functions/research-sector/index.ts` — prompt v2, schema novo, fallback Gemini, schema_version.
- **migration** — adiciona `schema_version` em `equity_brain.sector_research`.
- **edit** `src/hooks/useSectorResearch.ts` — invalidar quando `schema_version < 2`.
- **edit** todos os componentes em `src/components/inteligencia/*` — redesenho.
- **edit** `src/pages/Inteligencia.tsx` — container + grid de fundo.

## Fora de escopo

- Não estamos trocando Perplexity por outro provedor primário.
- Não estamos adicionando export PDF / comparação multi-setor / acesso pago.
- Mantemos cache 7d e cron diário como está.

Posso executar?
