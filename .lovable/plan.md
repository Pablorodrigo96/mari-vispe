# Auditoria estrutural MARI — execução do PROMPT_AUDITORIA_ESTRUTURAL.md

## Objetivo
Produzir o relatório consolidado descrito no prompt (Jobs 1-7 + sumário + anexos), **sem nenhuma alteração de código, banco ou IA**. Apenas leitura: `rg`/`grep` no filesystem + `SELECT` no banco. Saída final: arquivo Markdown em `/mnt/documents/auditoria_estrutural_mari_<data>.md`.

## Escopo confirmado pelo inventário inicial
- Páginas: 46 em `src/pages/equity-brain/` + `src/pages/equity-brain/admin/*` + páginas raiz (Auth, Painel, Marketplace, etc.) → o relatório cobre todo `src/pages/`.
- Componentes EB: tudo em `src/components/equity-brain/**`.
- Edge functions: tudo em `supabase/functions/*`.
- Hooks: `src/hooks/*`.
- Libs: `src/lib/*`.
- Tabelas/views: schema `public` (e `equity_brain` se existir) — checagem inicial via `pg_tables` + `information_schema.views`.

## Plano de execução (ordem do prompt)

1. **Job 1 — Árvore de navegação**
   - Localizar sidebar EB (`AppShell`/`EBSidebar`) e extrair `MENU_ITEMS`.
   - Parsear `src/App.tsx` para `ROUTES` (path, componente, redirect).
   - Calcular `LINKED_ROUTES` por fixed-point: a cada rodada, varrer componentes/páginas já em LINKED procurando `<Link to="…">`, `<NavLink to="…">`, `navigate("…")`, `<Navigate to="…">`.

2. **Job 2 — Páginas**
   - Casar cada arquivo `*Page.tsx` com `ROUTES` e `LINKED_ROUTES`.
   - Identificar grupos suspeitos por nome (Dashboard*, Pipeline*, Match*, Buyer*, Mandate*, Isp*, Crm*).

3. **Job 3 — Componentes**
   - Listar todos `.tsx` em `src/components/equity-brain/**`.
   - Para cada um: `rg -l "from .*<Nome>['\"]|\\b<Nome>\\b"` em `src/`.
   - Marcar vivo se cadeia chega em `LINKED_ROUTES`.
   - Reportar 5-10 pares com sufixos suspeitos (`*Card` × `*Detail`, `*Drawer` × `*Page`, `V2`, `New`, `Old`).

4. **Job 4 — Edge functions**
   - `ls supabase/functions/`.
   - Para cada uma: `rg "functions.invoke\\(['\"]<f>|/functions/v1/<f>"` em `src/` e em `supabase/functions/`.
   - `SELECT jobname, schedule, command FROM cron.job` (se acessível) para crons.
   - `SELECT function_name, COUNT(*), MAX(created_at) FROM api_usage_logs GROUP BY 1` para validação real.

5. **Job 5 — Hooks** — `rg` por importação de cada `useXyz`.

6. **Job 6 — Libs** — `rg` por importação `@/lib/<nome>`.

7. **Job 7 — Tabelas/views**
   - `pg_tables` + `information_schema.views` (schemas `public` e `equity_brain` se existir).
   - `SELECT COUNT(*)` por tabela (em batch via `psql -c` ou query única com `UNION ALL`).
   - `rg "from\\(['\"]<t>['\"]\\)|equity_brain\\.<t>|FROM <t>"` para classificar lida/escrita/órfã.

8. **Relatório final** em `/mnt/documents/auditoria_estrutural_mari_2026-05-03.md` seguindo o template do prompt (sumário executivo, 7 seções, anexos com imports quebrados, TODO/FIXME e console.log em código vivo).

## Regras seguidas
- Nada é modificado, deletado ou criado no projeto.
- Sem migrations, sem edge functions novas, sem chamadas de IA.
- Apenas grep + SELECT + escrita do .md de saída em `/mnt/documents`.
- Onde a categorização for ambígua (ex.: hook só usado em comentário), eu **paro e pergunto** antes de marcar como órfão, conforme instrução do prompt.

## Não fazer
- Não emitir recomendações ("manter/deletar/ativar").
- Não tocar em `src/`, `supabase/functions/`, `supabase/migrations/`.
- Não atualizar dependências.
