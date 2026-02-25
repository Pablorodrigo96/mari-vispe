

## Plano: Analytics de Anúncios para Plano Master

### Objetivo
Registrar visualizações e cliques de contato em cada listing do marketplace, e exibir um painel de métricas na página "Meus Anúncios" para usuários com plano Master.

---

### 1. Nova Tabela: `listing_views`

Tabela para registrar cada visualização de um anúncio no marketplace (página de detalhe).

```text
listing_views
├── id (uuid, PK, default gen_random_uuid())
├── listing_id (uuid, NOT NULL)
├── viewer_ip (text, nullable) -- para contagem de únicos quando não logado
├── user_id (uuid, nullable) -- quando o visitante está logado
├── event_type (text, NOT NULL, default 'view') -- 'view' ou 'contact_click'
├── created_at (timestamptz, NOT NULL, default now())
```

**RLS Policies:**
- INSERT: qualquer pessoa pode inserir (público, visitantes anônimos)
- SELECT: dono do listing pode ver views dos seus anúncios + admins podem ver tudo

---

### 2. Registrar Visualizações (`ListingDetail.tsx`)

Ao carregar a página de detalhe do anúncio, inserir um registro na tabela `listing_views` com `event_type = 'view'`. Usar o `user_id` do auth se logado, senão `null`.

Ao clicar em "Enviar Mensagem" (submit do formulário de contato) ou no botão WhatsApp, inserir um registro com `event_type = 'contact_click'`.

| Arquivo | Ação |
|---|---|
| `ListingDetail.tsx` | Inserir view ao montar; inserir contact_click ao enviar mensagem/WhatsApp |

---

### 3. Painel de Métricas em "Meus Anúncios" (`MyListings.tsx`)

Substituir a contagem atual baseada em `teaser_views` pela nova tabela `listing_views`. Para cada listing, exibir:

- **Visualizações** (total de views)
- **Contatos** (total de contact_clicks)

Para usuários com plano Master: exibir um card expandido com métricas detalhadas (views, contatos, taxa de conversão contato/view). Para plano básico: exibir apenas o total de views (como já faz hoje), com um CTA para upgrade.

Nos stats cards do topo da página, adicionar:
- Card "Visualizações" (soma de todas as views)
- Card "Contatos" (soma de todos os contact_clicks)

| Arquivo | Ação |
|---|---|
| `MyListings.tsx` | Buscar dados de `listing_views` agrupados por listing_id e event_type; exibir métricas por listing e nos stats cards do topo |

---

### 4. Verificação de Plano

Buscar o plano do usuário da tabela `subscriptions` ou dos próprios listings para decidir se mostra métricas detalhadas ou o CTA de upgrade.

---

### Seção Técnica

**Migração SQL:**
```sql
CREATE TABLE public.listing_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  user_id uuid,
  event_type text NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode inserir views
CREATE POLICY "Anyone can insert listing views"
  ON public.listing_views FOR INSERT
  WITH CHECK (true);

-- Donos dos listings podem ver views dos seus anúncios
CREATE POLICY "Listing owners can view their listing views"
  ON public.listing_views FOR SELECT
  USING (listing_id IN (
    SELECT id FROM public.listings WHERE user_id = auth.uid()
  ));

-- Admins podem ver tudo
CREATE POLICY "Admins can view all listing views"
  ON public.listing_views FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_listing_views_listing_id ON public.listing_views(listing_id);
CREATE INDEX idx_listing_views_event_type ON public.listing_views(event_type);
```

**Registro de view em ListingDetail.tsx:**
```text
useEffect → após carregar o listing com sucesso:
  supabase.from('listing_views').insert({
    listing_id: listing.id,
    user_id: user?.id || null,
    event_type: 'view'
  })
```

**Registro de contact_click:**
- No `handleContactSubmit` (após sucesso)
- No botão WhatsApp (ao clicar)

**Consulta em MyListings.tsx:**
```text
supabase.from('listing_views')
  .select('listing_id, event_type')
  .in('listing_id', listingIds)
→ agrupar client-side por listing_id e event_type
```

**Arquivos modificados:** 2 arquivos + 1 migração SQL

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar tabela `listing_views` com RLS |
| `ListingDetail.tsx` | Registrar views e contact_clicks |
| `MyListings.tsx` | Buscar e exibir métricas de views/contatos por listing |

