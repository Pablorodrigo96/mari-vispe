## Stories automáticos por empresa (estilo Instagram)

Cada token/empresa do feed terá um conjunto de **5 stories auto-gerados** com fotos personalizadas por IA + overlays de teaser, refrescados a cada 24h. Convive com os stories manuais (fundador) — manual sempre tem prioridade.

### 1. Banco de dados

Reusa a tabela `company_stories` já criada na Fase 4, com 3 colunas novas:

```sql
ALTER TABLE company_stories
  ADD COLUMN source text NOT NULL DEFAULT 'manual',   -- 'manual' | 'auto'
  ADD COLUMN slide_index int,                          -- 0..4 nos auto
  ADD COLUMN overlay jsonb;                            -- {kpi_label, kpi_value, delta, headline, sub}
```

Índice parcial pra deduplicar `(token_id, slide_index)` quando `source='auto'`.

### 2. Geração de imagens (IA, 1× por empresa)

Edge function `generate-company-stories`:
- Recebe `token_id`, busca `tokens` + `listings` (categoria, cidade, descrição, receita, ticket, captado, meta).
- Compõe 5 prompts narrativos baseados no setor:
  1. **Quem somos** — fachada/ambiente
  2. **O que fazemos** — produto/operação
  3. **Tração** — time/cliente
  4. **Rodada aberta** — bastidor/crescimento
  5. **Próximo passo** — visão/futuro
- Chama `openai/gpt-image-2` no AI Gateway (quality `low`, 1024×1792 vertical), salva PNG em `company-stories/auto/{token_id}/{slide}.png`.
- Insere 5 rows em `company_stories` com `source='auto'`, `slide_index`, `overlay` (JSON do card), `expires_at = now() + 24h`.
- Cron diário `04:00 BRT` (pg_cron + http) chama a função pra cada token ativo com stories expirados.
- Idempotente: se já existe `source='auto'` válido pro token, pula. Botão admin "Regenerar" força refresh.

### 3. Overlay narrativo (5 slides)

Cada `overlay` JSON segue o mesmo schema renderizado pelo `StoryViewer`:

| Slide | KPI chip | Headline | Sub |
|---|---|---|---|
| 1 | `CIDADE` · São Paulo | **Padaria São José** | Fundada em 2018 por Mariana Lopes |
| 2 | `SETOR` · Alimentação | Pães artesanais e cafeteria | 3 unidades, 4.2★ Google |
| 3 | `RECEITA` · R$ 310k/mês | Crescimento **+41%** YoY | Margem EBITDA 22% |
| 4 | `RODADA` · R$ 180k / R$ 500k | **36% captado** em 12 dias | Ticket mínimo R$ 50 |
| 5 | `META` · Abrir 2ª filial | Aporte vai pra expansão | Conhecer e investir agora |

Valores derivam de `listings.annual_revenue/12`, `tokens.amount_raised/total_offering_amount`, `tokens.min_ticket`. Se faltar dado, slide cai pra texto genérico do setor (não some).

### 4. StoryViewer atualizado

Já renderiza imagem + chip + headline + sub + CTA. Mudanças:

- **CTA dupla** quando `source='auto'`:
  - `[ Conhecer {company_name} ]` → `/investir/empresa/:symbol`
  - `[ ⚡ Investir R$ 50 ]` (variante Volt) → `/investir/empresa/:symbol?reservar=50` (PerfilEmpresa abre modal de reserva já com `min_ticket` pré-preenchido em 50)
- Card chip estilo da referência: pílula escura translúcida, label em caixa-alta + valor grande + delta verde inline.
- Progress bar superior com 5 segmentos avança automaticamente (5s/slide, ou tap pra próximo).
- Tap no avatar → perfil da empresa. Swipe-down/X fecha.

### 5. StoriesBar

- Empresas com pelo menos 1 story ativo (manual OU auto) ganham anel gradient.
- Manual ativo → badge "AO VIVO" + pulse. Só auto → sem badge, anel gradient padrão.
- Ordem: manual primeiro, depois auto ordenado por `tokens.amount_raised` desc.

### 6. Fluxo "Investir R$ 50"

Em `PerfilEmpresa.tsx`, ler `?reservar=50` no mount:
- Se logado → abre `ReservaDrawer` (já existe na página) com valor pré-preenchido = `max(50, min_ticket)`.
- Se não logado → redireciona `/auth?next=/investir/empresa/:symbol?reservar=50`.
- Reserva grava em `primary_reservations` (já em uso por `InvestirReservas`).

### 7. Storage & RLS

- Bucket `company-stories` já existe (público). Pasta `auto/` reusa as policies atuais.
- Inserts da função usam `service_role`. Leitura pública pra qualquer story não expirado.

### 8. Seed inicial

Migration roda `select generate-company-stories` pros ~12 tokens existentes via `pg_net` — todos ficam com stories no primeiro deploy sem esperar o cron.

### 9. QA

- Playwright headless em `/investir`: confirma anéis gradient, abre 1 story, valida 5 slides e os 2 CTAs.
- Screenshot dos 5 slides de 1 empresa pra revisão visual antes de fechar.

### Arquivos

**Novos**
- `supabase/migrations/<ts>_company_stories_auto.sql` (colunas + index + cron)
- `supabase/functions/generate-company-stories/index.ts`
- `src/components/investir/social/StoryAutoOverlay.tsx` (card pílula)

**Editados**
- `src/types/social.ts` (campos source/slide_index/overlay)
- `src/components/investir/social/StoryViewer.tsx` (dupla CTA + overlay)
- `src/components/investir/social/StoriesBar.tsx` (mesclar manual+auto)
- `src/pages/investir/FeedHome.tsx` (query incluindo auto)
- `src/pages/investir/PerfilEmpresa.tsx` (handler `?reservar=50`)

Custo estimado: ~5 imagens × 12 empresas = 60 gerações iniciais (low quality, ~$0.02 cada ≈ $1.20 one-shot); refresh diário só roda se admin acionar regenerate, não automático, pra evitar gasto recorrente.
