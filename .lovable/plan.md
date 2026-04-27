# Fase 3 — Compradores Estratégicos e Teses

Criar a base de **buyers** (compradores estratégicos) + **catálogo de teses de investimento** + **vínculo buyer↔tese**, com seed inicial para piloto ISP. Sem isso, o matching da Fase 4 não tem contraparte.

---

## ⚠️ Correções vs. prompt original

Antes de aplicar, corrijo 3 pontos que quebram em produção:

1. **`equity_brain.buyers.responsavel_id REFERENCES auth.users(id)`** — Supabase desencoraja FK direta para `auth.users` (quebra em restore/migrate). Substituo por `UUID` simples sem FK, com comentário explicando o vínculo lógico. Mesmo padrão usado no resto do schema `public` do projeto.
2. **Política `buyers_write_admin` usa `FOR ALL` autenticado** — `FOR ALL` cobre INSERT/UPDATE/DELETE/SELECT, mas como já existe `buyers_read_admins_advisors` para SELECT, isso cria duas policies SELECT permissivas (OR). Isso é correto no Postgres (permissive ORs), mas confunde. Mantenho como está — não há bug, só nota.
3. **Seed de `buyer_theses` via CTE com `CROSS JOIN`** — funciona, mas o `WHERE` global pode duplicar combinações se rodado mais de uma vez. Adiciono `ON CONFLICT (buyer_id, thesis_key) DO NOTHING` para idempotência (já existe `UNIQUE`, então só preciso do `ON CONFLICT`).

---

## 3.1 — Migration consolidada (schema + seeds estáticos)

**Arquivo novo:** `supabase/migrations/<ts>_equity_brain_buyers_theses.sql`

Conteúdo (uma migration só, mais limpo de auditar):

### A) Tabela `investment_theses` (catálogo)

```sql
CREATE TABLE IF NOT EXISTS equity_brain.investment_theses (
  thesis_key      VARCHAR(40) PRIMARY KEY,
  category        VARCHAR(30),
  display_name    VARCHAR(80),
  description     TEXT,
  required_signals TEXT[],
  boosting_signals TEXT[],
  default_pitch_template TEXT,
  active          BOOLEAN DEFAULT true
);

ALTER TABLE equity_brain.investment_theses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "theses_read_authenticated"
ON equity_brain.investment_theses FOR SELECT TO authenticated USING (true);

CREATE POLICY "theses_write_admin"
ON equity_brain.investment_theses FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));
```

Seed dos 5 thesis_keys do prompt: `consolidacao_regional`, `sucessao_familiar`, `roll_up_setor`, `aquisicao_carteira`, `ganho_margem_governanca`. Usa `ON CONFLICT (thesis_key) DO UPDATE` para permitir reexecução.

### B) Tabela `buyers`

```sql
CREATE TABLE IF NOT EXISTS equity_brain.buyers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  tipo            VARCHAR(20) NOT NULL,
  cnpj            VARCHAR(14),
  website         TEXT,
  ticket_min      NUMERIC(15,2),
  ticket_max      NUMERIC(15,2),
  porte_alvo      TEXT[],
  setores_interesse TEXT[],
  subsetores_interesse TEXT[],
  ufs_interesse   TEXT[],
  municipios_interesse TEXT[],
  sinergias_chave TEXT[],
  status          VARCHAR(20) DEFAULT 'ativo',
  ultimo_contato_em DATE,
  observacoes     TEXT,
  deals_realizados INTEGER DEFAULT 0,
  responsavel_id  UUID,  -- vínculo lógico para auth.users(id), sem FK direta
  source          VARCHAR(30) DEFAULT 'manual',
  raw_data        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyers_setores ON equity_brain.buyers USING GIN (setores_interesse);
CREATE INDEX IF NOT EXISTS idx_buyers_ufs     ON equity_brain.buyers USING GIN (ufs_interesse);
CREATE INDEX IF NOT EXISTS idx_buyers_status  ON equity_brain.buyers(status);

DROP TRIGGER IF EXISTS trg_buyers_updated_at ON equity_brain.buyers;
CREATE TRIGGER trg_buyers_updated_at
BEFORE UPDATE ON equity_brain.buyers
FOR EACH ROW EXECUTE FUNCTION equity_brain.set_updated_at();
```

RLS:
- `buyers_read_admins_advisors` (SELECT) → admin OR advisor
- `buyers_write_admin` (FOR ALL) → admin
- `buyers_service_full` (FOR ALL) → service_role

### C) Tabela `buyer_theses`

```sql
CREATE TABLE IF NOT EXISTS equity_brain.buyer_theses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id        UUID NOT NULL REFERENCES equity_brain.buyers(id) ON DELETE CASCADE,
  thesis_key      VARCHAR(40) NOT NULL REFERENCES equity_brain.investment_theses(thesis_key),
  prioridade      INTEGER DEFAULT 1,
  custom_notes    TEXT,
  custom_pitch    TEXT,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (buyer_id, thesis_key)
);

CREATE INDEX IF NOT EXISTS idx_buyer_theses_buyer ON equity_brain.buyer_theses(buyer_id);
```

RLS: leitura admin/advisor, escrita admin.

### D) Seed dos 5 buyers ISP placeholder

Insere via `INSERT ... WHERE NOT EXISTS` (não usa `ON CONFLICT` porque não há unique em `nome`, e não quero adicionar uma — o operador real pode ter buyers homônimos legítimos). Idempotência por checagem prévia de `nome`.

### E) Seed dos `buyer_theses` (vínculos)

Uso CTE conforme prompt + `ON CONFLICT (buyer_id, thesis_key) DO NOTHING` para idempotência.

---

## ✅ Verificação após apply

```sql
SELECT thesis_key, category FROM equity_brain.investment_theses ORDER BY thesis_key;
-- esperado: 5 linhas

SELECT nome, tipo, ufs_interesse, ticket_min, ticket_max
FROM equity_brain.buyers ORDER BY nome;
-- esperado: 5 buyers placeholder

SELECT b.nome, ARRAY_AGG(bt.thesis_key ORDER BY bt.prioridade) AS teses
FROM equity_brain.buyers b
LEFT JOIN equity_brain.buyer_theses bt ON bt.buyer_id = b.id
GROUP BY b.nome ORDER BY b.nome;
-- esperado: cada buyer com 2 teses, prioridade=1 na principal
```

---

## 📁 Diff resumido

```
+ supabase/migrations/<ts>_equity_brain_buyers_theses.sql   (~180 linhas)
```

Sem alterações em: schema `public`, código React, edges, `types.ts` (regenerado quando o front consumir).

---

## 🚫 Fora de escopo desta fase

- Tela `/admin/equity-brain/buyers` (esqueleto CRUD vai na Fase 8 — UX completa lá).
- Edge function de matching buyer ↔ company (Fase 4).
- Coluna `thesis_embedding VECTOR(1536)` em `buyers` (Fase 6 com pgvector).
- Substituir os 5 placeholders pelos buyers reais da Vispe — você faz via UI/SQL depois, sem nova migration.

---

## 📌 Notas operacionais

- **Buyers placeholders**: deliberadamente genéricos. Após apply, o passo natural é você (ou o BDR) editar os 5 registros via SQL ou tela admin (Fase 8) inserindo nomes reais, CNPJs e tickets corretos.
- **Não delete teses do catálogo** — desative com `UPDATE investment_theses SET active=false`. `buyer_theses` referenciam por FK.
