## Objetivo
Conectar o banco RFB com a senha nova e deixar o pipeline RFB 100% funcional.

## Passos

1. **Atualizar secret `EXTERNAL_DB_URL`**
   - Vou abrir o prompt seguro do `add_secret` para você colar a connection string completa.
   - Formato recomendado (pooler em session mode, ideal para edge functions):
     ```
     postgresql://postgres.<PROJREF>:<SENHA>@aws-0-<REGIAO>.pooler.supabase.com:6543/postgres?sslmode=require
     ```
   - Se preferir conexão direta IPv6 (porta 5432) também funciona — qualquer das duas é aceita.

2. **Validar conexão**
   - Rodar `cnpj-db-inspect` em produção e confirmar `connected: true` + listagem de tabelas/colunas RFB.

3. **Smoke test do pipeline**
   - `expand-companies-from-rfb` com `target=companies, uf=SP, limit=5` → confirmar inserts em `equity_brain.companies` com `source='rfb_expand'`.
   - `expand-companies-from-rfb` com `target=buyers, mandate_id=65bcf85a-... , limit=5` → confirmar inserts em `equity_brain.buyers`.
   - `process-match-queue` → confirmar consumo da fila e geração de matches.

4. **Plugar UI restante**
   - Adicionar `EnrichCompanyButton` no header de `CompanyDetailPage` (visível quando há CNPJ).
   - Adicionar botão "Importar compradores RFB" no header de `MandateDetailPage` ao lado de "Mostrar no grafo 3D".

5. **Hardening do `RfbHubPage`**
   - Mensagem amigável quando `connected=false`.
   - Corrigir cálculo de contagens da fila.

6. **Confirmação final**
   - Hub mostrando contagens reais > 0, mandato atual com matches gerados a partir de buyers RFB.

Após sua aprovação, saio do modo plano, atualizo o secret e executo os smoke tests + ajustes de UI no mesmo passe.