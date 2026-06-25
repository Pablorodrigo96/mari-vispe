
# Stories reais: importação manual pelo fundador

Sem scraping, sem OAuth do Instagram. O fundador da empresa cola o link/print do story dele e a Mari espelha como slide nativo nas bolinhas do topo do feed. Stories reais convivem com os mockados de `socialSeed.ts` — empresa que tiver story importado nas últimas 24h aparece com anel "AO VIVO" e abre os slides reais; o resto continua mostrando o seed.

## O que muda pro usuário

- **Fundador (dono da empresa)**: novo bloco "Stories do Instagram" no editor da empresa. Cola URL do story público OU faz upload de imagem/vídeo (print/recorte), escreve legenda opcional, marca como "AO VIVO 24h". Pode adicionar até 5 slides por vez.
- **Investidor (feed)**: as bolinhas no topo do `FeedHome` priorizam empresas com stories reais ativos (não expirados). Visualmente ganham um ring extra (já temos gradiente Volt — adiciona um pulse sutil). Ao tocar, o `StoryViewer` mostra os slides reais antes (ou no lugar) dos mockados.
- **Expiração**: stories somem automaticamente 24h após o `published_at`, igual Instagram. Job de limpeza roda no fetch (filtra `expires_at > now()`).

## Arquitetura

### 1. Banco — nova tabela `company_stories`

```text
company_stories
├── id uuid pk
├── token_id uuid → tokens(id)   (qual empresa)
├── author_id uuid → auth.users   (quem postou — fundador/advisor)
├── slide_order int               (ordem dentro do conjunto)
├── media_type text               ('image' | 'video' | 'text')
├── media_url text                (storage público OU URL externa)
├── caption text                  (legenda opcional)
├── source text                   ('manual_upload' | 'instagram_link')
├── source_url text               (link original do IG, se houver)
├── published_at timestamptz default now()
├── expires_at timestamptz        (default now() + 24h, trigger)
└── created_at, updated_at
```

- **Grants + RLS**: SELECT público (`anon` + `authenticated`) para slides não expirados; INSERT/UPDATE/DELETE apenas para `author_id = auth.uid()` E (dono do token via `tokens.owner_id` OU role advisor/admin via `has_role`).
- **Storage bucket** `company-stories` (público, 10MB por arquivo, image/* e video/mp4).
- **Trigger** que seta `expires_at = published_at + interval '24 hours'`.

### 2. Editor do fundador — `src/pages/investir/founder/StoriesManager.tsx` (novo)

Acessível em `/investir/empresa/:symbol/stories` (só para owner/advisor). Layout:

```text
┌─────────────────────────────────────┐
│  Stories ativos (próximas 24h)      │
│  [thumb1] [thumb2] [+ adicionar]    │
├─────────────────────────────────────┤
│  Novo slide                         │
│  ○ Upload (imagem/vídeo)            │
│  ○ Link público do Instagram        │
│  [campo URL ou dropzone]            │
│  [legenda opcional]                 │
│  [publicar]                         │
└─────────────────────────────────────┘
```

- Upload vai pro bucket `company-stories`, devolve `media_url`.
- Para link IG: tentamos extrair o ID do post (`/p/`, `/reel/`, `/stories/<user>/<id>`) e salvamos como `source='instagram_link'`. O StoryViewer renderiza um `<iframe>` do embed oficial do Instagram (`https://www.instagram.com/p/<id>/embed`) — funciona pra posts/reels públicos sem API. Stories propriamente ditos do IG **não têm embed público**; nesses casos a UI obriga upload de print/vídeo.

### 3. Feed e StoryViewer — alterações

- `src/components/investir/social/StoriesBar.tsx`: nova query que busca `company_stories` agrupado por `token_id` com `expires_at > now()`, junta com tokens, e mistura com o seed. Empresas com story real vão pro topo com ring `animate-pulse`.
- `src/components/investir/social/StoryViewer.tsx`: aceita um novo tipo de `StorySlide` (`real_image`, `real_video`, `instagram_embed`). Vídeos pausam o auto-advance até terminar; embeds IG ficam 8s no ar.
- `src/types/social.ts`: estende `StorySlide` com os 3 novos kinds.
- `src/data/socialSeed.ts`: passa a ser fallback — usado só quando a empresa não tem stories reais ativos.

### 4. Painel do fundador

Adiciona card "Stories" no `/investir/empresa/:symbol` quando `useIsOwner()` for true, mostrando contador "X stories ativos · expira em Yh" e CTA "Gerenciar stories".

## Detalhes técnicos

- **Sem edge function nova** — tudo client → Supabase direto. Upload usa `supabase.storage.from('company-stories').upload(...)`.
- **Validação** com zod: URL Instagram (regex `instagram.com/(p|reel|stories)/`), arquivo ≤10MB, caption ≤200 chars.
- **Limpeza**: não precisa cron — basta filtrar `expires_at > now()` em todo `select`. Opcionalmente, migration adiciona um cron `pg_cron` que `delete from company_stories where expires_at < now() - interval '7 days'` (mantém histórico curto pra analytics).
- **Embed do Instagram**: usar `<iframe src="https://www.instagram.com/p/<id>/embed/captioned" />` (sem necessidade de script oficial). Adicionar `loading="lazy"` e `sandbox`.
- **Realtime opcional** (fora desta fase): assinatura no `StoriesBar` pra atualizar ao vivo quando fundador publica.

## Fora de escopo (intencional)

- Importação automática do feed @ do Instagram.
- OAuth/Graph API.
- Métricas de visualização (quem viu o story) — fica pra fase de analytics.
- Stories com stickers/menções/sondagens.

## Entregáveis

1. Migration: tabela `company_stories` + bucket `company-stories` + RLS + trigger expires_at.
2. `StoriesManager.tsx` (editor) + rota.
3. Atualizações em `StoriesBar.tsx`, `StoryViewer.tsx`, `socialSeed.ts`, `types/social.ts`.
4. Card "Stories" em `PerfilEmpresa.tsx` para owner/advisor.
5. Item "Stories" no `FounderEditor` se já existir esse hub, senão link direto do perfil da empresa.
