## Camada de orientação por tela — "i" amigável em tudo

Objetivo: advisor/seller/admin abre qualquer tela e entende em 5 segundos **pra que serve, o que fazer e uma dica** — sem ler tutorial externo.

---

### 1. Infra (1 vez, depois é só catálogo)

**A. Componente novo `<PageHeaderHint>`** (`src/components/ui/PageHeaderHint.tsx`)
- (i) discreto ao lado do `<h1>` da página.
- Tooltip com 3 blocos curtos no estilo iFood help:
  - **Pra que serve** (1 linha)
  - **Faça agora** (1–2 bullets imperativos, max 2 linhas)
  - **Dica** (1 linha, opcional)
- Tom curto e direto. Sem jargão técnico (sem "RPC", "JWT", "RLS").
- Recebe `pageKey: string` e busca no catálogo. Fallback silencioso se não existir.

**B. Componente `<SectionHint>`** (mesmo arquivo, export auxiliar)
- (i) menor para blocos internos (tabela, kanban, formulário, lista de matches).
- Mesma estrutura, fonte ainda menor, max 2 linhas por bloco.
- Recebe `sectionKey: string`.

**C. Catálogo único `src/lib/screenGuides.ts`**
```ts
export type Guide = { purpose: string; doNow: string[]; tip?: string };
export const PAGE_GUIDES: Record<string, Guide> = { ... };
export const SECTION_GUIDES: Record<string, Guide> = { ... };
```
- Todas as strings em pt-BR, tom imperativo, máx 80 chars por bullet.
- Convenção de chaves: `pageKey` = rota slugificada (`eb.hoje`, `painel`, `vender.wizard`). `sectionKey` = `pageKey + "." + bloco` (`eb.hoje.feed`, `pipeline.kanban.coluna`).

**D. Reaproveitar (não duplicar):**
- `<InfoHint>` existente fica responsável só por KPIs/charts (já uso atual). `<PageHeaderHint>` e `<SectionHint>` são novos para orientação de tela — mesmo visual (Volt-accent, dark glassmorphism) para consistência.

---

### 2. Catálogo de conteúdo — quem escreve o quê

Vou popular `screenGuides.ts` com texto curto para **TODAS** as 70+ telas, em **3 ondas** dentro do mesmo entregável (não é faseamento de approval — é só ordem de implementação no mesmo loop):

**Onda 1 — Crítico advisor (12 telas)**
`/painel`, `/equity-brain/hoje`, `/equity-brain/diario`, `/equity-brain/crm` (hub), `/equity-brain/mandato/:id`, `/equity-brain/buyer/:id`, `/equity-brain/deal/:id`, `/equity-brain/pipeline`, `/equity-brain/matches`, `/equity-brain/exec`, `/equity-brain/match/analytics`, `/equity-brain/imports`

**Onda 2 — EB restante (~30 telas)**
Calls, NoteSearch, Compradores, Mapa, Grafo (3), ISP (3), Mandatos table, Match Inbox/Detail, Exports, Disclosures, Permissions, Health, Coverage, Shadow, Tag, Teses, News, Propostas, QuickFill, MyCompanies, BuyersPage, MandateForm, CrmAssignments, CrmAudit, AccessAudit, Dedupe, OportunidadesPage/EmAndamento, PipelineHistory

**Onda 3 — Seller + Admin (~25 telas)**
`/vender` (wizard 4 steps), `/meus-anuncios`, `/meus-anuncios/:id`, `/matching`, `/captacao`, `/perfil`, `/valuation`, `/mari`, `/admin/aprovacoes`, `/admin/usuarios`, `/admin/listings`, `/admin/integrations`, `/admin/health`, `/admin/api-costs`, `/admin/franchisees`, `/admin/partners`, etc.

Cada entrada do catálogo segue **template fixo**:
```
hoje: {
  purpose: "Sua tela do dia. Mostra quem ligar, quem cobrar, o que a Mari achou.",
  doNow: [
    "Comece pelos cards vermelhos (urgência).",
    "Use o botão WhatsApp pra registrar contato automático."
  ],
  tip: "A Mari recalcula a lista a cada 4h.",
}
```

---

### 3. Onde plugar o (i) em cada tela

Padrão visual: `<h1 className="...">Título <PageHeaderHint pageKey="..." /></h1>`. Sem mudança de layout, só adiciona o ícone após o título.

Para `<SectionHint>`, plugar no header de cada bloco (já existem componentes `FeedCard`, `KpiHeader`, `PipelineFunnel`, `TasksWidget`, etc. — só adiciono o (i) no JSX existente).

Lista priorizada dos blocos internos com `<SectionHint>` (Onda 1+2):
- Cockpit Week Strip do `/painel` (5 cards)
- 5 FeedCards de `/diario` (Insight Mari, Atividades, Notas, Deals, IA)
- 7 cards de `/hoje`
- 3 colunas do Deal unificado (vendedor·match·buyer)
- Kanban: cada coluna do pipeline ganha (i) no header
- Match Inbox: filtros + lista
- Imports: zona de upload + tabela de status
- ISP: import + mercado + sugestões
- Wizard `/vender`: cada step (4)
- Wizard captação: lead score + form
- Aprovações admin: tab pendentes + tab histórico

---

### 4. Onboarding leve (bônus de baixo custo)

- Hook `useFirstTimeOnPage(pageKey)` — guarda em `localStorage` (`mari_pageguide_seen_v1`) quais telas o usuário já visitou.
- Na **primeira visita** de uma tela: o (i) do header pulsa em Volt por 4 segundos e abre o tooltip automaticamente uma vez. Depois fica neutro.
- Botão "Ver guia novamente" pequenininho no header do AppShell que reseta o `localStorage` se o usuário quiser revisitar.

---

### 5. Fora de escopo

- Não cria drawer de ajuda lateral nem tour interativo passo a passo.
- Não mexe nos tooltips existentes (`ebTooltips.ts`) — eles continuam servindo KPIs/charts.
- Não cria sistema CMS pra editar tooltips por usuário não-dev (texto fica em código, em pt-BR, fácil de revisar via PR).
- Não traduz pra inglês (BR-only).
- Não muda schema, não cria tabela, não toca em RLS.

---

### 6. Estrutura técnica resumida

```
src/
├── components/ui/PageHeaderHint.tsx   ← novo (PageHeaderHint + SectionHint)
├── hooks/useFirstTimeOnPage.ts        ← novo
└── lib/
    ├── ebTooltips.ts                  ← intocado (KPIs)
    └── screenGuides.ts                ← novo (catálogo 70+ telas)
```

Páginas tocadas: ~70 arquivos, mas cada um leva 1 linha de import + 1 atributo `<PageHeaderHint pageKey="..." />` no h1. Blocos internos: ~30 inserts adicionais. Zero refactor.

---

### 7. Critério de pronto

- Toda página advisor/seller/admin tem (i) no header com texto pt-BR curto.
- Blocos internos críticos (listados acima) têm (i) próprio.
- Primeira visita pulsa por 4s; visitas seguintes ficam neutras.
- Catálogo está num único arquivo, fácil de revisar e ajustar texto sem mexer em componente.
