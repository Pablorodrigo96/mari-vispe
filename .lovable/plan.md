## Objetivo

Conectar o edge function `cnpj-lookup` ao seu banco Supabase externo (que tem milhões de CNPJs) em vez de usar a API pública da Receita Federal.

## Etapas

### 1. Pedir o secret de forma segura
Vou disparar o formulário `add_secret` para `EXTERNAL_DB_URL`. Você cola a connection string do Supabase (Transaction pooler, porta 6543, com a senha já substituída) — o valor é criptografado e nunca aparece no código.

### 2. Dry-run de inspeção do schema
Crio um edge function temporário `cnpj-db-inspect` que conecta no seu banco e roda:
- Lista tabelas em `public` (descobrir nome real: `estabelecimentos`, `cnpj_dados`, etc.)
- Para cada tabela candidata, lista colunas
- Roda `SELECT COUNT(*)` para confirmar volume

Te mostro o resultado para confirmarmos os nomes antes de mexer no `cnpj-lookup`.

### 3. Teste com 1 CNPJ real
Você me passa 1 CNPJ que sabidamente existe no seu banco. Eu busco e te mostro o JSON retornado para validarmos os campos disponíveis (razão social, nome fantasia, endereço, CNAE, sócios, etc.).

### 4. Refatorar o `cnpj-lookup`
Atualizo o edge function existente para:
- Conectar via `EXTERNAL_DB_URL` usando driver `postgres` do Deno
- Fazer `SELECT` parametrizado por CNPJ (com índice — pergunto se tem)
- Retornar no mesmo formato JSON que o frontend já consome (sem quebrar telas)
- Manter fallback para a API pública se o CNPJ não existir no seu banco

### 5. Teste end-to-end
Testo no fluxo de:
- Cadastro de listing (Sell Wizard)
- Cadastro de captação (Capital Request)
- Confirmo logs limpos e sem erros

## Detalhes técnicos

- Driver: `https://deno.land/x/postgres@v0.17.0/mod.ts` (compatível com edge functions Supabase)
- Pool: 1 conexão por invocação (edge functions são stateless)
- Query parametrizada: `WHERE cnpj = $1` — nunca string concatenation
- Timeout: 5s para não travar o frontend
- Cache: mantém os 7 dias atuais no `localStorage` do cliente