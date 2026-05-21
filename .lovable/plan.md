## Polimento do Bloco 2 — Cartas em lote

Quatro melhorias focadas em UX e robustez, sem mexer no envio por e-mail (segue em standby).

### 1. Validação de endereço mais rica no `SendLettersDialog`

Hoje a checagem é só `postal_address && postal_zipcode`. Vou:

- Detalhar quais contatos estão incompletos (lista colapsável com nome + campo faltando).
- Validar CEP com regex `^\d{5}-?\d{3}$` e UF/cidade não vazios.
- Adicionar botão "Remover incompletos da seleção" que chama `onComplete` filtrando.
- Manter o bloqueio quando `missing.length > 0`.

### 2. Prévia navegável (1 → N)

No dialog, hoje só mostra a 1ª carta. Vou adicionar:

- Setas `‹ Carta X de N ›` para navegar pelos contatos.
- Indicador visual quando o template tem placeholder não resolvido (ex.: `{{cnpj}}` quando `c.cnpj` é nulo) — destacar em amarelo.
- Botão "Baixar prévia (PDF)" que gera só a carta atual (chamada à edge com flag `preview=true`, sem persistir batch).

### 3. Histórico: filtros, paginação e métricas

Em `LetterHistoryPage.tsx`:

- Cabeçalho com 3 KPIs: **Lotes no mês**, **Cartas geradas (total)**, **Última remessa** (data).
- Filtro por status (Todos / Gerando / Enviado / Falhou) e busca por data (últimos 7/30/90 dias).
- Paginação client-side de 20 em 20 (`useLetterBatches` já retorna ordenado por created_at desc).
- Mostrar nome do template usado em cada card (join com `letter_templates.name`).

### 4. Card de lote no Pipeline (badge no contato)

Quando um contato já recebeu carta:

- Mostrar badge `📮 Carta enviada · DD/MM` ao lado do nome em `ProspectionTab`.
- Tooltip com link "Ver lote" abrindo `/equity-brain/cartas/historico?batch=<id>`.
- Fonte: nova view `eb_contact_last_letter` (SELECT lateral do último `letter_batch_recipients` por contact_id). Sem migração nova de tabela — só a view.

### Detalhes técnicos

- **Migração**: 1 view `eb_contact_last_letter` com RLS herdada das tabelas-base.
- **Edge function**: pequena alteração em `send-letters-batch/index.ts` para aceitar `preview: true` (renderiza 1 carta, devolve PDF base64, não cria batch).
- **Hook novo**: `useContactLastLetter(contactIds: string[])` para buscar em batch.
- **Sem dependência de e-mail / DNS** — tudo funciona com o estado atual.

### Estimativa
~45 min. 1 migração leve (view), 1 edit em edge function, 4 edits em frontend.

### Fora de escopo
- Bloco 3 (tracking de resposta) e conexão do e-mail da gráfica continuam no backlog.