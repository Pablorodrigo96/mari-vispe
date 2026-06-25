## Auditoria do prompt mestre — o que já está pronto e o que falta

### Já entregue (confirmado no código)
- Feed Home social com saudação, StoriesBar, CategoryStrip humanas, FeedCards, faixas "Em alta" e "Perto de concluir", bloco Missões/Ligas/Lives.
- Perfil da empresa na ordem da espec (História → Vídeo → Resumo IA → Timeline → Diário → Score → Comentários → Investir por último).
- Componentes sociais: StoriesBar, FeedCard, CompanyHero, ResumoIA, ScoreMari (multi-eixo + nível), TimelineMarcos, DiarioFeed, CommentsThread, FollowButton.
- Páginas: Descobrir (categorias humanas), Missões (XP por comportamento + streak + níveis Bronze→Platina), Ligas por setor, Fantasy Business, Lives (calendário estático).
- Bottom tab social: Início · Descobrir · Missões · Ligas · Minha Mari.
- Tabelas Supabase com RLS: `company_follows`, `company_posts`, `company_comments`, `mari_social_xp`, `mari_company_summaries`.
- Tema White (toggle sol/lua) acabado de entregar.
- Discurso reescrito: hero "Empresas reais crescendo agora", CTA principal "Quero ser sócio", `/investir/sobre-a-mari` recolocando o material comercial antigo.

### Lacunas vs prompt mestre (o que falta)

1. **Story Viewer fullscreen** — hoje clicar num story só leva pro perfil. Falta o player estilo Instagram (tela cheia, vídeo/foto/texto/indicador, auto-advance 5s, barrinhas no topo, swipe entre stories da mesma empresa e entre empresas, tap para pausar).
2. **Stories do fundador** — espec separa "stories da empresa" de "stories do fundador". Hoje só temos um conjunto por empresa.
3. **Onboarding de interesses** — não existe `/investir/onboarding/interesses`. Espec exige perguntar antes de KYC: "Quais negócios você gosta? Você é empresário? Setor? Cidade? Empresas que conhece?". Hoje o fluxo entra direto em KYC.
4. **Edge function de Resumo IA real** (`mari-resumo-empresa`) — várias `mari-*` existem para CRM, mas nenhuma gera o resumo 30s + bullets para perfil de empresa a partir de `company_posts`. Hoje o `ResumoIA` no perfil é texto fixo.
5. **Notificações de acontecimento** — espec lista: "Empresa abriu nova unidade", "Fundador publicou atualização", "Empresa concluiu rodada", "Empresa atingiu meta", "Novo contrato". Tabela `notifications` existe, mas sem trigger/conexão com `company_posts` nem com mudanças em `tokens`.
6. **Faixas de feed faltantes** — espec lista 8 faixas; só temos 2. Faltam: "Da sua região", "Que você segue", "Recém adicionadas", "Atingindo metas", "Lives programadas (in-feed)", "Atualizações recentes".
7. **Comentários persistidos de verdade** — `CommentsThread` só usa estado local; não lê nem grava em `company_comments` (que já existe com RLS).
8. **Quiz diário + Comparador de empresas** — missões mencionam "responder quiz" e "comparar empresas"; nenhuma das duas telas existe.
9. **Calendário de lives funcional** — `Lives.tsx` é estático; sem persistência, sem botão "Lembrar" funcional, sem detalhe de live, sem badge "AO VIVO" no feed/perfil.
10. **Editor do fundador (postar story/diário/live)** — sem UI para founder publicar nada. Tabelas existem, mas sem CMS mínimo.
11. **Badges de sequência/nível no perfil do usuário** — XP existe na tela Missões mas o painel/perfil do usuário não exibe medalhas, streak nem nível.
12. **Sweep de copy comercial residual** — varredura final em páginas institucionais/Wallet/Reservas/Painel para remover termos "home broker", "tokenização", "equity crowdfunding" da superfície (mantendo nas páginas regulatórias).

---

## Plano de execução (em ordem)

### Fase 1 — Conteúdo vivo e relacionamento (alto impacto, baixo risco)

**1.1 Story Viewer fullscreen**
- Novo componente `StoryViewer.tsx` (overlay 100vh, barrinhas de progresso, auto-advance, tap esquerda/direita, swipe entre empresas, ESC fecha).
- Integrar no `StoriesBar`: clicar abre o viewer em vez de navegar pro perfil.
- Adicionar campo `founder_avatar` opcional no seed e botão "Conhecer empresa" no rodapé do viewer.

**1.2 Stories do fundador (separados)**
- `StoryItem` ganha `actor: 'company' | 'founder'`.
- `StoriesBar` mostra anel diferente para fundador (gradiente Volt+rosa) e legenda "Fundador".

**1.3 Onboarding de interesses**
- Nova página `/investir/onboarding/interesses` com 4 micro-steps: setores favoritos (chips), é empresário?, cidade, empresas que admira (autocomplete dos seeds).
- Persistir em `profiles` (campo `interests jsonb`) — migração curta.
- `InvestirAuth.tsx` redireciona para `interesses` antes de `kyc` quando user novo.
- Feed Home lê interesses pra ordenar faixas (região, setores escolhidos).

**1.4 Faixas de feed faltantes**
- Em `FeedHome.tsx` adicionar `HighlightStrip` para: "📍 Perto de você" (filtra por cidade/UF do profile), "👀 Empresas que você segue", "🆕 Recém-chegadas na Mari" (order by created_at), "🎯 Atingindo metas" (token com `pct >= 90`), "📅 Lives agendadas" (lê tabela `lives` ou seed por enquanto), "🔔 Atualizações recentes" (últimos `company_posts` tipo `diario`).

**1.5 Comentários persistidos**
- `CommentsThread` lê/escreve em `company_comments` quando há `company_id`; mantém fallback local para seeds.
- Mostra `is_founder` automaticamente quando o autor é founder do listing.

### Fase 2 — Inteligência e notificações

**2.1 Edge function `mari-resumo-empresa`**
- Nova função em `supabase/functions/mari-resumo-empresa/index.ts` usando Lovable AI Gateway (`google/gemini-2.5-flash`).
- Input: `company_id`. Lê últimos 10 `company_posts` + dados do `tokens/listings`. Output: `{ summary, bullets[3] }`.
- Grava em `mari_company_summaries` com TTL 24h. `ResumoIA` consome essa cache via RPC.

**2.2 Notificações de acontecimento**
- Trigger em `company_posts` (after insert) → cria notification para todos os `company_follows`.
- Edge function `mari-event-notify` para eventos de `tokens` (rodada concluída, meta atingida).
- Mensagens em linguagem humana: "🏗️ Empresa X inaugurou nova unidade", "💬 Fundador publicou uma atualização", etc.

### Fase 3 — Gamificação e descoberta

**3.1 Quiz diário**
- Nova rota `/investir/quiz` com 3 perguntas/dia sobre empresas seguidas. Acerto = +25 XP, grava em `mari_social_xp`.
- Card "Quiz de hoje" no topo de `/investir/missoes`.

**3.2 Comparador de empresas**
- Nova rota `/investir/comparar` (até 3 empresas lado a lado: Score Mari por eixo, rodada, setor, indicadores). +20 XP por comparação salva.

**3.3 Badges no perfil do usuário**
- Componente `UserBadgesStrip` (Bronze/Prata/Ouro/Platina, streak 7d/30d, primeiro comentário, primeiro seguidor, primeira reserva).
- Renderiza no `/investir/painel` topo.

### Fase 4 — Lives reais

**4.1 Tabela `lives` (id, company_id, scheduled_at, status, embed_url)** + RLS.
**4.2 Página de detalhe `/investir/live/:id`** com placeholder de player (iframe/YouTube live) + chat usando `company_comments`.
**4.3 Botão "Lembrar"** persistido em tabela `live_reminders` + notification 30min antes.
**4.4 Badge "AO VIVO"** no `StoriesBar`, `FeedCard` e `CompanyHero` quando `live.status='live'`.

### Fase 5 — Editor do fundador (mínimo)

**5.1 `/investir/empresa/:symbol/postar`** (gate: só founder do listing). Form simples: tipo (story/diário/live), categoria, mídia, texto. Grava em `company_posts`.
**5.2 Botão "Publicar atualização"** no `CompanyHero` quando user é o founder.

### Fase 6 — Sweep de discurso

**6.1 Varredura `rg`** por: "home broker", "crowdfunding", "tokenização", "token de", "security token", "ativo digital". Substituir na superfície mantendo nas páginas regulatórias.
**6.2 Microcopy de erros/empty states** em pt-BR humano.

---

## Detalhes técnicos

- **Migrações novas**: `profiles.interests jsonb`, `lives` table + RLS + GRANTs, `live_reminders` table + RLS + GRANTs. Triggers em `company_posts` para notification fanout (com função SECURITY DEFINER).
- **Edge functions novas**: `mari-resumo-empresa`, `mari-event-notify`. Ambas com `verify_jwt = false` quando consumidas em página pública; chamadas server-side via RPC quando precisar de auth.
- **Sem mudança em**: ReservationModal, KYC/Suitability, ledger, wallet, compliance, sidebar PME.B3, qualquer rota fora de `/investir`.
- **Tema White**: continua aplicado automaticamente; novos componentes seguem padrão `text-bone/bg-graphite/bg-volt` que a camada `.mari-light` já remapeia.
- **Performance**: Story Viewer carrega lazy; faixas extras do feed usam mesmas queries já feitas (apenas filtros adicionais em memória).

## Ordem de entrega sugerida

Fase 1 (1.1 → 1.5) entrega 80% do "wow" social visível. Fase 2 entrega inteligência. Fases 3–5 podem ser fatiadas em PRs separados. Fase 6 fecha o discurso.

## Pergunta antes de começar

Quer que eu entregue **tudo de uma vez** (PR grande, ~12–15 arquivos novos + 2 migrações + 2 edge functions) ou prefere fatiar **fase por fase** com checkpoint visual entre elas?
