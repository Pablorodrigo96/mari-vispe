## Plano — Fase 1 Equity Brain: Camada de Dados Estruturados (1.1 → 1.4)

Esta fase cria **apenas a estrutura de tabelas, índices, RLS e seeds**. Edge functions (`sync-companies-from-cnpj`, `compute-signals`) e a view `companies_enriched` ficam para fases seguintes (estão listadas como entregáveis do bloco maior, mas os prompts 1.1–1.4 pedem só schema + seeds).

Tudo vai em **uma única migration** no schema isolado `equity_brain`, sem tocar `public`.

---

### 🔧 Correção crítica vs. prompt original

O prompt usa nas policies:
```sql
EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_partner_accountant = true)
```

Verifiquei a tabela `public.profiles`: o vínculo com auth é via **`user_id`**, não `id` (`id` é PK independente). Vou trocar por `p.user_id = auth.uid()` em todas as policies, senão nenhum contador parceiro consegue ler.

Também ajusto `'admin'`/`'advisor'` para cast `::app_role` (assinatura da função `public.has_role(uuid, app_role)`).

---

### 1.1 — `equity_brain.companies`

- DDL completa conforme especificado: identificação, classificação CNAE/natureza/porte, geografia (lat/long), tempo/situação, capital, agregados de sócios, enriquecimento estimado (faturamento/funcionarios/ebitda), vínculos com plataforma (`has_listing`, `listing_id` FK → `public.listings`), setor M&A normalizado, raw_data JSONB, timestamps.
- 9 índices conforme prompt (incluindo composto `uf+cnae` e parcial `listing_id WHERE NOT NULL`).
- Função `equity_brain.set_updated_at()` + trigger `trg_companies_updated_at`.
- RLS habilitado:
  - `companies_read_admins_advisors` (SELECT, authenticated): admin OU advisor OU partner_accountant.
  - `companies_write_service_only` (ALL, service_role).

### 1.2 — `equity_brain.company_partners`

- Tabela de sócios detalhados, FK `cnpj` → `companies(cnpj) ON DELETE CASCADE`.
- Campos: nome, cpf_cnpj, tipo (PF/PJ), qualificação, data_entrada, **idade_estimada**, **is_provavel_fundador**, raw_data.
- 3 índices: cnpj, idade_estimada, tipo.
- RLS: leitura admin/advisor/partner_accountant; escrita service_role.

### 1.3 — `equity_brain.company_signals` + `signal_catalog`

- `company_signals`: id, cnpj (FK CASCADE), signal_key, signal_value, signal_text, weight, source, confidence, expires_at, timestamps. UNIQUE `(cnpj, signal_key)`.
- 3 índices: cnpj, key, source.
- `signal_catalog`: lookup com signal_key PK, category, description, default_weight, affects_scores TEXT[].
- **Seed dos 18 signals** do prompt (estrutural, sucessao, mercado, governanca, comercial) com `ON CONFLICT (signal_key) DO UPDATE`.
- RLS:
  - `signals_read_admins_advisors` + `signals_write_service`.
  - `catalog_read_all_authenticated` (qualquer authenticated lê o catálogo — referência pública interna).

### 1.4 — `equity_brain.cnae_setor_map`

- Lookup CNAE → setor M&A canônico, com flags `is_recorrente` e `is_consolidando`.
- **Seed inicial** dos 19 CNAEs do prompt: ISP/Telecom (8), Saúde (5), Indústria (2), Tecnologia/SaaS (3) com `ON CONFLICT DO UPDATE`. Estrutura permite expansão futura.
- Índice em `setor_ma`.
- RLS: `cnae_map_read_all` (todos os authenticated).

---

### 📋 Verificações ao final

A migration roda atomicamente. Após apply, valido com:

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema='equity_brain' ORDER BY 1;
-- esperado: cnae_setor_map, companies, company_partners, company_signals, signal_catalog

SELECT COUNT(*) FROM equity_brain.signal_catalog;        -- 18
SELECT setor_ma, COUNT(*) FROM equity_brain.cnae_setor_map GROUP BY setor_ma;
-- isp_telecom: 8, saude: 5, industria: 2, tecnologia: 3
```

---

### 🚫 O que NÃO faço aqui

- **Sem alterar `public`**: nenhuma alteração em `listings`, `profiles`, `user_roles` etc. A FK `companies.listing_id → public.listings(id)` é a única referência cruzada (somente leitura/SET NULL).
- **Sem edge functions** (`sync-companies-from-cnpj`, `compute-signals`) — entram em fase posterior.
- **Sem view `companies_enriched`** — depende de signals já populados; entra junto com a edge `compute-signals`.
- **Sem rotas React** `/equity-brain/*` — fase de UI.
- **Sem alterar `supabase/config.toml`**.

---

### 📁 Diff resumido

```
+ supabase/migrations/<timestamp>_equity_brain_phase1_data_layer.sql   (novo, ~250 linhas)
```

Próxima fase (após esta aprovada): edge function `sync-companies-from-cnpj` puxando do `EXTERNAL_DB_URL` em batch + `compute-signals` derivando os 18 sinais do catálogo.