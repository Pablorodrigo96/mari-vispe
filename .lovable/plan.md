## Bloco 5 — Templates de notas

Bloco 4 entregue. Próximo passo natural: **templates pré-formatados** que o advisor injeta com 1 clique em qualquer editor de nota (entity ou daily). Acelera radicalmente call discovery, IOI, follow-up, post-mortem e o template do diário.

---

### 1. Catálogo de templates (fase 1: estáticos no código)

Sem tabela nova. Arquivo `src/lib/eb/noteTemplates.ts` exporta array tipado:

```ts
export type NoteTemplate = {
  id: string;                // 'call-discovery'
  label: string;             // 'Call Discovery'
  description: string;       // 1 linha pro tooltip
  scope: ('mandate'|'buyer_ma'|'company'|'daily')[]; // onde aparece
  icon: LucideIcon;
  body: string;              // markdown com placeholders
};
```

6 templates iniciais:

1. **Call Discovery** — escopo mandate/buyer/company. Seções: Contexto, Dores, Critérios de decisão, Próximos passos, Mentions `@`.
2. **IOI / Carta de interesse** — buyer/company. Faixa de valuation, condições, prazo.
3. **Follow-up** — todos. Última interação / Status / Pendências / Próximo toque.
4. **Post-mortem (Lost)** — mandate/company. Motivo, sinais ignorados, aprendizado.
5. **Reunião 1:1** — daily. Pauta, decisões, ações.
6. **Daily padrão** — daily. Substitui o template fixo atual do `DailyDiaryPage`.

Placeholders soft: `{{date}}`, `{{entityLabel}}` — substituídos no momento da inserção (sem engine, só `String.replace`).

---

### 2. UI: `<TemplatePicker/>` (popover)

Componente `src/components/equity-brain/notes/TemplatePicker.tsx`:

- Botão `<Button variant="ghost" size="sm">` com ícone `FileText` + label "Template".
- Popover shadcn com `Command` (search + lista filtrada por `scope`).
- Cada item: ícone + label + description; Enter/clique injeta `body` no textarea via callback `onInsert(markdown)`.
- Comportamento: insere no caret atual; se textarea já tem conteúdo, prefixa com `\n\n`.

---

### 3. Integração nos editores existentes

**a) `<EntityNotes/>`** (`src/components/equity-brain/notes/EntityNotes.tsx`)
- No header do form de nova nota / edição, adicionar `<TemplatePicker scope={entityType} onInsert={…}/>` ao lado do toggle Markdown/Preview.
- `onInsert` faz `setBody(prev => prev ? prev + "\n\n" + tpl : tpl)`.

**b) `<DailyDiaryPage/>`** (editor diário)
- Substituir botão atual "Inserir template" por `<TemplatePicker scope="daily"/>`.
- Template "Daily padrão" reproduz o snippet fixo de hoje (Prioridades / Calls / Insights) — mantém compatibilidade.

---

### 4. Placeholders dinâmicos

Helper `applyTemplate(tpl: NoteTemplate, ctx: { date?: string; entityLabel?: string }): string`:

- `{{date}}` → `format(new Date(), "dd/MM/yyyy")` ou `ctx.date`.
- `{{entityLabel}}` → nome do mandato / razão social / buyer label (passado pelo pai).
- Outros tokens deixam como estão (futuro Bloco 6/7).

---

### 5. Fora de escopo

- Templates customizados criados pelo usuário (fase 2 → tabela `equity_brain.note_templates`).
- Compartilhamento entre advisors.
- Templates com variáveis interativas (forms in-modal).
- Atalhos de teclado por template.

---

### 6. Memória

Atualizar `mem://features/entity-notes-kb.md` adicionando seção "Bloco 5 entregue":
- `noteTemplates.ts` catálogo + tipos
- `<TemplatePicker/>` integrado a `EntityNotes` + `DailyDiaryPage`
- 6 templates iniciais com escopo
- Placeholders `{{date}}` / `{{entityLabel}}`

Sem nova entrada no índice — continua no memo Núcleo de Conhecimento.

---

### 7. Arquivos

**Novos**
- `src/lib/eb/noteTemplates.ts`
- `src/components/equity-brain/notes/TemplatePicker.tsx`

**Editados**
- `src/components/equity-brain/notes/EntityNotes.tsx` (inserir picker no editor)
- `src/pages/equity-brain/DailyDiaryPage.tsx` (trocar template fixo por picker)
- `.lovable/memory/features/entity-notes-kb.md`
- `.lovable/plan.md`

Sem migrations, sem novas tabelas, sem novas rotas. Entrega rápida.
