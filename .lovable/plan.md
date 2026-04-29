## Problema

O card **"Empresas no banco"** no Dashboard do Equity Brain (`/equity-brain`) mostra **0**, mas a tabela `eb_companies` tem **86 empresas ativas** (e 116 no total).

## Causa raiz

`src/pages/equity-brain/DashboardPage.tsx` linha 53 filtra:

```ts
.eq("situacao_cadastral", "Ativa")
```

Mas no banco os valores estão em caixa-alta (`"ATIVA"`) ou `NULL`. Nenhuma linha bate com `"Ativa"` exato → conta retorna 0.

## Correção

Trocar `.eq` por `.ilike` (case-insensitive) na linha 53:

```ts
const companiesQ = supabase
  .from("eb_companies" as any)
  .select("cnpj", { count: "exact", head: true })
  .ilike("situacao_cadastral", "ativa");
```

Mudança de 1 linha. Resultado esperado: card passa de **0 → 86**.

Resiliente a variações futuras (`Ativa`, `ATIVA`, `ativa`) vindas do sync de CNPJ.
