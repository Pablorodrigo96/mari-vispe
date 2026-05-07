## Plano: Simulador Investidor + Simulador Due Diligence

Dois novos módulos integrados à aba **Vender** do `AppSidebar`, com persistência no backend (Lovable Cloud), scoring automático e histórico.

---

### 1. Navegação (sidebar)

Editar `src/components/layout/AppSidebar.tsx` — array `sellChildren`:

```text
Vender
├── Meus anúncios
├── Anunciar empresa
├── Simulador Investidor       (ícone: TrendingUp)   → /vender/simulador-investidor
└── Simulador Due Diligence    (ícone: CheckSquare)  → /vender/due-diligence
```

Rotas registradas em `src/App.tsx` dentro do AppShell autenticado.

---

### 2. Backend (migração)

Duas tabelas + RLS (usuário só vê o próprio histórico; admin vê tudo).

**`investor_sim_attempts`**
- `id uuid pk`, `user_id uuid`, `created_at`, `completed_at`
- `score int`, `score_final int` (com penalidade se abandonado)
- `abandoned bool default false`
- `total_questions int`, `complete_count int`, `partial_count int`, `noinfo_count int`
- `answers jsonb` — `[{question_id, type: 'complete'|'partial'|'no_info', text}]`
- `classification text`

**`due_diligence_audits`**
- `id uuid pk`, `user_id uuid`, `created_at`, `updated_at`
- `answers jsonb` — `{ "<sector_id>": { "<item_id>": true|false } }`
- `total_items int`, `yes_count int`, `score_pct numeric`
- `classification text`, `completed bool default false`

RLS: `user_id = auth.uid()` para CRUD do dono + `has_role(auth.uid(),'admin')` para SELECT admin.

---

### 3. Banco de perguntas/itens (estático)

Arquivo `src/lib/sellSimulators.ts` exporta:
- `INVESTOR_QUESTIONS` — 18 perguntas das 6 categorias do prompt (produto, mercado, financeiro, clientes, equipe, estratégia), cada uma `{ id, category, question }`.
- `DD_SECTORS` — 9 setores (Legal, Financeiro, Operacional, Comercial, RH, Produto/Tech, Investimento, Riscos, BI) com todos os itens listados (~121 itens), cada item `{ id, label }`.

---

### 4. Simulador Investidor — `src/pages/sell/InvestorSimulator.tsx`

Estados: `attemptId`, `currentIndex`, `answers[]`, `score`, `phase: 'intro'|'running'|'result'`.

**Tela intro**: título + descrição + botão "Iniciar Entrevista" + alert amarelo sobre penalidade de abandono.

**Tela entrevista**:
- Header: `Progress` (current/total), badge "Score atual: X", botão vermelho "Sair" (`AlertDialog` confirma "−30%").
- Card da pergunta atual com categoria + texto.
- 3 opções de resposta (radio cards):
  1. **Resposta Completa** — `Textarea`, mín 20 chars, +10 pts
  2. **Resposta Parcial** — `Textarea` mais curto, +5 pts
  3. **Não tenho esta informação** — botão cinza, +0 pts
- Validação: "Próxima" desabilitada até escolher tipo + (se completa/parcial) atender mínimo de chars.
- Ao iniciar: `INSERT` em `investor_sim_attempts` com `abandoned=false`. A cada resposta, `UPDATE` (autosave do `answers` + score parcial). Se sair pela meio: `UPDATE` com `abandoned=true`, `score_final = round(score*0.7)`, ir direto pro resultado.

**Tela resultado**:
- Score final + `Progress` colorida.
- Classificação por faixa (0-50 vermelho / 51-100 laranja / 101-150 amarelo / 151-180 verde) com emoji + texto do prompt.
- Lista das perguntas sem resposta completa (para estudar).
- Botões: "Tentar Novamente", "Salvar Resultado" (já salvo, só toast), "Voltar ao Painel".
- Seção **Histórico** (últimas 5): tabela com data + score + classificação + link "Revisar".

Scoring: `score = complete*10 + partial*5`; se `abandoned`, `score_final = floor(score*0.7)`, senão `score_final = score`.

---

### 5. Simulador Due Diligence — `src/pages/sell/DueDiligenceSimulator.tsx`

Estados: `auditId`, `currentSector`, `answers` (Map), `phase: 'intro'|'running'|'result'`.

**Tela intro**: título + descrição + info box azul "respostas privadas, não enviadas" + botão "Iniciar Auditoria". Se houver auditoria incompleta, oferece "Continuar".

**Tela auditoria**:
- Layout 2 colunas (mobile: tabs no topo):
  - **Esquerda**: lista de setores com `Progress` por setor + check de conclusão.
  - **Direita**: itens do setor atual como linhas com `Switch`/par de botões `SIM | NÃO`. Pendentes ficam neutros.
- Header: "X de Y itens verificados" geral + botões "Anterior setor" / "Próximo setor".
- Autosave: cada toggle dispara `UPDATE` debounced em `due_diligence_audits.answers`.
- Ao tentar voltar pro painel: `AlertDialog` "Sair sem concluir? Sua auditoria fica salva."

**Tela resultado**:
- Score geral % com classificação (0-20 crítico / 21-50 insuficiente / 51-75 bom / 76-100 excelente).
- **Gráfico pizza** de % conclusão por setor (recharts `PieChart`).
- Cards por setor com `Progress` colorida (vermelho/laranja/amarelo/verde por faixa).
- **Lista de gaps**: itens "NÃO" agrupados por setor, marcação "red flag" para itens críticos pré-flagados (`critical: true` em `sellSimulators.ts` em ~12 itens-chave: Demonstrações 3 anos, CNPJ ativo, Contratos top 10, LGPD, Litígios, Auditoria contábil, etc).
- Botão "Exportar Relatório" → gera PDF client-side (`jspdf` já no projeto se disponível, senão `window.print()` em rota dedicada).
- Histórico: últimas auditorias com data + score + delta vs anterior.

Cálculo: `score_pct = round(yes_count / total_items * 100)`. Apenas itens explicitamente respondidos contam para `total_items` (questões pendentes não inflam denominador) — ou alternativa: total fixo (~121); preferir total fixo para comparabilidade entre auditorias.

---

### 6. Hooks

- `src/hooks/useInvestorSim.ts` — `startAttempt`, `saveAnswer`, `finishAttempt({abandoned})`, `listAttempts(limit)`.
- `src/hooks/useDueDiligence.ts` — `loadOrCreateAudit`, `setItem(sector,item,value)` (debounced 500ms), `completeAudit`, `listAudits`.

Ambos usam `supabase` client + React Query para invalidar listas.

---

### 7. Detalhes técnicos

- Reusar `Card`, `Button`, `Progress`, `Textarea`, `RadioGroup`, `AlertDialog`, `Tabs`, `Badge`, `toast` (sonner) já existentes.
- Cores seguindo tokens mari (Volt/Carbon) — mesma estética dos cards de `MyListings`.
- Mobile-first: viewport 440px é referência. Nas perguntas, opções viram stack vertical; no DD, setores viram `Tabs` horizontais com scroll.
- Acessibilidade: labels nos botões SIM/NÃO, foco no Textarea ao trocar de pergunta.
- Sem novas dependências (recharts e sonner já estão no projeto).

---

### 8. Arquivos novos / editados

**Novos**
- `supabase/migrations/<timestamp>_sell_simulators.sql`
- `src/lib/sellSimulators.ts`
- `src/hooks/useInvestorSim.ts`
- `src/hooks/useDueDiligence.ts`
- `src/pages/sell/InvestorSimulator.tsx`
- `src/pages/sell/DueDiligenceSimulator.tsx`
- `src/components/sell/sim/InvestorQuestionCard.tsx`
- `src/components/sell/sim/InvestorResultCard.tsx`
- `src/components/sell/sim/DDSectorPanel.tsx`
- `src/components/sell/sim/DDResultDashboard.tsx`

**Editados**
- `src/components/layout/AppSidebar.tsx` — adicionar 2 itens em `sellChildren`.
- `src/App.tsx` — registrar `/vender/simulador-investidor` e `/vender/due-diligence`.
- `src/components/layout/AppTopbar.tsx` — títulos das 2 rotas.

---

### 9. Fora de escopo (confirmar antes)

- Geração de PDF do relatório DD (vou usar `window.print()` numa rota com layout dedicado se `jspdf` não estiver instalado — confirmo no momento da execução).
- Integração do score com `equity_score`/perfil do usuário (não pedido — fica desacoplado).
- "Sugerir template/checklist por setor" do prompt: implemento como link estático para um Google Drive/Notion se você tiver, senão um placeholder de texto.