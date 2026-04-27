# Equity Brain — Playbook de Backtest

> **Status:** playbook operacional. Executar a cada release maior da fórmula
> (`v1.0 → v1.1`, `v1.1 → v1.2`, etc.) para validar que ela teria identificado
> as oportunidades reais que a Vispe fechou no passado.

## Por que existir

A fórmula do `score_ma` é uma hipótese. Backtest é como saber se a hipótese
está certa **antes** de mudar a vida do BDR. O processo:

1. Catalogar mandatos históricos da Vispe (M&A fechados ou aconselhados).
2. Para cada um, retropopular signals que existiam à época da prospecção.
3. Calcular o score que a fórmula atual daria ao CNPJ naquele momento.
4. Verificar se ele teria entrado no top-100 (ou top-200) do ranking.

Se a fórmula identificou 4 dos 5 mandatos → 80% recall, ótimo.
Se identificou 1 → fórmula precisa de revisão.

---

## Pré-requisitos

- ≥ 5 mandatos históricos catalogados pela Vispe, com:
  - CNPJ (ou nome + UF se CNPJ não está disponível)
  - Data de prospecção (quando a empresa virou alvo)
  - Status final (mandato assinado, valuation entregue, deal fechado, perdido)
  - Tipo de tese (sucessão, consolidação, capex, premium, regulatório)
- Acesso admin ao Equity Brain.
- Versão atual da fórmula registrada em `equity_brain.score_engine_versions`.

---

## Passo a passo

### 1. Tabela de mandatos históricos

Crie uma planilha (ou tabela `equity_brain.historical_mandates` se quiser
versionar no banco) com as colunas:

| coluna | descrição |
|---|---|
| `cnpj` | CNPJ completo da empresa |
| `prospect_date` | quando virou alvo |
| `closed_date` | quando virou cliente / deal (ou null) |
| `outcome` | `won` / `valuation_delivered` / `lost` / `dropped` |
| `expected_thesis_key` | qual tese ISP/genérica deveria ter sido top |
| `notes` | breve história do deal |

### 2. Snapshot dos signals à época

Para cada CNPJ, rodar manualmente no SQL editor:

```sql
SELECT signal_key, severity, evidence_json, detected_at
FROM equity_brain.company_signals
WHERE cnpj = '<CNPJ>'
  AND detected_at <= '<prospect_date>'
ORDER BY detected_at DESC;
```

Se os signals **não existiam à época** (porque o `compute-signals` rodou
depois do mandato), você precisa **reconstruir manualmente** — usar a
estrutura societária histórica (RFB), capital social, idade etc.

### 3. Calcular o score retroativo

Use a função do Equity Brain via edge function:

```bash
curl -X POST https://eiprjgotjruiutztjavp.functions.supabase.co/calculate-scores \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{ "cnpjs": ["<CNPJ_1>", "<CNPJ_2>"], "dry_run": true }'
```

(o flag `dry_run` é uma melhoria sugerida — hoje a edge persiste em
`company_scores`. Para backtest, persistir é OK desde que você marque a
linha com `score_engine_version = '<versão_em_teste>'`.)

### 4. Avaliar o ranking

```sql
WITH ranked AS (
  SELECT cnpj, ma_score,
         row_number() OVER (ORDER BY ma_score DESC) AS rank
  FROM equity_brain.company_scores
  WHERE is_current = true
    AND score_engine_version = '<versão>'
)
SELECT m.cnpj, m.outcome, m.expected_thesis_key, r.ma_score, r.rank
FROM equity_brain.historical_mandates m
LEFT JOIN ranked r ON r.cnpj = m.cnpj
ORDER BY r.rank NULLS LAST;
```

### 5. Métricas a calcular

| métrica | fórmula | meta |
|---|---|---|
| **Recall@100** | mandates no top 100 / total de mandates | ≥ 60% |
| **Recall@200** | mandates no top 200 / total de mandates | ≥ 80% |
| **Score médio dos `won`** | avg(ma_score) onde outcome=won | ≥ 75 |
| **Score médio dos `lost`** | avg(ma_score) onde outcome=lost | ≤ score dos `won` |
| **Top-thesis acerto** | % de mandates onde best_thesis_key = expected_thesis_key | ≥ 50% |

### 6. Decidir próxima versão

- Se as métricas batem nas metas → mantém v1.x, documenta o backtest no
  campo `notes` da `score_engine_versions`.
- Se uma métrica falha → propõe v1.(x+1) com mudanças pontuais (ex:
  aumentar peso de `sucessao_provavel` em 5 pontos, baixar threshold de
  premium para 75). **Sempre uma mudança por vez** para isolar efeito.
- Roda o backtest de novo na nova versão antes de ativar em produção.

### 7. Ativar nova versão

```sql
-- Desativa a anterior
UPDATE equity_brain.score_engine_versions
   SET deactivated_at = now()
 WHERE deactivated_at IS NULL;

-- Insere a nova
INSERT INTO equity_brain.score_engine_versions
  (version, description, weights_json, thresholds_json, activated_at, notes)
VALUES
  ('v1.1', 'Aumenta peso de sucessao_provavel após backtest mostrar 4/5 mandates premium ainda saindo no top 50.',
   '{"signals": {...pesos novos...}}'::jsonb,
   '{"tier_premium_min": 75, "tier_strong_min": 60, "tier_standard_min": 0}'::jsonb,
   now(),
   'Backtest 2026-Q1: recall@100=80%, recall@200=100%, top_thesis_hit=60%');
```

Depois rodar `calculate-scores` com `{ limit: 5000 }` e ver no Board
Executivo (`/equity-brain/board`) o badge mudar para `v1.1`.

---

## Periodicidade recomendada

- Mensal: revisão das métricas semanais do Board.
- Trimestral: backtest completo com mandates novos (que viraram desde o
  último backtest).
- Anual: revisão da fórmula com possível bump v1.x → v2.0 (mudanças
  estruturais, não apenas de pesos).
