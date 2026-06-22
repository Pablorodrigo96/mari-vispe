## Diagnóstico do que aconteceu

Olhei seu assessment `cedcd9eb…` no banco. Status = `computed`, mas:

- `equity_valuations`: 1 linha com **tudo zerado** (valor_atual=0, valor_alvo=0, ebitda=0, DCF=0).
- `equity_initiatives`: **0 linhas** (plano em branco).
- `equity_buyer_map`: **0 linhas** (compradores em branco).
- `equity_dimension_scores`: 12 linhas OK (por isso o Raio-X aparece).
- `archetype_classification._fallback = true` → o classificador também caiu no fallback.

**Causa raiz:** o `equity-planner-compute` chamou a IA, recebeu JSON inválido (Gemini fallback corta texto / quebra estrutura quando Anthropic está sem crédito), e o `catch` do `extractJson` usa um **stub vazio com zeros** que é persistido como se fosse um resultado real. O frontend então mostra a casca do relatório com tudo em branco, exatamente o que você viu.

Confirma também o ponto da entrega "básica vs masterplan": a UI cobre tudo do masterplan (12 dimensões, Value Bridge 5-parcelas, DCF/SDE/Triangulado, addbacks, buyer map ancorado, migração de arquétipo, sprints), mas quando a IA falha e o fallback zera tudo, o relatório vira casca.

E o "letras pretas com fundo escuro" é o empty-state vazando preto nativo (Recharts labels e algumas células sem `text-foreground` explícito sobre os cards `bg-slate-900/60`).

---

## Plano de correção — 4 frentes

### 1. Parar de persistir resultado lixo quando a IA falha (raiz)

Em `supabase/functions/equity-planner-compute/index.ts`:

- Remover o stub que persiste valuation/iniciativas/buyers zerados.
- Em caso de `ai_invalid_json` ou JSON sem dimensoes/ebitda/iniciativas:
  1. **Retry automático 1×** com `temperature: 0`, `max_tokens: 7000`, e prompt encurtado (só arquétipo escolhido + comps + 6 iniciativas-modelo da library + 3 perfis buyer) — corta risco de truncamento.
  2. Se ainda falhar: **NÃO sobrescrever** linhas antigas; marcar `equity_assessments.status = 'ai_failed'` e devolver 500 com `error: ai_invalid_json` e raw head no log.
- Validação de saída: exigir `ebitda_normalizado > 0` (ou explicitamente declarado pelo usuário), `iniciativas.length >= 4`, `buyer_map.length >= 2`. Faltou → vira retry, depois `ai_failed`.
- Também no `equity-planner-classify`: se cair no fallback `_fallback: true`, **não persistir** — devolver 503 e deixar o compute disparar o classify de novo com prompt enxuto.

### 2. Recuperação UX do assessment travado

Em `src/pages/EquityPlannerAssessment.tsx`:

- Quando `status === 'ai_failed'` OU quando valuation existe mas `valor_atual === 0` E não há iniciativas/buyers: esconder o report normal e mostrar **estado de erro dedicado**: "A análise não foi concluída. Re-rodar agora" + botão grande que invoca `equity-planner-compute` de novo.
- O botão "Re-medir" no header já existe; reforçar com loading + toast claro de sucesso/erro vindo do edge function.
- Para o seu assessment atual `cedcd9eb…`: após o deploy, basta clicar em "Re-rodar" — o novo compute vai gerar tudo de verdade.

### 3. Contraste — letra preta em fundo escuro

Sweep dirigido em `EquityPlannerAssessment.tsx`:

- Adicionar `text-foreground` explícito em todos `<Card>` para herdar cor clara.
- Recharts: `XAxis`/`YAxis` `tick={{ fill: 'hsl(var(--muted-foreground))' }}`, `Tooltip contentStyle` com `color: 'hsl(var(--foreground))'`, `LabelList` se houver.
- Empty-states ("Sem buyer map disponível", "— sem iniciativas neste sprint —", "Nenhum destruidor crítico identificado") usar `text-muted-foreground` ao invés de cair no default do `<p>` (que vira preto se algum parent setar `color:black`).
- Trocar qualquer `text-slate-900`/`text-black`/`text-gray-900` residual por `text-foreground`.
- Conferir o `WizardShell`/`WizardProgress` durante as perguntas e o `SignupGateCard` (você pediu o ajuste de design no fluxo todo) — passar o mesmo lint visual.

### 4. Subir o nível do relatório ao do masterplan

Sem mudar arquitetura, três ajustes cirúrgicos no `compute`:

- **Prompt mais explícito sobre obrigatoriedade**: "iniciativas: MÍNIMO 8, MÁXIMO 12, com pelo menos 1 por sprint"; "buyer_map: MÍNIMO 3"; "addbacks: detalhar mesmo que zero"; "summary: 2-3 frases obrigatório"; "veredito_liquidez obrigatório".
- **Triangulação sempre visível**: garantir que `valor_dcf` e `valor_sde` sejam calculados sempre que `ebitda_normalizado > 0` (já é, mas validar).
- **Bloco de premissas e veredito no UI**: já temos `assess.summary` e `veredito_liquidez` no banco; renderizar veredito como badge grande no hero do IPE (vendável hoje / 6-12m / 12-24m / inviável) e listar `premissas_valuation` em accordion no tab Valor.

---

## Detalhes técnicos

Arquivos tocados:

- `supabase/functions/equity-planner-compute/index.ts` — retry, validação, sem stub lixo, prompt reforçado.
- `supabase/functions/equity-planner-classify/index.ts` — sem persistir fallback.
- `src/pages/EquityPlannerAssessment.tsx` — empty-state "ai_failed", contraste, badge de veredito, premissas, tooltip Recharts.
- `src/components/equity-planner/WizardShell.tsx` + `WizardProgress.tsx` + `SignupGateCard.tsx` — pass de contraste no fluxo do wizard.

Schema: nenhuma migração necessária (campos já existem).

Risco: o retry adiciona ~10-20s no pior caso. Aceitável — melhor que persistir zero.

---

## Após aprovar

Implemento as 4 frentes em uma rodada, deploy dos edge functions, e te aviso para clicar em "Re-rodar diagnóstico" no assessment travado para regenerar com dados de verdade.