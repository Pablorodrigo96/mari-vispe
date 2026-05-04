
# FASE 4 — Fechar o loop `/mari` → cadastro → primeiro anúncio

## Por quê
Hoje a Calculadora Pública (Fase 3) gera um lead e joga em `/auth?...&cnpj=XXX`, mas o CNPJ é só hint na URL — some no signup. O usuário chega no Painel "vazio" e tem que digitar tudo de novo no Sell Wizard. Fase 4 conecta os pontos: o CNPJ do `/mari` vira **rascunho de anúncio pré-preenchido** assim que ele cadastra.

## Princípio
- Sem nova tabela. Usa `sessionStorage` (ou query param) pra carregar o CNPJ + dados do `company-lookup` do `/mari` direto no Sell Wizard.
- Auth não muda schema. Só lê `?cnpj=` e guarda no `sessionStorage`.
- Sell Wizard ganha hidratação inicial: se houver `mari_prefill` no storage, prefilla `cnpj`, `companyName` (→ title), `state`, `city` (do CNAE/UF retornado), e abre direto no Step 1 já preenchido.
- Banner discreto no topo do wizard: "Continuando do cálculo da Mari • [limpar]".

## Fluxo
```text
/mari → calcula → CTA "Cadastrar minha empresa"
   ↓ salva sessionStorage.mari_prefill = { cnpj, razao, uf, cidade, cnae, porte, windowResult }
/auth?tab=signup&role=seller&redirect=/sell&cnpj=XXX
   ↓ signup completa
/sell → SellWizard detecta mari_prefill → hidrata form → mostra banner
   ↓ usuário só revisa/completa faturamento etc
publica anúncio
```

## Arquivos

### Criar
- `src/lib/mariPrefill.ts` — `setMariPrefill(data)`, `getMariPrefill()`, `clearMariPrefill()` usando `sessionStorage` com TTL 30min.

### Editar
- `src/components/mari-calc/MariResult.tsx` — antes de redirecionar pro `/auth`, chamar `setMariPrefill({ cnpj, razao, uf, cidade, cnaeSection, porte, windowResult })`.
- `src/pages/Auth.tsx` — após signup bem-sucedido com role=seller, se `mari_prefill` existir → forçar redirect para `/sell` (em vez do `ROLE_HOME.seller = /meus-anuncios`).
- `src/components/sell/wizard/NewListingWizard.tsx` (ou equivalente em `src/pages/Sell.tsx`) — no mount, ler `getMariPrefill()`; se existir, mesclar com `initialFormData` (campos: `cnpj`, `title` ← razão social, `state`, `city`, `category` ← derivado do CNAE) e renderizar um banner pequeno no topo: `"Continuando do cálculo da Mari · Limpar"`.
- `src/lib/mariWindowHeuristic.ts` (opcional, só se não bater) — exportar mapeamento `cnaeSection → category` pra reuso.

### Não tocar
- Schema do banco (zero migrations).
- `/valuation`, Equity Brain, Cockpit (Fase 2).
- `company-lookup` edge function.

## Detalhes técnicos
- TTL 30min evita prefill velho de sessão antiga.
- Se usuário já estiver logado quando clicar no CTA da Mari (caso raro), pular `/auth` e ir direto pra `/sell` com o prefill.
- Limpar `mari_prefill` ao publicar anúncio (sucesso) ou clicar "Limpar" no banner.
- Mapping CNAE→category usa as 12 categorias do projeto (via memória `business-categories`); fallback pra `'Outros'` se sem match.

## Critério de pronto
- Usuário entra em `/mari`, calcula, clica "Cadastrar minha empresa".
- Faz signup como seller.
- É redirecionado para `/sell` (não `/meus-anuncios`).
- Wizard abre com CNPJ, título sugerido, UF e cidade já preenchidos + banner "Continuando do cálculo da Mari".
- Botão "Limpar" no banner reseta o prefill.
- Logado direto no `/mari` → CTA pula `/auth` e vai pra `/sell` prefillado.
- Zero migrations, zero edge functions novas.
