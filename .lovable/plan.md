## Objetivo

Transformar `/admin/whatsapp-monitor` em uma ferramenta de inspeção real, com filtros por advisor, direção, status, sentimento, intent, busca textual e período — substituindo o limit fixo de 100 por uma query parametrizada.

## Mudanças

### 1. Barra de filtros (acima da tabela)

Layout em grid responsivo (3 col desktop / 1 col mobile), dentro do mesmo Card "Mensagens recentes":

- **Busca textual** — input com ícone de lupa, debounce 300ms, aplica `ilike` em `content_text`, `phone_from`, `phone_to` e `meta_message_id`.
- **Advisor** — `Select` populado via `advisor_whatsapp_config` join com `profiles.full_name` (carregado uma vez no mount). Inclui opção "Todos".
- **Direção** — `Select`: Todas / Inbound / Outbound.
- **Status** — `Select`: Todos / received / processed / failed / sent / delivered / read.
- **Sentimento** — `Select`: Todos / positive / neutral / negative / urgent / sem classificação.
- **Intent** — `Select` populado dinamicamente com `distinct intent` das últimas 500 msgs.
- **Período** — dois `Input type=date` (de / até), default últimos 7 dias.
- **Botão "Limpar filtros"** — reseta tudo para o default.

### 2. Lógica de carregamento

Reescrever `load()` para construir a query Supabase com encadeamento condicional (`if (filters.advisor_id) query = query.eq(...)`). Limit elevado para 500 quando filtros estão ativos. Os 4 KPIs no topo passam a refletir o resultado filtrado (renomear "Total (últimas 100)" → "Total filtrado").

Realtime continua escutando todas as mudanças, mas só refaz `load()` se a nova mensagem casaria com os filtros ativos (check leve client-side antes de chamar load).

### 3. Coluna Advisor + Intent na tabela

- Nova coluna **Advisor** logo após "Recebida em", mostrando `full_name` resolvido pelo map carregado nos filtros (fallback: `advisor_id` truncado).
- Nova coluna **Intent** ao lado de Sentimento, com Badge outline.

### 4. Export CSV

Botão "Exportar CSV" no header do Card, ao lado de "Atualizar" / "Reprocessar". Gera CSV client-side das linhas atualmente carregadas (respeitando filtros), com colunas: data, advisor, direção, de, para, tipo, conteúdo, sentimento, intent, status, mandate_id.

### 5. Persistência leve

Salvar o último estado dos filtros em `localStorage` (`wa_monitor_filters_v1`) para sobreviver a reload. Restaurar no mount.

## Detalhes técnicos

- Arquivo único editado: `src/pages/admin/AdminWhatsAppMonitor.tsx`.
- Componentes shadcn já disponíveis: `Select`, `Input`, `Button`, `Card`, `Table`, `Badge`, `Popover` (não necessário se usarmos `Input type=date`).
- Estado de filtros num único objeto `filters` para facilitar persistência e dependency arrays.
- Map `advisorNameById` carregado uma vez via:
  ```sql
  select c.advisor_id, p.full_name
  from advisor_whatsapp_config c
  left join profiles p on p.user_id = c.advisor_id
  ```
- Sem mudanças de schema, edge functions ou RLS — RLS atual em `whatsapp_messages` (admin-only) já cobre o caso.
- Sem novas migrações.

## Fora de escopo

- Paginação real (offset/cursor) — fica para próxima fase se 500 linhas for insuficiente.
- Drill-down por mensagem (modal de detalhes) — pode entrar em iteração futura.
- Filtro por mandato — já existe link `abrir`, mantemos assim.
