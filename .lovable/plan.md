## Bloco 4 Parte 2 — Fechar o /diario

Estado atual: 5 zonas funcionais (Editor + 4 feeds: Atividades, Notas, Deals, Pendências IA). Falta a 6ª zona e um pequeno polish.

### 1. Nova zona: "Insight da Mari do dia"

Card no topo da coluna direita do feed (acima de "Atividades"), reaproveitando dados que já existem.

**Fonte de dados:**
- Hoje: `mari_insights` da última geração (cron 06h diário, já roda).
- Dias passados: `mari_insights` com `created_at::date = selectedDate`.
- Fallback: se não houver registro do dia, mostrar estado vazio com link "Ver insights anteriores".

**Conteúdo do card:**
- Título "Insight da Mari" + ícone Sparkles Volt + badge com data do insight.
- 1–2 parágrafos curtos (truncado em ~280 chars com "Ler mais" expand inline).
- Lista de até 3 "ações sugeridas" se vierem no payload.
- Ao clicar em entidade mencionada (mandato/buyer/empresa), navega via `entityHref`.

**Acesso:** mesma regra de visibilidade do `mari_insights` (advisor/admin). Para outros roles o card simplesmente não renderiza.

**Reaproveitamento:** se já houver `MariInsightsSection` em `/equity-brain/hoje`, extrair para `<MariInsightCard variant="diary" date={dateStr} />` e reutilizar — não duplicar fetch.

### 2. Polish leve nos 4 feeds existentes

Sem redesign de grid, sem mexer em layout 2-colunas. Apenas:

- **Estados vazios mais cuidados** — substituir o `EmptyHint` genérico por mensagens contextuais (ex: "Nenhuma atividade hoje. Que tal abrir o WhatsApp Bridge?" com micro-link para `/equity-brain/hoje`).
- **Hierarquia visual** — header de cada `FeedCard` ganha contagem em pill Volt sutil quando > 0; quando = 0 fica em cinza.
- **Espaçamento** — padding interno dos itens uniformizado em `px-2 py-2` (hoje varia entre `py-1.5` e `py-2`).
- **Hover** — `hover:bg-zinc-800/60` consistente em todos os feeds (alguns estão em `/40`).
- **Skeleton de loading** — quando `useDailyFeed` está fetching, mostrar 2 linhas shimmer por card em vez de "0 items".
- **Ordenação Insight Mari > Atividades > Notas > Deals > Pendências IA** — fixar essa ordem (mais "humano" → mais "máquina").

### 3. Fora de escopo

- Não muda schema, não cria tabela nova.
- Não mexe no editor central nem no TemplatePicker.
- Não adiciona "Próximos passos" nem "Matches que esfriaram" (decidido: 6ª zona = só Insight Mari).
- Não toca em `useDailyNote`/`useDailyFeed` salvo para incluir o fetch de `mari_insights` (pode ser hook separado `useMariInsightOfDay(dateStr)`).

### Detalhes técnicos

```text
DailyDiaryPage.tsx
├── Header (inalterado)
└── grid 1fr_360px
    ├── Editor (inalterado)
    └── Feed column
        ├── <MariInsightCard date=dateStr />   ← NOVO
        ├── FeedCard "Atividades"  (polish)
        ├── FeedCard "Notas"       (polish)
        ├── FeedCard "Deals"       (polish)
        └── FeedCard "Pendências IA" (polish)
```

Arquivos novos:
- `src/components/equity-brain/diary/MariInsightCard.tsx`
- `src/hooks/useMariInsightOfDay.ts` (select por data em `mari_insights`)

Arquivos tocados:
- `src/pages/equity-brain/DailyDiaryPage.tsx` (mount do card + ajustes de estado vazio/skeleton/hover/contagem nos 4 FeedCards já existentes)

Sem migration. Sem mudanças em edge function. Sem mudança de rota.
