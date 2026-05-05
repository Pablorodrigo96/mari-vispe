
## Problema

Na barra "Busca CNPJ" do Equity Brain (header em `EquityBrainLayout.tsx`), digitar um CNPJ válido que ainda não está em `equity_brain.companies` cai na tela "Empresa não encontrada na base do Equity Brain" (`DealCard.tsx` / `DealDetailPage.tsx`). Hoje o `useCompanyResolver` só consulta `equity_brain.companies`, `listings` e ticker — não usa a Receita Federal que acabamos de habilitar via pooler IPv4 (`national-search`).

Na prática, qualquer CNPJ "frio" (ex.: `08.170.849/0001-15`) não cadastrado vira beco sem saída, mesmo com a base RFB funcionando.

## Solução

Quando o resolver não achar a empresa em `equity_brain.companies`, chamar a edge function existente `enrich-company-via-rfb` (admin/advisor), que já:
1. Faz lookup na RFB via `national-search` (IPv4 pooler já configurado)
2. Faz `upsert` em `equity_brain.companies` (`onConflict: cnpj`) com razão social, CNAE, UF, município, capital, porte, situação etc.

Após o enrich, o `DealCard` re-buscar `eb_companies_enriched` e renderizar normalmente como ativo "cold" (sem score/match ainda, mas com razão social, endereço, setor visíveis).

## Mudanças

### 1. `src/hooks/useCompanyResolver.ts`
No passo (1) "Plain digits CNPJ", quando `eb.companies` retornar vazio:
- Invocar `supabase.functions.invoke("enrich-company-via-rfb", { body: { cnpj } })`
- Em sucesso, re-consultar `eb.companies` e devolver com `source: "cnpj"`
- Em falha (RFB não retornou ou usuário sem permissão), manter retorno atual `{ cnpj, source: "cnpj" }` (DealCard segue mostrando "não encontrada")

Gate: rodar enrich apenas para usuários admin/advisor (mesma regra da edge function — evita 403 ruidoso). Usar `useUserRoles` indiretamente via parâmetro/checagem rápida em `user_roles`.

### 2. `src/components/equity-brain/DealCard.tsx`
Quando `!company && !scored && !opp` mas o resolver disse `source === "cnpj"`, mostrar um estado intermediário "Buscando na Receita Federal…" com spinner e auto-refetch (`qc.invalidateQueries(["eb","company",cnpj])`) após 1.5s, ao invés do erro imediato.

Adicionar botão "Tentar enriquecer via RFB" no estado vazio para retry manual (chamando `enrich-company-via-rfb` direto).

### 3. (Opcional) `DealDetailPage.tsx`
Mensagem de empty state passa a sugerir "Esta empresa ainda não está na base. Tentando carregar da Receita Federal…" enquanto o enrich roda.

## Validação

1. Logar como admin, ir em `/equity-brain/hoje`, digitar `08170849000115` na busca CNPJ
2. Esperado: navega para `/equity-brain/empresa/08170849000115`, mostra spinner ~1-2s, depois renderiza razão social/UF/setor da Receita
3. Conferir em `equity_brain.companies` que a row foi criada (`raw_data` populado, `last_enriched_at` recente)
4. Buscar de novo o mesmo CNPJ — agora vem instantâneo do cache local
5. Para CNPJ inexistente na RFB: continua caindo no empty state com candidatos fuzzy

## Detalhes técnicos

- `enrich-company-via-rfb` já valida admin/advisor; chamar do client com sessão autenticada propaga JWT.
- Não mexer em `national-search`, `EXTERNAL_DB_PASSWORD`, `RFB_HOST` — já estão funcionando com pooler IPv4.
- `useCompanyResolver` continua síncrono do ponto de vista do React Query; o enrich é só um `await` extra dentro do `queryFn` quando necessário, com `staleTime: 5 min` mantido.
- Sem migrations: a tabela `equity_brain.companies` já existe e o upsert é feito pela edge function com service role.
