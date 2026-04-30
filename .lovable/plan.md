## Auditoria das Fases 1–6 — pontas soltas encontradas

Varredura completa do que foi entregue contra o plano original. Schema, edge functions, views, seeds, bucket e enum estão todos OK. Mas dois problemas reais ficaram:

---

### Problema 1 — Trigger de proteção `guard_isp_promotion` não foi criado (CRÍTICO)

O plano (item 1.7) previa um trigger `BEFORE UPDATE` em `equity_brain.companies` que bloqueia qualquer mudança de `qualification_status` em ISPs Anatel sem que haja um registro recente em `isp_promotion_log` (janela de 5s).

Verificação:
```text
SELECT trigger_name FROM information_schema.triggers
 WHERE trigger_schema='equity_brain' AND trigger_name LIKE '%isp%';
→ 0 rows
```

Impacto: a edge function `eb-promote-cold-isp` foi escrita assumindo que o trigger existe (linhas 128 e 173 do código: comentário "libera o trigger por 5s"). Hoje:
- Qualquer admin/advisor pode dar `UPDATE` direto em `companies.qualification_status` de um ISP Anatel pulando o fluxo controlado.
- Promoções fora do `eb-promote-cold-isp` não geram entrada em `isp_promotion_log` → perdemos auditoria, snapshot e rastreabilidade.
- O `is_company_visible_in_crm()` da Fase 6 ainda funciona (porque ele lê o log), então uma promoção burlada **nem aparece no CRM**, deixando dados inconsistentes (status mudado mas empresa invisível).

Correção: criar a função `equity_brain.guard_isp_promotion()` e o trigger `trg_guard_isp_promotion` exatamente como no plano 1.7.

---

### Problema 2 — Sidebar do Equity Brain sem links para Imports e ISP

`src/components/equity-brain/EBSidebar.tsx` lista 12 itens (Dashboard, Match Inbox, CRM, Board, Oportunidades, Mapa, Grafo, Jarvis, Buyers, Teses, Calls, Shadow). Não há entrada para:

- `/equity-brain/crm/imports` (Bulk Imports — feature anterior, mas mesmo assim sem link na sidebar EB)
- `/equity-brain/isp/import` (Anatel)
- `/equity-brain/isp/sugestoes` (cold matches a revisar)
- `/equity-brain/isp/mercado` (dashboard de mercado)

Hoje o usuário só chega nas 3 páginas ISP via URL direta ou via card dentro de `ImportsPage`. Para um módulo que envolve 6 fases de trabalho, isso é descoberta zero.

Correção: adicionar grupo "Dados & ISP" na sidebar com:
- Imports (`/equity-brain/crm/imports`) — ícone `Upload`
- ISP Anatel (`/equity-brain/isp/import`) — ícone `Wifi` ou `Radio`
- ISP Sugestões (`/equity-brain/isp/sugestoes`) — ícone `Sparkles` (badge se houver cold matches pendentes — opcional, fica fora do escopo)
- ISP Mercado (`/equity-brain/isp/mercado`) — ícone `BarChart3`

Visíveis só para admin/advisor (já são as roles do RequireRole nas rotas; sidebar pode esconder se `useUserRoles` não tiver nenhuma das duas).

---

### Itens já OK (sem ação necessária)

- 6 tabelas `isp_*` criadas e com RLS
- 4 views públicas `eb_isp_*` criadas (Fase 6)
- 3 views legadas `v_isp_universe`, `v_opportunities_by_municipio`, `v_opportunities_by_uf` recriadas
- 10 signal_catalog seeds `isp_*` populados
- Enum `qualification_status` com 8 valores
- Bucket `isp-anatel` criado e privado
- Coluna `matches.is_cold_suggestion` existe
- 4 edge functions ISP deployadas (`eb-import-anatel`, `eb-compute-isp-stats`, `eb-match-isp-cold`, `eb-promote-cold-isp`)
- 3 páginas frontend criadas e roteadas

---

## Plano de correção

### Migration (1 arquivo)
Criar `equity_brain.guard_isp_promotion()` (SECURITY DEFINER, search_path=public) + trigger `trg_guard_isp_promotion BEFORE UPDATE OF qualification_status ON equity_brain.companies`. Idempotente (DROP TRIGGER IF EXISTS antes).

Teste embutido na própria migration (DO block) que tenta um UPDATE proibido em uma linha fictícia e confirma que levanta a EXCEPTION esperada — depois faz ROLLBACK do teste.

### Frontend (1 arquivo)
Editar `src/components/equity-brain/EBSidebar.tsx`:
- Adicionar separador visual + label "Dados" entre "Shadow" e o footer
- Adicionar 4 NavLinks (Imports, ISP Anatel, ISP Sugestões, ISP Mercado)
- Esconder o grupo inteiro se o usuário não for admin nem advisor (via `useUserRoles`)

Sem mexer em mais nada.

---

Aprovando, executo as duas correções em sequência (migration + edit de sidebar).