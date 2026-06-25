# Rebranding Mari → Rede Social Patrimonial

Transformar todo o módulo `/investir` em uma rede social de acompanhamento de empresas. A camada regulatória (CVM 88, KYC, suitability, reserva, wallet, ledger) é preservada intacta — só muda a casca, a narrativa e a ordem das telas.

> **Escopo desta fase:** front-end, IA de UX, narrativa e novos componentes sociais com dados mockados realistas. Backend social (follows, stories, comentários, XP) entra em fase 2 — nesta fase usamos seed local + tabelas mínimas só onde for inevitável.

---

## 1. Rota raiz e arquitetura

- `/investir` deixa de ser landing comercial → vira **Feed Mari** (home social).
- Landing antiga vira `/investir/sobre-a-mari` (mantém pra SEO institucional).
- Nova IA de navegação (bottom tab mobile + sidebar desktop):
  1. **Início** (feed)
  2. **Descobrir** (ex-listagem, repaginada por categorias humanas)
  3. **Stories+** (modo TikTok vertical)
  4. **Ligas** (gamificação)
  5. **Minha Mari** (carteira + portfolio + missões + reservas, unificado)

- Renomear arquivos-chave (sem quebrar rotas regulatórias):
  - `InvestirHome.tsx` → vira `FeedHome.tsx`
  - `InvestirListagem.tsx` → `Descobrir.tsx`
  - `InvestirAtivo.tsx` → `PerfilEmpresa.tsx` (rota `/investir/empresa/:symbol`, com redirect de `/investir/ativo/:symbol`)
  - `InvestirDashboard.tsx` → `MinhaMari.tsx`

---

## 2. Novos componentes (social layer)

Todos em `src/components/investir/social/`:

- `StoriesBar.tsx` — barra horizontal de avatares de empresas com anel Volt para "novo story".
- `StoryViewer.tsx` — full-screen, swipe vertical/horizontal, progress bars, tap zones, mute, CTA "Conhecer empresa" no rodapé.
- `FeedCard.tsx` — card TikTok-like: vídeo/foto + logo + nome + resumo IA + 3 KPIs rápidos + ações (Seguir, Comentar, Conhecer, **Investir** discreto).
- `FeedComposer.tsx` — placeholder (admin futuro).
- `CompanyHero.tsx` — header do perfil de empresa (logo, nome, fundador, seguidores, investidores, Score Mari, botão Seguir).
- `CompanyTabs.tsx` — Timeline · Stories · Vídeos · Indicadores · Rodada · Documentos · Perguntas.
- `DiarioFeed.tsx` — feed permanente com chips de categoria (Resultados, Expansão, Governança, Clientes, Equipe, Financeiro, Conquistas, Desafios).
- `ScoreMari.tsx` — 9 barras + medalha de nível (Bronze/Prata/Ouro/Platina). Tooltip explica cada eixo.
- `TimelineMarcos.tsx` — vertical timeline visual.
- `ResumoIA.tsx` — bloco com 30s áudio/texto gerado por IA (mock inicial; depois Lovable AI).
- `CommentsThread.tsx` — comentários estilo Instagram, respostas do fundador destacadas.
- `LiveBadge.tsx` + `LivesAgenda.tsx`.
- `BottomCTA.tsx` — barra fixa contextual ("Seguir · Compartilhar · Investir"), Investir sempre terceiro.

---

## 3. Gamificação

Componentes em `src/components/investir/gamification/`:

- `MissaoCard.tsx` + `MissoesHub.tsx` — lista de missões diárias (assistir atualização, ler relatório, quiz, comparar, convidar amigo). Sequência (streak) com badge.
- `LigasHub.tsx` — 8 ligas (Agro, Saúde, Franquias, Indústria, Alimentação, Tecnologia, Construção, Academias). Ranking por XP, não por retorno.
- `FantasyBusiness.tsx` — portfolio fictício; pontua receita, clientes, margem, governança, expansão, valuation, contratações. Página `/investir/fantasy`.
- `XPBar.tsx` + `NivelBadge.tsx` no topo de MinhaMari.

XP fica em `localStorage` nesta fase + uma tabela simples `mari_social_xp(user_id, xp, level, streak_days, updated_at)` com RLS por `auth.uid()`.

---

## 4. Onboarding repaginado

`/investir/onboarding/interesses` (novo, vem ANTES de KYC):

1. "Quais negócios você gosta?" (chips de categoria humana)
2. "Você é empresário?" (sim/não)
3. "Em qual setor você atua/trabalha?"
4. "Sua cidade"
5. "Empresas que você admira" (free-text + sugestões)

Salva em `profiles.interests_json` (jsonb novo) — alimenta o feed.

KYC e Suitability só aparecem quando o usuário clica em **Investir** pela primeira vez (gate just-in-time).

---

## 5. Narrativa & copy

- Substituir em todo o módulo: "ativo", "token", "rodada de captação" na superfície → "empresa", "ser sócio", "rodada atual".
- Novo Hero do `/investir/sobre-a-mari` e meta-tags:
  - H1: **"Conheça empresas reais antes de investir."**
  - Sub: "Acompanhe a jornada de negócios que você admira e torne-se sócio quando fizer sentido."
- Comparativos visuais: "Instagram aproxima pessoas. LinkedIn aproxima profissionais. **Mari aproxima investidores e empreendedores.**"
- Remover qualquer menção a "home broker", "corretora", "crowdfunding" da camada visível. Manter só onde a CVM exige (rodapé, regulamentação, ouvidoria).
- Categorias humanas substituem setores financeiros em filtros e cards.

---

## 6. Página da empresa (ex-página do ativo)

Ordem nova obrigatória:

1. CompanyHero (história + fundador em destaque)
2. Vídeo de apresentação
3. StoriesBar da empresa
4. ResumoIA (30s)
5. TimelineMarcos
6. DiarioFeed (categorias)
7. Indicadores (ScoreMari + KPIs)
8. Rodada atual (barra de captação, discreta)
9. Documentos (colapsado por padrão)
10. **Investir** (CTA dedicado, último)

A lógica de reserva (`ReservationModal`, gates KYC/suitability/saldo/compliance) é reutilizada **sem alteração**.

---

## 7. Feed e Stories — dados

Fase 1 (sem novo backend pesado):

- Mock realista em `src/data/feedSeed.ts` e `src/data/storiesSeed.ts` cruzando com `tokens` reais já existentes.
- Tipos em `src/types/social.ts`.

Fase 2 (mini-migration nesta entrega para destravar follow + comentário):

```sql
-- company_follows
CREATE TABLE public.company_follows (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_id uuid NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, token_id)
);
GRANT SELECT, INSERT, DELETE ON public.company_follows TO authenticated;
GRANT ALL ON public.company_follows TO service_role;
ALTER TABLE public.company_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own follows" ON public.company_follows
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT SELECT ON public.company_follows TO anon; -- contadores públicos

-- company_posts (Diário + Stories)
CREATE TABLE public.company_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('story','diario','live')),
  category text,
  title text,
  body text,
  media_url text,
  expires_at timestamptz, -- stories
  created_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.company_posts TO anon, authenticated;
GRANT ALL ON public.company_posts TO service_role;
ALTER TABLE public.company_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read posts" ON public.company_posts FOR SELECT USING (true);

-- company_comments
CREATE TABLE public.company_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  parent_id uuid REFERENCES public.company_comments(id) ON DELETE CASCADE,
  is_founder boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.company_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_comments TO authenticated;
GRANT ALL ON public.company_comments TO service_role;
ALTER TABLE public.company_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read comments" ON public.company_comments FOR SELECT USING (true);
CREATE POLICY "write own" ON public.company_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "edit own" ON public.company_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- mari_social_xp
CREATE TABLE public.mari_social_xp (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp int DEFAULT 0,
  level text DEFAULT 'bronze',
  streak_days int DEFAULT 0,
  last_activity_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.mari_social_xp TO authenticated;
GRANT ALL ON public.mari_social_xp TO service_role;
ALTER TABLE public.mari_social_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own xp" ON public.mari_social_xp FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

Stories e Diário são populados com seed (admin posta depois). Comentários e follows já funcionais.

---

## 8. Lovable AI — Resumo de 30s

- Edge function `mari-resumo-empresa` (Lovable AI Gateway, gemini-flash):
  - Input: `token_id` + últimas N atualizações de `company_posts`
  - Output: parágrafo de 30s + 3 bullets (mudanças, indicadores, riscos)
- Cache em `company_posts.body` quando `kind='diario'` ou em tabela leve `mari_company_summaries` (TTL 24h).
- Front mostra skeleton enquanto carrega.

---

## 9. Identidade visual

- Manter tokens Carbon/Volt/Graphite/Bone (regra de memória), mas reduzir densidade "fintech" → mais foto, mais avatar, mais respiro.
- Cards com cantos 2xl, sombras suaves, gradiente Volt só em destaques.
- Tipografia: títulos display generosos (já existentes), corpo confortável para leitura longa de Diário.
- Avatares circulares com anel Volt para "novo story".
- Bottom tab bar mobile com ícones cheios, label curto.
- **Não** parecer XP/BTG/Rico: zero tabelas densas, zero gráfico de candle, zero "ticker tape".

---

## 10. O que NÃO muda

- `ReservationModal`, gates regulatórios, ledger, wallet, KYC, suitability, compliance.
- Páginas institucionais já criadas (`/investir/politicas/*`, `/investir/atendimento/*`, `/investir/carreiras`, etc.).
- `PartnersStrip` (CVM + Capitare) — segue no rodapé como selo de credibilidade.
- Rotas regulatórias (`/investir/regulamentacao`, `/investir/riscos`, `/investir/como-funciona`).

---

## 11. Ordem de entrega (sequencial nesta fase)

1. Migração SQL (4 tabelas + grants + RLS).
2. Tipos + seeds (`feedSeed`, `storiesSeed`, `diarioSeed`).
3. Shell novo: bottom tab + sidebar + rotas renomeadas com redirects.
4. **Feed Home** (`/investir`) — StoriesBar + FeedCard + categorias.
5. **Perfil da Empresa** repaginado (nova ordem das seções + ScoreMari + Timeline + Diário + Comments).
6. **Descobrir** com categorias humanas.
7. **Onboarding de interesses** antes do KYC.
8. **Missões + Ligas + Fantasy** (mock + XP em DB).
9. Edge function `mari-resumo-empresa` + integração no perfil e feed.
10. Copy sweep: trocar narrativa em todo o módulo (`/investir/sobre-a-mari` com novo hero).
11. Smoke test Playwright em mobile (440x719) e desktop dos fluxos: feed → empresa → seguir → comentar → investir.

---

## Decisões que preciso confirmar antes de começar

1. **Backend social agora ou depois?** Posso (a) entregar 100% mock visual sem mexer em DB, ou (b) já criar as 4 tabelas mínimas (follows, posts, comments, xp) para que seguir/comentar funcionem de verdade. Recomendo (b) — é o que diferencia "demo" de "rede social".
2. **Lovable AI para resumo agora?** Posso entregar com resumo mockado e plugar a edge function depois, ou já implementar a função real nesta fase.
3. **Vídeos do feed**: usar Unsplash + vídeos placeholder do Pexels/Mixkit, ou pular vídeo e usar imagens estáticas com Ken Burns nesta fase?
4. **Manter `/investir/painel`** como rota separada ou fundir tudo em `/investir/minha-mari`?
