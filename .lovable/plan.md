
# Captable — Plano

Nova página dedicada `/captable` no app autenticado, base para futura listagem no mari.invest. Cada empresa do usuário (vinculada aos anúncios dele) gera um cap-table com sócios (RFB + edição manual) e valor por participação (último `valuation_history` ou cálculo on-the-fly).

## Schema (migração)

**`public.company_captables`** — 1 por listing
- `id`, `user_id` (FK auth.users), `listing_id` (FK listings, unique), `cnpj`, `razao_social`, `nome_fantasia`
- `valuation_amount numeric`, `valuation_source text` ('valuation_history' | 'listing_calc'), `valuation_at timestamptz`
- `total_shares numeric default 100` (representação em %), `currency text default 'BRL'`
- `available_for_sale_pct numeric default 0` (preparado para mari.invest)
- `created_at`, `updated_at`

**`public.company_partners`** — N sócios por captable
- `id`, `captable_id` (FK), `nome text`, `documento text` (CPF/CNPJ mascarado), `qualificacao text`, `pct numeric` (0–100)
- `source text` ('rfb' | 'manual'), `is_pf boolean`, `created_at`, `updated_at`

RLS: `auth.uid() = user_id` em ambas; advisor/admin via `has_role`. GRANTs padrão + service_role.

## Fluxo de dados

1. **Cadastro**: ao abrir `/captable`, lista os `listings` do usuário; botão "Adicionar ao captable" cria `company_captables` e dispara duas chamadas em paralelo:
   - `enrich-company-via-rfb` (já existe) → puxa CNPJ data
   - `national-search` type=cnpj → retorna `socios[]` (QSA BrasilAPI)
2. **Persistência sócios**: insert em `company_partners` (source='rfb'). Se QSA vazio, mostrar aviso "Sem dados na RFB — adicione manualmente".
3. **Valuation**: buscar último `valuation_history.true_value` (ou `final_value`) do `listing_id`; fallback = cálculo via `valuationCalculator.ts` usando faturamento/lucro do listing.
4. **Refresh**: botão "Atualizar RFB" reexecuta enrich; edição manual sobrescreve apenas linhas `source='manual'`.

## UI — `/captable`

Header com KPIs (nº empresas, valuation consolidado, % disponível p/ mari.invest).

Para cada captable, um `Card` em grid 2 colunas:
- **Esquerda**: dados da empresa (CNPJ, razão, valuation com badge da fonte), tabela editável de sócios (`Nome | Doc | Qualif. | % | Valor R$`), botões "Add sócio", "Atualizar RFB", "Disponibilizar no mari.invest" (placeholder/disabled).
- **Direita**: `PieChart` (recharts) com fatias por sócio, paleta Volt/Carbon, tooltip mostrando % e R$. Validação visual quando soma ≠ 100% (badge âmbar).

Componentes novos:
- `src/pages/Captable.tsx` (rota + lista)
- `src/components/captable/CaptableCard.tsx`
- `src/components/captable/PartnersTable.tsx`
- `src/components/captable/CaptablePie.tsx`
- `src/hooks/useCaptables.ts` (CRUD via supabase client)

Rota em `src/App.tsx` protegida por auth. Link na sidebar (grupo "Vender") com label "Cap-table".

## Edge function

`supabase/functions/captable-sync-rfb/index.ts`:
- Input: `captable_id`
- Valida ownership (`user_id = auth.uid()` ou advisor/admin)
- Chama `national-search` type=cnpj
- Faz upsert em `company_partners` apenas para `source='rfb'` (delete+insert), preserva linhas manuais
- Atualiza `company_captables.razao_social/nome_fantasia` se vierem da RFB
- Retorna contagem de sócios sincronizados

## Pontos preparados p/ mari.invest (sem implementar agora)

- Coluna `available_for_sale_pct` no captable
- Botão "Disponibilizar no mari.invest" desabilitado com tooltip "Em breve"
- Estrutura de partners já normalizada para virar oferta de cotas

## Fora de escopo

- Listagem pública no mari.invest
- Compliance/KYC de quem compra cotas
- Histórico de mudanças no captable (vesting, splits)
