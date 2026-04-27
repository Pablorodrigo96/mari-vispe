-- Adiciona colunas para catálogo multi-vertical de buyers
ALTER TABLE equity_brain.buyers
  ADD COLUMN IF NOT EXISTS prioridade_global smallint
    CHECK (prioridade_global BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS vertical_principal varchar(40),
  ADD COLUMN IF NOT EXISTS cautela_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cautela_motivo text;

-- Índice composto para queries do ranking
CREATE INDEX IF NOT EXISTS idx_buyers_priority_vertical
  ON equity_brain.buyers (prioridade_global ASC NULLS LAST, vertical_principal);

CREATE INDEX IF NOT EXISTS idx_buyers_vertical
  ON equity_brain.buyers (vertical_principal)
  WHERE vertical_principal IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN equity_brain.buyers.prioridade_global IS
  'Prioridade global do buyer no motor: 1=P1 altamente acionável, 2=P2 relevante com fit específico, 3=P3 estratégico/seletivo, 4=P4 capital partner/fundo';
COMMENT ON COLUMN equity_brain.buyers.vertical_principal IS
  'Vertical principal: telecom, saude, saas, educacao, servicos_b2b, agro, infra_digital, varejo, industria, energia, multi';
COMMENT ON COLUMN equity_brain.buyers.cautela_flag IS
  'true se o buyer está em integração, desalavancagem ou pausa de M&A (penaliza ranking)';
COMMENT ON COLUMN equity_brain.buyers.cautela_motivo IS
  'Texto curto explicando por que o buyer está em cautela (ex: "Em integração pós-fusão Hapvida+GNDI")';