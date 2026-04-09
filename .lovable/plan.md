

## Plano: Fases 3 e 4 — Triggers/Funções + Dashboard do Captador

---

### Fase 3 — Triggers e Funções (Migração SQL)

Uma única migração SQL criando 4 triggers e 1 função:

#### 1. `calculate_lead_score()` — Trigger BEFORE INSERT OR UPDATE em `capital_requests`

Calcula `lead_score` baseado em:
- Faturamento mensal (30%): mapeia `monthly_revenue` text → valor numérico, normaliza 0-30
- Lucro líquido (25%): mapeia `net_profit` quando disponível, normaliza 0-25
- Razão valor/faturamento (20%): `annual_revenue / requested_amount`, quanto maior melhor, normaliza 0-20
- Completude do cadastro (15%): conta campos preenchidos (email, phone, sector, company_age, etc.), normaliza 0-15
- Tempo de empresa (10%): mapeia `company_age` text → score 0-10

Seta `NEW.lead_score` e `NEW.estimated_approval` com o valor calculado.

#### 2. `auto_match_providers()` — Trigger AFTER INSERT em `capital_requests`

- Busca `capital_providers` ativos onde:
  - `ticket_min <= requested_amount <= ticket_max`
  - `sector = ANY(sectors)` OU `sectors = '{}'`
  - Instrumentos compatíveis baseado no `capital_type`
- Insere em `capital_matches` com `match_score` calculado por compatibilidade
- Atualiza `matched_providers_count` no request

#### 3. `notify_on_capital_request()` — Trigger AFTER INSERT em `capital_requests`

- Insere notificação para todos os admins
- Insere notificação para franchisees cuja região (`franchisee_regions`) inclua o estado/categoria
- Insere evento em `capital_timeline` com `event_type = 'created'`

#### 4. `sla_deadline_setter()` — Trigger BEFORE INSERT em `capital_requests`

- Se `lead_score > 70`: `sla_deadline = now() + interval '72 hours'`
- Caso contrário: `sla_deadline = now() + interval '7 days'`
- Nota: roda AFTER `calculate_lead_score` (order via trigger naming)

#### 5. Função `increment_capital_view(p_request_id uuid)`

- `UPDATE capital_requests SET views_count = views_count + 1 WHERE id = p_request_id`
- SECURITY DEFINER para funcionar sem RLS de UPDATE para o viewer

---

### Fase 4 — Dashboard do Captador

#### 4a. Lista `/minhas-captacoes` — Reescrever `MyCapitalRequests.tsx`

Cards expandidos com:
- Status colorido (badge com cores por status: pending=amarelo, in_review=azul, matched=roxo, proposal_sent=verde, closed=cinza)
- Score de aprovação (circular progress)
- Valor solicitado formatado
- `matched_providers_count` (ícone + número)
- Barra de progresso (0-100%) baseada em: docs enviados + etapas concluídas do pipeline
- Próxima ação pendente (texto dinâmico baseado no status)
- Click → navega para `/minhas-captacoes/:id`

#### 4b. Detalhe `/minhas-captacoes/:id` — Nova página `CapitalRequestDetail.tsx`

Layout 2 colunas (lg:grid-cols-3 → 2 esquerda + 1 direita):

**Coluna Esquerda (2/3)**:
1. **Timeline vertical visual**: Steps fixos (Pendente → Em Análise → Matched → Proposta → Fechado) + eventos de `capital_timeline` com datas e descrições
2. **Checklist de documentos**: Lista de doc_types esperados (Contrato Social, Balancete, DRE, Comprovante Faturamento), status de cada um, botão upload drag-drop para Supabase Storage `financial-docs` bucket, insere em `capital_documents`
3. **Chat com analista**: Realtime via Supabase channel em `capital_messages`, input + lista de mensagens, indicador de lido
4. **Botão "Baixar relatório PDF"**: Placeholder (gera window.print() por enquanto)

**Coluna Direita (1/3)**:
1. **Resumo do pedido**: empresa, valor, tipo, objetivo, data
2. **Score card**: Score circular animado + label (Excelente/Bom/Moderado/Inicial)
3. **Providers matched**: Lista anônima ("Banco A", "Fundo B", "Fintech C") com score de compatibilidade em barra, status do match
4. **Próximos passos sugeridos**: Lista dinâmica baseada no status atual

#### 4c. Rota no `App.tsx`

Adicionar: `<Route path="/minhas-captacoes/:id" element={<CapitalRequestDetail />} />`

---

### Seção Técnica

| Artefato | Ação |
|---|---|
| Migração SQL | 4 trigger functions + 1 function + triggers + ordering |
| `src/pages/MyCapitalRequests.tsx` | Reescrever com cards expandidos, score, progress bar, click to detail |
| `src/pages/CapitalRequestDetail.tsx` | **Novo**: página de detalhe 2 colunas com timeline, docs, chat, matches |
| `src/components/capital/CapitalTimeline.tsx` | **Novo**: timeline vertical visual com steps + eventos |
| `src/components/capital/CapitalDocChecklist.tsx` | **Novo**: checklist de documentos com upload |
| `src/components/capital/CapitalChat.tsx` | **Novo**: chat realtime lead ↔ analista |
| `src/components/capital/CapitalScoreCard.tsx` | **Novo**: score circular animado |
| `src/App.tsx` | Adicionar rota `/minhas-captacoes/:id` |

