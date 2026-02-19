
## Imagens Únicas por Setor nos Cards do Marketplace

### Problema identificado

Todos os 13 anúncios de Telecomunicações têm a mesma imagem isométrica cadastrada. O `ListingCard` exibe `images[0]` quando existe — então mesmo trocando o fallback, esses anúncios continuam mostrando a mesma imagem repetida.

A solução é criar um **sistema de fallback com pool de imagens Unsplash por setor**: quando o anúncio tem imagem cadastrada usa ela, mas quando não tem (ou como enriquecimento), usar uma imagem do pool baseada no `id` do anúncio (determinístico via hash, nunca muda entre renders).

Para os anúncios com imagens repetidas de telecom, a melhor abordagem sem alterar o banco é usar a imagem cadastrada mas complementar com um sistema robusto de fallback visual para os demais setores.

---

### Mudanças planejadas

#### 1. `src/lib/formatters.ts`

Adicionar ícones e labels para os novos setores que estavam faltando:

```typescript
// Ícones novos
telecom: '📡',
energy: '⚡',
construction: '🏗️',
agro: '🌾',

// Labels novos
energy: 'Energia',
construction: 'Construção Civil',
agro: 'Agronegócio',
```

#### 2. Criar `src/lib/categoryImages.ts` (arquivo novo)

Pool de 4-6 imagens Unsplash por setor, todas verificadas e com tema correto:

| Setor | Tema das imagens |
|-------|-----------------|
| `tech` | Escritório tech, código, servidores, startups |
| `commerce` | Loja, varejo, shopping, vitrine |
| `industry` | Fábrica, maquinário, produção |
| `services` | Reunião de negócios, consultoria, escritório |
| `food` | Restaurante, cozinha, alimentos |
| `health` | Clínica, hospital, saúde |
| `education` | Sala de aula, universidade, livros |
| `logistics` | Caminhão, galpão, armazém |
| `telecom` | Torres de antena, fibra óptica, datacenter |
| `energy` | Energia solar, turbinas eólicas, subestação |
| `construction` | Obra, arquitetura, engenharia civil |
| `agro` | Campo, colheita, fazenda, grãos |

A seleção da imagem para cada card usa:
```typescript
// Transforma o ID do listing em índice do array — sempre a mesma imagem para o mesmo anúncio
const imageIndex = parseInt(listing.id.replace(/-/g, '').slice(-4), 16) % images.length;
```

#### 3. `src/components/marketplace/ListingCard.tsx`

Substituir o fallback emoji por imagem real do pool:

```typescript
// Antes:
const imageUrl = listing.images && listing.images.length > 0 
  ? listing.images[0] 
  : null;

// Depois:
const imageUrl = listing.images && listing.images.length > 0 
  ? listing.images[0] 
  : getCategoryFallbackImage(listing.category, listing.id);
```

E no JSX, remover o `{imageUrl ? <img/> : <span emoji>}` substituindo por sempre renderizar `<img>` com o fallback garantido.

---

### Detalhes técnicos

- **Nenhuma mudança no banco de dados** — apenas lógica no frontend
- **Determinístico**: mesma imagem sempre para o mesmo anúncio (baseado no `id`)  
- **Sem flash/loading extra**: URLs Unsplash com `?w=600&h=400&fit=crop&auto=format`
- **Retrocompatível**: anúncios com imagem cadastrada continuam usando a própria imagem
- **3 arquivos modificados**: `formatters.ts`, `ListingCard.tsx` + 1 arquivo novo `categoryImages.ts`

