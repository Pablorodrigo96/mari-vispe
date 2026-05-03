## Onda E — Ativar BuyerDetailPage + Fix das Views

Três mudanças encadeadas, custo zero de IA. Validação final no Algar Telecom.

---

### Job 1 — Substituir drawer por navegação (BuyersPage → BuyerDetailPage)

Arquivo: `src/pages/equity-brain/BuyersPage.tsx`

- Remover `<Sheet>...<BuyerCard /></Sheet>` (linhas ~174-178), `useState drawerId` e import de `Sheet`/`SheetContent`/`BuyerCard`.
- Trocar o handler de clique nas linhas da tabela por `onClick={() => navigate('/equity-brain/crm/buyer/' + b.id)}` (adicionar `useNavigate` de `react-router-dom`).
- Confirmar rota `/equity-brain/crm/buyer/:id` em `App.tsx` (já existe, apontando para `BuyerDetailPage`).
- Adicionar botão "← Voltar para listagem" no topo do header de `BuyerDetailPage.tsx` (já tem link "Voltar ao CRM"; trocar/duplicar para `navigate('/equity-brain/compradores')`).
- `BuyerCard.tsx`: **não deletar**. Adicionar comentário no topo: `// DEPRECATED 2026-05-03 — substituído por navigate to /equity-brain/crm/buyer/:id` (única referência hoje é a própria BuyersPage).

---

### Job 2 — Popular 11 thesis_keys órfãs (migration SQL)

Confirmado via `equity_brain.matches`: **11 keys órfãs, ~155k matches afetados**:

| key | matches |
|---|---|
| generic | 97.536 |
| pe_platform_buy_and_build | 18.391 |
| b2b_services_consolidator | 7.153 |
| consolidator_national_aggressive | 6.319 |
| family_office_direct | 5.932 |
| infra_fund_buy_and_hold | 5.201 |
| health_strategic_vertical | 4.787 |
| consolidator_regional_strict | 4.762 |
| education_premium_medical | 4.244 |
| serial_acquirer_saas_vertical | 992 |
| integrated_telco | 372 |

Migration `seed_orphan_thesis_keys.sql`:

```sql
INSERT INTO equity_brain.investment_theses
  (thesis_key, display_name, description, category, active)
VALUES
  ('generic','Tese Genérica','Match gerado sem tese específica identificada','generic',true),
  ('pe_platform_buy_and_build','PE Plataforma Buy-and-Build','Fundo de PE construindo plataforma via aquisições incrementais','plataforma_pe',true),
  ('b2b_services_consolidator','Consolidador de Serviços B2B','Player consolidando serviços B2B em vertical fragmentado','consolidacao',true),
  ('consolidator_national_aggressive','Consolidador Nacional Agressivo','Rollup nacional via aquisições rápidas em vertical fragmentado','consolidacao',true),
  ('family_office_direct','Family Office Direto','Family office investindo direto em controle/minoria relevante','family_office',true),
  ('infra_fund_buy_and_hold','Infra Fund Buy-and-Hold','Fundo de infra com horizonte longo e ativo regulado','infra',true),
  ('health_strategic_vertical','Estratégico Saúde Vertical','Estratégico de saúde expandindo verticalmente','setorial_saude',true),
  ('consolidator_regional_strict','Consolidador Regional Restrito','Consolidador focado em região específica','consolidacao',true),
  ('education_premium_medical','Educação Premium / Medicina','Player de educação premium, foco medicina','setorial_educacao',true),
  ('serial_acquirer_saas_vertical','Serial Acquirer SaaS Vertical','Acquirer recorrente de SaaS verticalizado','plataforma_pe',true),
  ('integrated_telco','Telco Integrada','Operadora integrada buscando expansão de footprint','setorial_telco',true)
ON CONFLICT (thesis_key) DO NOTHING;
```

(Colunas confirmadas: `thesis_key, category, display_name, description, required_signals, boosting_signals, default_pitch_template, active`. Sem coluna `prioridade` — removida da spec.)

---

### Job 3 — Fix view `equity_brain.matches_enriched`

Definição atual confirmada — único bug é o `JOIN equity_brain.investment_theses t`. Migration `fix_matches_enriched_join.sql`:

```sql
CREATE OR REPLACE VIEW equity_brain.matches_enriched AS
SELECT
  m.id, m.match_score, m.status, m.prioridade, m.assigned_bdr,
  m.computed_at, m.reasons, m.ai_thesis_summary, m.ai_pitch,
  m.thesis_key, m.setor_fit, m.geografia_fit, m.porte_fit, m.tese_fit, m.ma_score_emp,
  c.cnpj, c.razao_social, c.nome_fantasia, c.uf, c.municipio,
  c.setor_ma, c.subsetor_ma, c.cnae_principal, c.cnae_descricao,
  c.data_abertura, c.capital_social, c.porte, c.qtd_socios, c.has_listing,
  cs.ma_score, cs.vispe_score, cs.sucessao_score,
  b.id AS buyer_id, b.nome AS buyer_nome, b.tipo AS buyer_tipo,
  b.ticket_min, b.ticket_max, b.setores_interesse,
  COALESCE(t.display_name, m.thesis_key) AS thesis_name,
  t.category AS thesis_category,
  t.description AS thesis_description
FROM equity_brain.matches m
JOIN equity_brain.companies c ON c.cnpj::text = m.cnpj::text
JOIN equity_brain.buyers b ON b.id = m.buyer_id
LEFT JOIN equity_brain.investment_theses t ON t.thesis_key::text = m.thesis_key::text
LEFT JOIN equity_brain.company_scores cs ON cs.cnpj::text = m.cnpj::text AND cs.is_current = true
WHERE m.is_current = true;
```

Mudança: `JOIN investment_theses` → `LEFT JOIN`, `thesis_name` com `COALESCE` para nunca ser NULL. Espelho `public.eb_matches_enriched` (se existir como wrapper) será atualizado se necessário durante a execução.

---

### Job 4 — Validação Algar Telecom (`0223c4e9-a46b-415d-9299-46540923ee03`)

Após aplicar 1+2+3:

- SELECT `COUNT(*) FROM eb_matches_enriched WHERE buyer_id = '<algar>'` → esperado ~254
- COUNT com `ma_score IS NOT NULL` (proxy SAV) → esperado ~24
- Abrir `/equity-brain/crm/buyer/<algar>` no preview, confirmar tabs Visão geral / Tese / Track / Matches / Notícias / WhatsApp / Documentos renderizam sem erro.
- Repetir com 1 buyer aleatório `tipo != estrategico`.

---

### Ordem & Custo
Job 2 → Job 3 → Job 1 → Job 4. Custo IA: R$ 0.

### Não fazer
Não deletar `BuyerCard.tsx`. Não refatorar motor de match. Não criar tabela/coluna nova. Não mexer em outras views.
