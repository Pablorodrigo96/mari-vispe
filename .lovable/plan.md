## Diagnóstico

Auditei o banco e o front. O problema não é "falta de cadastro" — é **descasamento de fonte de dados + falta de anonimização**:

**1. Os 106 compradores existem, mas em outra base e com outro `status`:**
- `equity_brain.buyers`: **106 buyers** (`ativo` = 69, `ativo_seletivo` = 37). Nenhum com `status='active'`.
- `public.buyer_profiles`: apenas **1 buyer** com `status='active'` — é a única fonte que o **mapa público (`/mapa`)**, o **marketplace** e os matches do front consomem hoje.
- O Brain foi populado com importações estratégicas (Telecom, Saúde, Retail, PE, Family Offices…) usando o vocabulário interno (`ativo`, `ativo_seletivo`), mas **nada disso reflui** para a base que alimenta a UI pública.

**2. No cockpit do Brain (`/equity-brain/mapa`, grafo, jarvis), os buyers existem mas só aparecem com zoom ≥ 7** e **sem filtro por status** — então mesmo lá o catálogo de 106 fica "escondido" até o usuário aproximar muito o mapa.

**3. PII exposta:** hoje qualquer usuário autenticado (e até anônimo) consegue ler `nome`, `cnpj`, `website`, `observacoes` dos buyers via a view `public.eb_buyers` e nomes/CNPJs reais dos sellers em `public.listings`. Não há mascaramento server-side — só formatação cosmética em `maskCnpj` que um usuário pode burlar batendo direto na tabela.

## O que vou construir

Princípio: **uma única base mestre (Brain) + views anonimizadas para o front**. Continuamos copiando, nunca recortando.

### 1. Espelhar os 106 buyers do Brain → `public.buyer_profiles` (com anonimização)

- Migration que faz backfill: para cada `equity_brain.buyers` insere/atualiza um `public.buyer_profiles` correspondente, com:
  - `buyer_name` = pseudônimo determinístico tipo `"Comprador Estratégico #A47"` ou `"Fundo PE #F12"` (gerado a partir do hash do `id` + `tipo`).
  - `company_name` = NULL (escondido).
  - `categories` = mapeado de `setores_interesse` para o vocabulário do marketplace (reutiliza `category_to_setor` invertido).
  - `state/city` = primeira UF/município de interesse (ou NULL).
  - `min_budget/max_budget` = `ticket_min/ticket_max`.
  - `description` = texto neutro tipo `"Tese: Telecom/ISP · Ticket R$ 5–30M · Foco SP, MG"`.
  - `status='active'` (todos os `ativo` e `ativo_seletivo`).
  - `email/whatsapp` = NULL.
  - `user_id` = um usuário-bot do sistema (criado se não existir) para satisfazer NOT NULL e RLS.

- Trigger `equity_brain.buyers → public.buyer_profiles` (`AFTER INSERT OR UPDATE`) para manter o espelho vivo.

- Resultado: marketplace e mapa público passam a mostrar **todos os 106 compradores anonimizados** automaticamente.

### 2. Anonimização real e centralizada (server-side)

- Criar **view `public.listings_public`** (com `security_invoker=on`) que expõe listings sem PII: esconde `cnpj`, `street`, `neighborhood`, `cep`, `additional_info` e troca `title` por um ticker pseudônimo (`OPP-XXXX`). Ajustar políticas: leitura pública/autenticada **só pela view**; `public.listings.SELECT` permanece, mas o front passa a consumir `listings_public` em todas as telas não-admin.
- Criar **view `public.buyer_profiles_public`** análoga: expõe só `id, buyer_name (pseudônimo), categories, state, city, min_budget, max_budget, description, status, created_at`. Esconde `email, whatsapp, company_name, user_id`.
- Criar **view `public.eb_buyers_public`** que substitui o uso atual de `public.eb_buyers` no front: apenas campos não-sensíveis (`id, pseudônimo, tipo, ufs_interesse, ticket_min/max, vertical_principal, status`). A view atual `eb_buyers` passa a exigir admin/advisor.
- Função SECURITY DEFINER `public.unmask_buyer(buyer_id)` e `public.unmask_listing(listing_id)` que retornam o registro completo **somente se** `has_role(auth.uid(),'admin') OR has_role(auth.uid(),'advisor')`. Usado pelo cockpit do Brain e pelo painel do advisor para ver o nome real quando há match.

### 3. Acesso desmascarado restrito a Vispe (admin + advisor)

- Hoje `BuyersPage`, `JarvisGraph3D`, `StrategicGraph`, `BrasilMap` consultam `eb_buyers` direto. Vou trocar por `eb_buyers_public` por padrão e usar `eb_buyers` (full) só quando `useUserRoles().isAdmin || isAdvisor`.
- `DealCard` / `MatchDecisionCard` continuam mostrando dados completos, mas só quando o usuário for admin/advisor (já existe o check; vou reforçar).
- Para sellers/buyers comuns, qualquer card de match exibe pseudônimo + tese + ticket + região, e CTA "Solicitar apresentação via Vispe" (gera notificação para admin) em vez de contato direto.

### 4. Mostrar buyers no cockpit do Brain desde o zoom inicial

- `BrasilMap.tsx`: remover o `zoom >= 7` da query de buyers e renderizar agregado por UF (badge com contagem) nos zooms baixos; pins individuais a partir do zoom 7. Default do toggle "Mostrar buyers" passa a `true` no `MapaPage`.
- Garantir que o filtro lateral conta corretamente o total ("106 compradores ativos") em vez de aparecer vazio.

### 5. RLS e segurança

- `public.buyer_profiles`: a policy "Public can view active buyer profiles" passa a ser servida pela view anonimizada; a tabela direta exige `auth.uid() = user_id OR has_role(admin) OR has_role(advisor)`.
- `public.listings`: idem — leitura pública passa pela view; tabela direta restringe a dono/admin/advisor.
- `equity_brain.buyers`: já é schema interno, vou garantir que não tem grant para `anon`/`authenticated`. Acesso vem só pela view pública mascarada ou pelas funções `unmask_*`.

### 6. Painel admin: card "Sync & Privacidade"

Pequeno card no painel do Brain mostrando:
- `eb_buyers` total vs `buyer_profiles` espelhados.
- `listings` vs `listings_public` (sanity check da view).
- Contador de chamadas a `unmask_*` nas últimas 24h (auditoria).
- Botão "Forçar resync de buyers".

## Arquivos previstos

- 1 migration SQL: views anonimizadas, função pseudônimo, trigger Brain→buyer_profiles, backfill dos 106, ajustes de RLS, função `unmask_*`.
- `src/components/equity-brain/BrasilMap.tsx`: remover gate de zoom, trocar fonte para `eb_buyers_public` quando não-admin.
- `src/pages/equity-brain/MapaPage.tsx`: `showBuyers` default `true`.
- `src/pages/equity-brain/BuyersPage.tsx`, `JarvisGraph3D.tsx`, `graph/StrategicGraph.tsx`: usar `eb_buyers_public` por padrão; consumir `eb_buyers` (full) só com `isAdmin || isAdvisor`.
- `src/pages/MapView.tsx`, `Marketplace.tsx`, `ListingCard.tsx`, `BusinessMap.tsx`: trocar `listings` por `listings_public` e `buyer_profiles` por `buyer_profiles_public` em todas as leituras não-admin.
- `src/lib/equityBrain.ts`: helper `pseudonymFor(id, tipo)` para usar no front quando precisar gerar pseudônimo localmente.
- `src/components/equity-brain/SyncHealthCard.tsx`: incluir métricas de privacidade.

## Garantias

- **Zero recorte**: a base mestre dos buyers continua sendo `equity_brain.buyers`; `buyer_profiles` recebe espelho.
- **Anonimização server-side**: nenhum cliente recebe nome/CNPJ/contato sem ser admin ou advisor da Vispe.
- **Marketplace e mapa voltam a mostrar 106 compradores** (anonimizados) imediatamente após o backfill.
- **Cockpit do Brain (admin/advisor)** continua vendo tudo, com nomes reais e contatos para fechar match.

## Pergunta antes de implementar

Confirma estes três pontos?

1. **Pseudônimo** dos buyers: prefere `"Comprador Estratégico #A47"` (estilo bolsa, anônimo total) ou `"Grupo Telecom #12 (SP)"` (mostra setor + UF, ainda anônimo)?
2. **Pseudônimo dos listings** no marketplace público: manter o `ticker` atual quando existir, ou forçar `OPP-XXXX` em tudo?
3. Além de **admin** e **advisor**, o **franqueado** Vispe da região também pode desmascarar matches da sua praça, ou só admin/advisor mesmo?