
# Sistema de Qualificação + Match Estendido para a Base RFB

## Conceito

Hoje o Equity Brain casa **mandato (vendedor)** ↔ **buyer cadastrado**. Quando não tem match na base curada (~116 empresas, 212 buyers), o advisor fica sem opção. Vamos:

1. Marcar todo registro com **`engagement_status`** (`qualified` / `unqualified`).
2. Quando o pool curado não satisfazer, oferecer um botão **"Expandir para Base Nacional (5M CNPJs)"** que importa novos prospects diretamente da RFB já filtrados, criando-os como `unqualified`.
3. Após contato real (ligação, WhatsApp, e-mail respondido, contrato), o advisor promove o lead para `qualified` num clique.

---

## Modelo de dados

### Novo enum
```sql
CREATE TYPE equity_brain.engagement_status AS ENUM ('qualified','unqualified');
```

### Colunas adicionadas

`equity_brain.companies`:
- `engagement_status` (default `'unqualified'`)
- `qualified_at timestamptz`
- `qualified_by uuid` (advisor que qualificou)
- `qualification_source text` (`partner_referral`, `franchisee`, `inbound_listing`, `cold_outreach`, `existing_relationship`)

`equity_brain.buyers`:
- mesmas 4 colunas acima (já tem `engagement_status` no schema — confirmar enum bate)

### Backfill (regra de qualificação automática)

Tudo que **já tem relacionamento** vira `qualified`:
- `companies` com `has_listing = true` (vendedor cadastrado na plataforma)
- `companies` com mandato em `equity_brain.mandates`
- `companies` referenciadas em `partner_lead_reservations`, `capital_requests`, `vdr_documents`
- `buyers` com `source != 'rfb_expand'` e que tenham ao menos 1 `crm_activities` registrada
- `buyers` ligados a `buyer_profiles` (clientes pagantes)

Resto fica `unqualified`.

---

## Fluxo do advisor

### Cenário A — Vendedor cadastrado, sem comprador adequado

Em `MandateDetailPage` (painel "Matches"):
1. Engine roda `match-company-v2` → mostra buyers `qualified` primeiro.
2. Se total < 5 ou advisor clica **"Expandir busca"**:
   - Abre modal com filtros pré-preenchidos do mandato (setor, UF, ticket).
   - Permite ajustar e dispara `match-extend-buyers` (nova edge function).
   - Função busca buyers `unqualified` na base + sugere **importar novos** (se houver capital aberto recente, sponsor PE ativo etc — heurística simples).
3. Buyers retornados aparecem com badge **"Não qualificado"** (cinza) e CTA **"Marcar como qualificado"** após contato.

### Cenário B — Comprador cadastrado, sem vendedor adequado

Em `BuyerDetailPage` (painel "Matches"):
1. `match-buyer` roda hoje contra `companies_scored` — vamos passar a priorizar `engagement_status='qualified'`.
2. Botão **"Buscar na Base RFB (5M)"**:
   - Modal com filtros do buyer (CNAE → setor, UF, porte, capital social mínimo, idade da empresa).
   - Dispara `expand-companies-from-rfb` (nova função; wrapper de `sync-companies-from-cnpj` mas via tese do buyer).
   - Importa N empresas (default 50) com `source='rfb_expand'` + `engagement_status='unqualified'` em `equity_brain.companies`.
   - Roda `compute-signals` + `match-company-v2` apenas para o lote novo.
   - Resultados aparecem na lista com badge **"RFB · não qualificado"**.

---

## UI

### Badge universal (`<EngagementBadge />`)
- `qualified`: verde Volt (`#D9F564`) + check
- `unqualified`: graphite + ícone de alvo

Aplicado em: `MatchesPanel`, `BuyersTable`, `MandatesTable`, `OportunidadesPage`, cards do Jarvis.

### Filtro padrão
`MatchesPanel` ganha tabs: **Qualificados** | **Todos** | **Apenas RFB**.

### Ação "Qualificar"
Em qualquer card de empresa/buyer não qualificado:
- Botão **"Qualificar lead"** abre popover pedindo motivo (`primeira ligação ok`, `WhatsApp respondido`, `reunião marcada`, `contrato assinado`).
- Cria `crm_activities` + UPDATE `engagement_status='qualified'`, `qualified_at=now()`, `qualified_by=auth.uid()`, `qualification_source` conforme escolha.

---

## Edge functions

### Nova: `expand-companies-from-rfb`
Input: `{ buyer_id, filters: { setores, ufs, porte_min, capital_min, idade_min_anos, limit } }`
1. Auth: admin OR advisor.
2. Conecta `EXTERNAL_DB_URL` (deno-postgres).
3. Reaproveita query base de `sync-companies-from-cnpj`, mas com filtros do buyer.
4. Exclui CNPJs já em `equity_brain.companies`.
5. UPSERT com `source='rfb_expand'`, `engagement_status='unqualified'`.
6. Trigger pós-insert (ou chamada explícita): roda `compute-signals` + `match-buyer` para o buyer original.
7. Retorna `{ imported, matched, top_matches: [...] }`.

### Nova: `expand-buyers-for-mandate`
Input: `{ mandate_id }` ou `{ company_cnpj, filters }`.
- Por enquanto apenas relaxa filtros e roda `match-company-v2` incluindo buyers `unqualified` (não importa novos buyers — buyers só entram via cadastro real).
- Retorna lista ordenada com flag `unqualified`.

### Nova: `qualify-lead`
Input: `{ entity_type: 'company' | 'buyer', entity_id, source, notes }`
- UPDATE engagement_status + INSERT crm_activity + dispara notificação.

### Modificada: `match-buyer` e `match-company-v2`
- Aceitar parâmetro opcional `include_unqualified: boolean` (default `false`).
- Quando `false`, filtrar `engagement_status='qualified'`.

---

## Layout técnico (resumo)

```text
┌──────────────────────────────────────────────────────────┐
│  MandateDetail / BuyerDetail                             │
│  ┌─ MatchesPanel ──────────────────────────────────┐     │
│  │ [Qualificados (12)] [Todos (47)] [RFB (0)]      │     │
│  │  • Buyer A  qualified                           │     │
│  │  • Buyer B  unqualified  [Qualificar]           │     │
│  │  ...                                             │     │
│  │  [+ Expandir busca na Base RFB (5M)]            │     │
│  └─────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
        │
        ▼ (clique)
   Modal de filtros → expand-companies-from-rfb
        │
        ▼
   Imports N empresas → match-buyer roda → resultados
   aparecem com badge "RFB · não qualificado"
```

## Migrações necessárias

1. ENUM `engagement_status` (se não existir compatível).
2. Colunas em `companies` e `buyers`.
3. Backfill SQL aplicando regras de qualificação automática.
4. Índice em `(engagement_status, ma_score DESC)` em `companies` para acelerar listagem.

## Checklist de entrega

- [ ] Migração DB + backfill.
- [ ] 3 edge functions novas + 2 modificadas.
- [ ] `<EngagementBadge />`, modal "Expandir busca", popover "Qualificar".
- [ ] Tabs em `MatchesPanel` + integração nos 2 detail pages.
- [ ] Coluna "Qualificação" em `BuyersTable` e `MandatesTable`.
- [ ] Atualizar memória do projeto.

---

## Pontos para você decidir antes de eu codar

1. **Limite por expansão RFB:** sugestão default = 50 empresas por clique. OK ou prefere outro?
2. **Quem pode expandir RFB:** só `admin`, ou também `advisor`? (Importação é cara — recomendo `admin` + `advisor`.)
3. **Auto-qualificação por evento:** quando o advisor enviar primeira mensagem WhatsApp pelo CRM, devo já marcar como `qualified` automaticamente, ou exigir o clique manual? (Recomendo manual com sugestão automática, para o advisor confirmar.)
4. **Buyers RFB:** concorda em **não importar buyers da RFB** (buyers só nascem de cadastro real)? Ou quer que eu também sugira "potenciais compradores" baseados em quem fez M&A recente no setor (campo `recent_capital_raise_brl` já existe)?
