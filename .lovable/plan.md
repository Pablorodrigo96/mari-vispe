
# Fase C — Drawer lateral + Timeline unificada

Objetivo: clicar em qualquer card de deal/mandato (Hoje, Oportunidades, Kanban, Lista) abre um drawer lateral com contexto completo, sem trocar de página. Página dedicada `MandateDetailPage` continua existindo.

## Diferenças vs spec (adaptações ao schema real)

Levantei o schema atual:

- ✅ existem: `equity_brain.crm_activities`, `equity_brain.whatsapp_action_log`, `equity_brain.mandate_subtasks`, `equity_brain.deal_events`, `public.eb_pipeline_transitions`
- ❌ **não existe** `equity_brain.vdr_documents` — vou omitir essa fonte da timeline (ou tentar `eb_documents` se existir; checo na hora)
- Colunas reais (spec usa nomes diferentes):
  - `crm_activities`: `kind` (não `activity_type`), `body` (não `notes`), `created_by`, `entity_type`+`entity_id` (precisa filtrar `entity_type='mandate'`)
  - `whatsapp_action_log`: **não tem `direction` nem `message_body`** → usar `draft_text_sent` / `draft_text_generated` e `marked_action`
  - `eb_pipeline_transitions`: `moved_by` + `moved_at` (não `changed_by`/`created_at`)
  - `mandate_subtasks`: `responsavel_id`/`anotacoes`/`updated_at` ok
  - `deal_events`: ligado por `match_id`/`cnpj`, não por `mandate_id` — vou trazer eventos cujo `cnpj` = cnpj do mandato

Ajusto o RPC para refletir a realidade e o componente de timeline lê o JSON normalizado.

## Entregáveis

### C.1 — RPC unificado (migration)
`equity_brain.get_deal_timeline(p_mandate_id uuid)` retorna `(ts, source, kind, title, body, actor_name, metadata, color)` consolidando 5 fontes (crm_activities, whatsapp_action_log, eb_pipeline_transitions, mandate_subtasks, deal_events). `SECURITY DEFINER`, com `GRANT EXECUTE TO authenticated` mas internamente filtrando por `has_role(auth.uid(),'admin') OR has_role(auth.uid(),'advisor')` (advisor vê tudo do mandato; non-advisor recebe vazio).

### C.2 — Componentes novos em `src/components/deal/`
- `DealDrawer.tsx` — wrapper `Sheet` (lado direito, 640px), composto por:
- `DealMeta.tsx` — header com codename, fase atual, status, dias na fase
- `DealMariInsights.tsx` — chama edge function `mari-deal-insights` (criar)
- `DealActions.tsx` — 4 botões: WhatsApp (usa `crmWhatsapp` existente), Nota (modal pequena que insere em `crm_activities`), Doc (futuro — placeholder com toast), Abrir página
- `DealTimeline.tsx` — consome RPC, renderiza com ícones por `source` (lucide-react)
- `DealDrawerContext.tsx` em `src/contexts/` — provider + hook `useDealDrawer()`

### C.3 — Edge function `mari-deal-insights`
Input: `{ mandate_id }`. Calcula em SQL: dias na fase atual, última atividade, # de docs, # de subtarefas pendentes. Manda contexto pra Gemini 2.5-flash + system prompt curto, retorna até 3 insights `{ severity, message, suggested_action?, action_url? }`. Cache por 30min em tabela `dashboard_insight_cache` (reusa).

### C.4 — Provider montado em `EquityBrainLayout`
Wrap dos children com `<DealDrawerProvider>` para que qualquer rota EB possa abrir o drawer.

### C.5 — Pontos de uso (integração mínima na fase)
- `TodayPage.tsx` — onClick do card chama `openDeal(card.mandate_id)`
- `MandatosTablePage.tsx` — onClick da linha (já existe navigate, troco por `openDeal`); mantenho botão Editar
- `PipelineKanbanPage.tsx` — onClick do card (não no drag) chama `openDeal`
- `EBOportunidadesPage.tsx` — se o item tem `mandate_id`, abre drawer

`MandateDetailPage` segue intocada por enquanto (refator C.6 fica para fase posterior — não é bloqueante).

## Limpeza de bugs detectados (drive-by)
Console mostra dois warnings de `forwardRef` que vou consertar:
1. `RequireRole` está sendo passado como element pra `<Route>` e React Router tenta passar ref → envolver em `forwardRef` (ou simplesmente garantir que retorne `<>{children}</>`, que já faz; o warning vem do `Route element`-wrapping, vou converter `RequireRole` em `React.forwardRef`).
2. `MandatosTablePage` linha 590 — componente `Cell` interno precisa de `forwardRef` (provavelmente usado dentro de `Tooltip`/`Slot`).

Faço esses dois fixes na mesma fase.

## Arquivos novos/editados

Novos:
- `supabase/migrations/<ts>_deal_timeline_rpc.sql`
- `supabase/functions/mari-deal-insights/index.ts` + `supabase/config.toml` block
- `src/components/deal/{DealDrawer,DealMeta,DealActions,DealTimeline,DealMariInsights}.tsx`
- `src/contexts/DealDrawerContext.tsx`

Editados:
- `src/components/equity-brain/EquityBrainLayout.tsx` (montar provider)
- `src/pages/equity-brain/{TodayPage,MandatosTablePage,PipelineKanbanPage,OportunidadesPage}.tsx` (handlers de click)
- `src/components/auth/RequireRole.tsx` (forwardRef)
- `src/pages/equity-brain/MandatosTablePage.tsx` (Cell forwardRef)

## Fora de escopo nesta fase (deixar para C.6 separada)
- Refatorar `MandateDetailPage` para reusar componentes (grande, melhor isolar)
- Upload de docs (não há tabela `vdr_documents` — precisa decidir storage/schema)
- Funcionalidade "Ligar" (não há sistema de telefonia)

## Critérios de aceite
- Click em card "Hoje" abre drawer em <500ms; URL não muda
- Timeline mostra eventos das 5 fontes em ordem decrescente
- Botão WhatsApp do drawer abre `wa.me` com draft (loga em `crm_activities`)
- Botão Nota salva em `crm_activities` (kind='note', entity_type='mandate')
- Drawer tem link "Abrir página completa" → `MandateDetailPage`
- Console sem o warning de forwardRef em `RequireRole` e `Cell`

Posso prosseguir?
