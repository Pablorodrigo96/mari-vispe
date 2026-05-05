## Diagnóstico

A conexão com a base nacional da Receita Federal (`EXTERNAL_DB_URL`) está **quebrada**. Os logs do edge function `national-search` mostram, em todas as chamadas recentes:

```
PostgresError: password authentication failed for user "postgres"
code: 28P01  severity: FATAL
```

Isso afeta TODAS as buscas RFB (por nome, por setor e por CNPJ). Por isso, ao procurar "Vivo", "Claro", "TIM", "Algar", etc. você só vê empresas do CRM da Vispe — o painel `Base Nacional de Empresas` está retornando vazio (ou caindo em erro silencioso) e a UI mostra apenas resultados locais.

### Causa
O secret `EXTERNAL_DB_URL` (configurado em Lovable Cloud) tem senha inválida ou expirada. Provavelmente:
- senha do usuário `postgres` na base externa foi rotacionada;
- ou a string de conexão foi truncada/escapada incorretamente quando salva.

A base em si não muda — é a base mensal da RFB que vocês já usam — só a credencial precisa ser atualizada.

## O que vou fazer

### 1) Atualizar o secret `EXTERNAL_DB_URL`
Vou pedir a string de conexão atualizada via `add_secret`. Formato esperado:
```
postgresql://USER:SENHA@HOST:5432/DB?sslmode=require
```
Após salvar, os edge functions `national-search`, `cnpj-db-inspect` e `enrich-company-via-rfb` voltam a funcionar automaticamente — não há deploy necessário.

### 2) Validar com 3 testes
- `cnpj-db-inspect` (audit do schema) — confirma conexão básica.
- `national-search` type=`cnpj` com CNPJ da Vivo (`02.558.157/0001-62`) — confirma JOIN empresas+estabelecimentos.
- `national-search` type=`search` com `query="VIVO"` e `state="SP"` — confirma busca por nome.

### 3) Hardening: fallback BrasilAPI para busca por nome (opcional, mas recomendo)
Hoje o fallback BrasilAPI só roda em `type=cnpj`. Quando a base externa cai, busca por nome devolve lista vazia silenciosamente — exatamente o sintoma reportado. Vou adicionar:
- detectar erro de conexão Postgres em `type=search` e `type=sector`;
- retornar `{ companies: [], degraded: true, reason: "rfb_db_unavailable" }` em vez de 500;
- mostrar banner discreto no `NationalSearchPanel`: "Base RFB temporariamente indisponível — tente buscar pelo CNPJ direto" (CNPJ direto cairia no BrasilAPI).

Isso garante que, mesmo se a senha cair de novo no futuro, o usuário entende o que está acontecendo em vez de achar que a busca não tem dados.

## Arquivos afetados
- Secret: `EXTERNAL_DB_URL` (atualização — sem código).
- `supabase/functions/national-search/index.ts` — try/catch granular + flag `degraded`.
- `src/components/matching/NationalSearchPanel.tsx` — banner de degradação.

## O que NÃO muda
- Schema do banco, lógica de mapeamento CNAE→categoria, cache `cnpj_cache`, RLS, planos pagos — tudo intacto.
- Nada relacionado a valuation, listings ou wizard de venda.

## O que preciso de você
Para o passo 1, vou abrir o diálogo `add_secret` pedindo a nova string `EXTERNAL_DB_URL`. Você cola a connection string atualizada (com a senha correta) e eu prossigo com testes + hardening.