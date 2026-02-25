

## Plano: 4 Features do Plano Master

### 1. Prioridade nas Buscas do Marketplace

**Problema**: Listings Master e Básico aparecem misturados, sem destaque para quem paga.

**Solução**: No `Marketplace.tsx`, após aplicar o sort escolhido pelo usuário, reordenar o array `listings` para que `plan === 'master'` venha sempre primeiro, mantendo a ordem relativa dentro de cada grupo.

| Arquivo | Ação |
|---|---|
| `Marketplace.tsx` | Após `setListings(data)`, ordenar o array colocando `master` primeiro |

---

### 2. Selo "Verificado" Funcional

**Problema**: Não existe campo `verified` na tabela `listings`. O selo é apenas visual/mock.

**Solução**:
- Migração: adicionar coluna `verified boolean default false` na tabela `listings`
- Admin: no dropdown de ações do `AdminListings.tsx`, adicionar opção "Marcar como Verificado" / "Remover Verificado"
- Marketplace: no `ListingCard.tsx`, exibir badge "Verificado" com ícone de check quando `listing.verified === true`
- Detalhe: no `ListingDetail.tsx`, exibir o mesmo badge ao lado do título

| Arquivo | Ação |
|---|---|
| Migração SQL | `ALTER TABLE listings ADD COLUMN verified boolean DEFAULT false` |
| `AdminListings.tsx` | Adicionar toggle de verificação no dropdown de ações |
| `ListingCard.tsx` | Exibir badge "Verificado" quando `listing.verified` |
| `ListingDetail.tsx` | Exibir badge "Verificado" no header |

---

### 3. Suporte a Vídeo nos Anúncios

**Problema**: Não existe campo para URL de vídeo nem player.

**Solução**:
- Migração: adicionar coluna `video_url text` na tabela `listings`
- Wizard de criação (`NewListingWizard.tsx`): adicionar campo de URL de vídeo no step de fotos (`StepImages.tsx`)
- Edição (`EditListing.tsx`): adicionar campo de vídeo
- Detalhe (`ListingDetail.tsx`): se `video_url` existir, renderizar um `<iframe>` do YouTube/Vimeo ou tag `<video>` acima ou abaixo da galeria de fotos

| Arquivo | Ação |
|---|---|
| Migração SQL | `ALTER TABLE listings ADD COLUMN video_url text` |
| `StepImages.tsx` | Adicionar input para URL do vídeo |
| `NewListingWizard.tsx` | Incluir `videoUrl` no formData e no insert |
| `EditListing.tsx` | Incluir campo `videoUrl` no formulário e no update |
| `ListingDetail.tsx` | Renderizar player de vídeo quando `video_url` presente |
| `listingSchema.ts` | Adicionar `videoUrl` ao schema e initialFormData |

---

### 4. Limite de Fotos por Plano

**Problema**: O upload permite até 10 fotos fixo, sem distinção entre planos.

**Solução**:
- No wizard de criação: como o plano é selecionado só no final, usar limite de 5 (básico) como padrão durante a criação. O limite de 20 será aplicado na edição para quem tem plano Master.
- No `ImageUpload.tsx`: o `maxImages` prop já existe e funciona. Basta passá-lo corretamente.
- No `StepImages.tsx` do wizard: receber uma prop `maxImages` (default 5)
- No `EditListing.tsx`: verificar o plano do listing e passar `maxImages={listing.plan === 'master' ? 20 : 5}`
- Mensagem informativa no wizard: "Plano Básico permite até 5 fotos. Faça upgrade para o Master para até 20 fotos."

| Arquivo | Ação |
|---|---|
| `StepImages.tsx` | Aceitar prop `maxImages`, passar para `ImageUpload` |
| `NewListingWizard.tsx` | Passar `maxImages={5}` para StepImages |
| `EditListing.tsx` | Passar `maxImages` baseado no plano do listing (5 ou 20) |

---

### Seção Técnica

**Migração SQL** (uma única migração):
```sql
ALTER TABLE public.listings ADD COLUMN verified boolean DEFAULT false;
ALTER TABLE public.listings ADD COLUMN video_url text;
```

**Prioridade de busca** - implementada client-side com sort estável:
```text
listings.sort((a, b) => {
  if (a.plan === 'master' && b.plan !== 'master') return -1;
  if (a.plan !== 'master' && b.plan === 'master') return 1;
  return 0;
});
```

**Vídeo** - suporte a YouTube, Vimeo e URLs diretas. Detecção automática do tipo para renderizar `<iframe>` ou `<video>`.

**Arquivos modificados**: 8 arquivos + 1 migração SQL.

