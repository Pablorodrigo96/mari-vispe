## O que vamos resolver

Hoje, ao clicar num match, três coisas estão quebradas:
1. **Não existe uma página do match** — só um drawer lateral. Sem URL, sem ID, sem como compartilhar.
2. **A "ficha da empresa" abre vazia** — a rota `/equity-brain/empresa/:cnpj` exige CNPJ, mas o link às vezes envia o **codename** (ex.: `VL60b55c58449f`) ou um `listing_id`. O `DealCard` não encontra nada e mostra "empresa não encontrada".
3. **Botões da ficha são fake** — WhatsApp, Email e Salvar do `DealCard` não usam os contatos reais (estão sem handler).

## O que vamos entregar

### 1. Página dedicada do match: `/equity-brain/match/:matchId`

Cada linha do Match Inbox vira uma página própria com URL fixa que pode ser compartilhada/colada no CRM.

```text
┌────────────────────────────────────────────────────────────┐
│ #MATCH-3f2a · Score 78 🔥 · Quente                         │
│ MARI-VAR-0042 (vendedor) ──► Patria Equity (comprador)     │
├──────────────────────┬─────────────────────────────────────┤
│ VENDEDOR (ficha)     │ COMPRADOR (ficha)                   │
│ • Razão / Codename   │ • Nome / Tipo                       │
│ • Setor · UF · Fat.  │ • Ticket · Setores · UFs            │
│ • Botão "Abrir 360"  │ • Botão "Abrir 360"                 │
│ • WhatsApp / Tel /   │ • WhatsApp / Tel / Email REAIS      │
│   Email REAIS        │                                     │
├──────────────────────┴─────────────────────────────────────┤
│ Por que esse match: barras Setor/Geo/Porte/Tese + thesis   │
│ Próximos passos sugeridos (Mari Brain)                     │
│ Histórico de contato (eb_call_feedback do CNPJ)            │
│ Ações: [Iniciar mandato] [Solicitar abertura] [Snooze]     │
└────────────────────────────────────────────────────────────┘
```

- Usa o mesmo conteúdo do `MatchDetailDrawer` mas em modo página.
- Inclui o histórico de contato do vendedor (mesma query usada no `DealCard`: `eb_call_feedback`).
- Linka direto para mandato (se existir) ou abre `QuickStartMandateDialog` se ainda não existir.
- Linka para `/equity-brain/empresa/:cnpj` e `/equity-brain/crm/buyer/:id` agora **funcionando**.

### 2. Resolver corretamente a rota da ficha

Trocar a rota `empresa/:cnpj` por `empresa/:idOrCode` que aceita 3 formatos e resolve no carregamento:

| Formato detectado     | Como tratar                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| 14 dígitos            | `cnpj` direto                                                           |
| começa com `MARI-...` | buscar `equity_brain.companies` por `codename`                          |
| UUID                  | tentar `equity_brain.companies.listing_id` → cair em `public.listings`  |
| outros (ex.: `VL60…`) | buscar `public.listings.ticker` → pegar o `cnpj` do listing             |

A página `DealDetailPage` ganha um hook `useCompanyResolver(idOrCode)` que devolve `{ cnpj, razao_social, codename }` ou redireciona para 404 com mensagem amigável. Todos os links espalhados (`MatchInboxRow`, `MatchHotHero`, `MatchDetailDrawer`, `DealCard`, `EquityBrainLayout`) passam a usar `cnpj` quando existe e `codename` como fallback — nunca mais `undefined`.

### 3. Handlers reais nos botões da ficha (`DealCard`)

- Buscar contatos via `useMatchContacts(cnpj)` (já existe — só usar o lado `seller`).
- **WhatsApp**: `getWhatsAppLink(template, contacts.seller.telefone_e164)` com mensagem pré-preenchida ("Olá {nome}! Falo da mari sobre...").
- **Email**: `mailto:${contacts.seller.email}?subject=...&body=...`
- **Salvar**: persiste em `eb_saved_companies` (tabela nova, simples: `user_id, cnpj, created_at, note`) com toast "Salvo na sua lista".
- Estado desabilitado quando não há contato + botão "Adicionar contato" abrindo o `AddContactDialog` existente.
- Ligar continua abrindo o `QuickCallModal`.

### 4. Linkagem da inbox para a nova página

- Botão `Info` (ℹ) na linha → leva para `/equity-brain/match/:matchId` (em vez de só abrir o drawer).
- Drawer mantém-se para preview rápido + ganha um link "Ver página completa do match".

## Arquivos

**Novos**
- `src/pages/equity-brain/MatchDetailPage.tsx` — página `/equity-brain/match/:matchId`
- `src/hooks/useMatchById.ts` — busca 1 match em `equity_brain.matches` + enriquece como o inbox
- `src/hooks/useCompanyResolver.ts` — resolve `idOrCode` → CNPJ canônico
- `src/hooks/useSavedCompanies.ts` — toggle salvar/remover
- `supabase/migrations/<ts>_eb_saved_companies.sql` — tabela + RLS (advisor/admin own rows)

**Editados**
- `src/App.tsx` — rota `match/:matchId` + manter `empresa/:idOrCode` (renomeia o param)
- `src/pages/equity-brain/DealDetailPage.tsx` — usa `useCompanyResolver`, mostra estados loading/not-found
- `src/components/equity-brain/DealCard.tsx` — handlers reais nos 3 botões + Adicionar contato
- `src/components/equity-brain/match/MatchInboxRow.tsx` — Info navega para a página do match
- `src/components/equity-brain/match/MatchDetailDrawer.tsx` — link "Ver página completa"

## Observações técnicas

- Os links existentes que usam `row.cnpj` continuam funcionando (CNPJ é o caso mais comum). O resolver só entra em ação quando vier codename/listing_id/ticker.
- Se um match não tiver `cnpj` válido (ainda acontece em listings sem enriquecimento), o resolver tenta `listing_id` → busca o `cnpj` lá e redireciona para a URL canônica `/equity-brain/empresa/<cnpj>` (via `navigate(replace: true)`).
- LGPD: revelar CNPJ continua passando por `useIdentityVisibility` + log em `equity_brain.access_logs` (já existe, só reusar).
- A tabela `eb_saved_companies` é nova mas pequena, com RLS por `user_id`.
