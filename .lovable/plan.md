
## Fix: Telecomunicações + 3 Novos Setores no Grid de Categorias

### Diagnóstico atual

O array `categories` em `src/data/mockData.ts` tem 9 itens:
- 8 com imagens funcionando
- 1 (`telecom`) com URL quebrada → imagem não carrega, card sozinho na 3ª linha

O grid usa `grid-cols-2 md:grid-cols-4`. Com 9 itens → linha incompleta. Com **12 itens** → 3 linhas perfeitas de 4 colunas no desktop e 6 linhas de 2 no mobile.

---

### Mudanças — apenas `src/data/mockData.ts`

**1. Fix da imagem de Telecomunicações**

Linha 43 — trocar a URL quebrada por uma válida:

```
// URL atual (quebrada):
photo-1523494557144-e9d7037e4200

// Nova URL (antena de telecomunicações):
photo-1614064641938-3bbee52942c7
```

**2. Adicionar 3 novos setores**

Após `telecom`, inserir:

| id | Label | URL Unsplash |
|----|-------|-------------|
| `energy` | Energia & Utilities | `photo-1473341304170-971dccb5ac1e` (usina/energia elétrica) |
| `construction` | Construção Civil | `photo-1504307651254-35680f356dfd` (obra/construção) |
| `agro` | Agronegócio | `photo-1500937386664-56d1dfef3854` (campo/colheita) |

**Resultado final**: 12 categorias → grid perfeito de 3 linhas × 4 colunas no desktop, sem cards orfãos, sem imagens quebradas.

---

### Detalhes técnicos

- **Apenas 1 arquivo modificado**: `src/data/mockData.ts`
- Nenhuma mudança no grid do `Index.tsx` — `grid-cols-2 md:grid-cols-4` já funciona perfeitamente com 12 itens
- URLs Unsplash testadas com o padrão `?w=400&h=300&fit=crop` consistente com as demais
- Os novos IDs (`energy`, `construction`, `agro`) podem ser usados como filtros no marketplace via `/marketplace?sector=energy`
