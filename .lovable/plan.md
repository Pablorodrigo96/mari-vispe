
# Equity Planner — Refino UX/Design End-to-End

Auditoria visual + funcional de todo o fluxo (`/equity-planner`, `/equity-planner/novo`, `/equity-planner/:id`, `/meus-equity-planners` e 9 componentes), com plano em 5 ondas para entregar uma experiência 100% funcional, coesa e sem áreas frágeis.

**IA de execução:** `google/gemini-3.1-pro-preview` (top-tier para reasoning de UI/UX e refactors longos) via AI Gateway para as tarefas de geração; o código é escrito diretamente pelo agente.

---

## Diagnóstico atual (o que dói)

**Landing (`EquityPlanner.tsx`)**
- Hero forte, mas CTAs perdem hierarquia no mobile (empilha sem ritmo).
- Sem prova social, sem "quem já usou", sem preview real do relatório.
- Barra de stats mini-fica invisível (`text-white/50` em 12px).

**Wizard (`EquityPlannerNew.tsx`, 740 linhas)**
- Steps 0–5 sem validação por passo — usuário chega no step 5 vazio.
- Step 3 (12 sliders) é cansativo: parede de sliders idênticos, sem agrupamento, sem preview do IPE parcial.
- Modo `meeting_paste` é textarea gigante sem estrutura, sem exemplos, sem contador colorido.
- Status chip do market scan (canto sup dir) some no mobile.
- Loading do compute = spinner + toast; sem skeleton do que vai aparecer.
- Botões "Voltar/Avançar" no rodapé sticky, mas em mobile o footer cobre conteúdo.

**Assessment (`EquityPlannerAssessment.tsx`, 1115 linhas)**
- 5 abas (Raio-X/Valor/Plano/Compradores/Progresso), mas navegação por Tabs shadcn padrão — sem indicação de saúde de cada aba.
- Raio-X: 12 dimensões em lista longa; falta radar chart ou heatmap comparativo vs benchmark.
- Valor: Value Bridge em texto/barras simples, sem waterfall visual.
- Plano: iniciativas em cards flat, sem timeline visual clara nem estados (não iniciada/em andamento/feita).
- Compradores: buyer map em tabela; sem cards com "tese × prêmio × fit".
- Progresso: log cronológico raso, sem gráfico de evolução do IPE.
- "Re-medir" e "Baixar PDF" espalhados; falta uma action bar consistente.
- Arquivo com 1115 linhas — precisa quebrar em subcomponentes por aba.

**Componentes**
- `WizardProgress`: barras finas, não mostra step atual com destaque.
- `EquityDocsUpload`: dropzone genérica, sem preview de arquivo, sem barra de progresso por item.
- `MarketMappingPanel` / `EquityMarketTab` / `ModelLiquidityTab`: densidade inconsistente com o resto do app.
- `InitiativeDeepDiveModal`: modal grande, mas botões de ação no rodapé sem hierarquia.
- `AnnualPlanTimeline`: timeline horizontal que quebra no mobile.
- `SignupGateCard`: OK, só falta variante inline.

**MyEquityPlanners**
- Lista funcional (com paginação recém-adicionada), mas cards sem preview de IPE, sem tag de arquétipo colorida, sem "última atualização há X".

**Global**
- Mistura de espaçamentos (`py-8`, `py-14`, `py-20`) sem escala.
- Muita opacidade `text-white/50`, `text-white/40` — abaixo do AA em várias combinações.
- Ausência de estados vazios ilustrados.
- Sem microcopy motivacional entre steps ("Falta pouco…").
- Nenhum uso do design token semântico em vários pontos (`bg-graphite`, `text-bone`, `text-volt` estão OK, mas há `text-white/X` demais).

---

## Ondas de execução

### 🌊 Onda 1 — Landing + entrada (`/equity-planner`)
1. Reescrever hero com CTA duplo (primário + "ver exemplo real") e mockup do relatório à direita em desktop.
2. Adicionar seção "prova social" leve: 3 mini-cases fictícios/placeholder + logos.
3. Reforçar contraste (subir stats de `/50` para `/70` + `font-medium`).
4. Faixa "como funciona" já boa — só padronizar ícones e adicionar linha conectora sutil.
5. Novo CTA final com formato "insira seu CNPJ e comece" (leva pro wizard pré-preenchido).

### 🌊 Onda 2 — Wizard (`/equity-planner/novo`)
1. **Validação por step** (bloqueia avançar sem campos obrigatórios; mensagens inline).
2. **Step 0 (modo):** dois cards grandes lado a lado com preview visual + tempo estimado.
3. **Step 1 (identificação):** autocomplete de razão via BrasilAPI (já existe no /mari — reusar), UF como select com bandeira.
4. **Step 2 (financeiro):** máscara BRL em tempo real, cálculo automático de margem EBITDA com badge visual (saudável/atenção/crítico).
5. **Step 3 (auto-avaliação):** agrupar 12 dimensões em 4 grupos (Financeiro / Operacional / Comercial / Governança) com accordion; mostrar IPE parcial ao vivo no header do step.
6. **Step 4 (arquétipo):** cards visuais dos arquétipos com ícone + descrição, destacar sugestão da IA com badge "recomendado pela Mari".
7. **Step 5 (gerar):** substituir spinner por skeleton do relatório + progress steps ("Analisando…" → "Calculando IPE…" → "Gerando plano…").
8. **Meeting paste mode:** template exemplo colável, contador com cores (verde/amarelo/vermelho), botão "colar do clipboard".
9. **Footer sticky:** adicionar `pb-safe` mobile + botão de "salvar rascunho" explícito.
10. **Market scan chip:** mover para dentro do card do step 1 quando em mobile.

### 🌊 Onda 3 — Assessment (`/equity-planner/:id`)
1. **Quebrar em subcomponentes:** `RaioXTab`, `ValorTab`, `PlanoTab`, `CompradoresTab`, `ProgressoTab` (arquivo cai de 1115 → ~200 linhas).
2. **Header do assessment:** card hero com nome empresa, IPE grande (radial), veredicto, valuation hoje vs potencial, e action bar (Re-medir / PDF / Compartilhar / Promover a mandato).
3. **Raio-X:** radar chart (recharts) das 12 dimensões vs benchmark P50/Top10%; abaixo, lista com barras horizontais coloridas + drill-down.
4. **Valor:** waterfall chart real (recharts BarChart empilhado) para value bridge; card lateral com "cada degrau paga X".
5. **Plano:** timeline vertical com sprints (Q1/Q2/Q3/Q4), cada iniciativa como card com estado, impacto (BRL), esforço, e botão "aprofundar" (modal existente melhorado).
6. **Compradores:** buyer map em grid de cards (foto/logo placeholder, tese, prêmio %, fit score, CTA "ver carta").
7. **Progresso:** line chart de IPE ao longo do tempo + timeline de eventos.
8. **Tabs:** substituir por navigation com badge de "saúde" em cada aba (ex: Plano · 3 pendentes).
9. **Empty states** ilustrados quando algum bloco ainda não foi calculado.
10. **PDF real:** trocar `window.print()` por edge function com Puppeteer/react-pdf (fora do escopo se muito custoso — nesse caso, aprimorar CSS de print com layout paginado A4).

### 🌊 Onda 4 — Componentes auxiliares
1. `WizardProgress`: novo design com marcadores numerados, linha volt animada, step atual pulsante.
2. `EquityDocsUpload`: dropzone com preview de arquivo (ícone por tipo), progress bar individual, ações remover/re-upload.
3. `InitiativeDeepDiveModal`: hierarquia clara — hero (título + impacto), abas internas (contexto/plano/riscos), footer com CTA único primário.
4. `AnnualPlanTimeline`: fallback vertical no mobile, cards com hover state e linha conectora.
5. `MarketMappingPanel` / `EquityMarketTab` / `ModelLiquidityTab`: aplicar mesma linguagem visual (cards graphite, headers com kicker volt, tipografia consistente).
6. `MyEquityPlanners`: cards com IPE mini-radial, badge de arquétipo colorida, "atualizado há 3d", ação rápida "abrir/duplicar/arquivar".

### 🌊 Onda 5 — Polish global (design system + a11y)
1. Definir escala de espaçamento: `py-16` (seção pequena) / `py-24` (média) / `py-32` (grande) — aplicar em tudo.
2. Substituir todos `text-white/40..50` por `text-bone/70` (novo token) ou `text-muted-foreground` para AA.
3. Padronizar radius: `rounded-xl` (cards), `rounded-2xl` (hero/modais), `rounded-full` (badges/pills).
4. Padronizar sombras: `shadow-volt` só em CTAs primários; cards com border-only.
5. Motion tokens: duração 0.32s + ease `[0.25,0.46,0.45,0.94]` em tudo (já usado — só uniformizar).
6. Adicionar loading skeletons dedicados em cada tela (não spinners genéricos).
7. Toast: substituir mensagens técnicas por linguagem produto ("Diagnóstico pronto ✨").
8. A11y sweep: `aria-label` em todos icon-buttons, focus-visible ring volt, contraste AA validado.
9. Mobile pass: testar 375px em cada tela, garantir sem overflow horizontal.
10. QA final: script Playwright rodando os 4 fluxos principais + screenshots antes/depois.

---

## Detalhes técnicos

- **Charts:** usar `recharts` (já no projeto) — RadarChart, BarChart empilhado (waterfall), LineChart.
- **BRL mask:** helper existente em `src/lib/formatters.ts` (`brl()`).
- **BrasilAPI autocomplete:** reusar hook `useMariPrefill`/lógica de `/mari`.
- **Radial IPE:** componente novo `IpeRadial.tsx` (SVG puro, sem lib).
- **PDF:** avaliar `@react-pdf/renderer` client-side vs edge function; começar por CSS `@media print` melhorado.
- **Subcomponentes assessment:** criar `src/components/equity-planner/tabs/` com 5 arquivos.
- **IA para copywriting** (microcopy motivacional, empty states, tooltips): 1 chamada única ao `gemini-3.1-pro-preview` gerando JSON com todas as strings; caching em `src/lib/equity-planner/copy.ts`.
- **Tokens novos em `index.css`:** `--surface-1`, `--surface-2`, `--text-strong`, `--text-soft` (mapeando pra graphite/bone com opacidades corretas).

---

## Fora do escopo

- Reescrever edge functions (já cobertas em Ondas A/B/C anteriores).
- Novos arquétipos ou mudanças de modelo.
- Integração real de assinatura de contratos.
- PDF server-side com Puppeteer (só se tempo sobrar — plano B: CSS print A4).

---

## Entregáveis por onda

| Onda | Duração | Arquivos afetados | Screenshots antes/depois |
|------|---------|-------------------|--------------------------|
| 1 · Landing | 0.5d | `EquityPlanner.tsx` + assets | 3 |
| 2 · Wizard | 1.5d | `EquityPlannerNew.tsx`, `WizardShell`, `WizardProgress` | 6 |
| 3 · Assessment | 2d | `EquityPlannerAssessment.tsx` + 5 tabs novas + `IpeRadial` | 8 |
| 4 · Componentes | 1d | 6 componentes + `MyEquityPlanners` | 5 |
| 5 · Polish | 0.5d | `index.css`, tokens, a11y, Playwright | matrix |

**Total: ~5.5 dias de execução sequencial.**

---

## Ordem recomendada

Sugiro começar pela **Onda 2 (Wizard)** — é onde o usuário sente mais fricção hoje e onde o ROI de UX é maior. Depois **Onda 3 (Assessment)** — é a tela-produto. Landing (Onda 1), componentes (Onda 4) e polish (Onda 5) fecham o ciclo.

**Confirma começar pela Onda 2, ou prefere que eu ataque tudo em sequência da 1 à 5?**
