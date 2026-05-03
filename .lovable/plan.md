# Botão "Mostrar no grafo 3D" — buyer e seller (mandato)

## Objetivo
Adicionar, na barra de ações de `BuyerDetailPage` e `MandateDetailPage`, um botão **Mostrar no grafo 3D** que abre `/equity-brain/admin/jarvis` já com o nó da entidade selecionado (painel lateral aberto) e a câmera centralizada nele.

## Como o grafo identifica nós (já existe)
- Buyer  → `id = "buyer:<buyer.id>"`
- Seller → `id = "seller:<company.cnpj>"`

(definido em `src/lib/equityGraphBuilder.ts`)

## Mudanças

### 1. `JarvisGraph3D.tsx` — aceitar `?focus=<nodeId>`
- Ler `useSearchParams()` no mount.
- Se houver `focus`:
  - Detectar o tipo (`buyer:` / `seller:` / `thesis:` / `platform:`) e **adicionar automaticamente esse tipo a `selectedNodeTypes`** (hoje começa vazio, então o nó ficaria escondido). Para buyer/seller também forçar `enabledLayers` a incluir `ma_direct` para garantir arestas visíveis.
- Após `graphData` carregar e a simulação aquecer (~`cooldownTicks` ou um `setTimeout` de ~1500ms), procurar o nó por id, fazer:
  - `setSelectedNode(node)` (já abre o `NodeDetailPanel` e ativa o realce de vizinhos via `focusId`);
  - `fgRef.current.cameraPosition(...)` reaproveitando exatamente a mesma fórmula do `onNodeClick` atual (linhas 983-993).
- Executar **só uma vez** por valor de `focus` (guard com `useRef`).

### 2. `BuyerDetailPage.tsx` — botão na barra de ações
Logo depois do `<EnrichBuyerButton />` (linha 92), inserir:
```tsx
<Link
  to={`/equity-brain/admin/jarvis?focus=buyer:${buyer.id}`}
  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
             bg-transparent border border-zinc-700 text-zinc-200
             hover:bg-zinc-900 hover:text-emerald-300 text-xs"
>
  <Network className="h-3.5 w-3.5" />
  Mostrar no grafo 3D
</Link>
```
(import `Network` de `lucide-react` e `Link` já existe.)

### 3. `MandateDetailPage.tsx` — mesmo botão para seller
Render condicional a `mandate.company_cnpj`:
```tsx
{mandate.company_cnpj && (
  <Link
    to={`/equity-brain/admin/jarvis?focus=seller:${mandate.company_cnpj}`}
    className="..."  // mesmo estilo
  >
    <Network className="h-3.5 w-3.5" /> Mostrar no grafo 3D
  </Link>
)}
```

## Detalhes técnicos / edge cases
- Se o nó **não estiver no grafo após filtros padrão** (ex.: buyer sem matches que cair fora dos 350 nós), exibir `toast` "Nó não encontrado no grafo atual — ajuste filtros".
- O guard com `useRef<string|null>` evita re-focar a cada `graphData` rebuild quando o usuário arrasta a câmera.
- Não mexer no `GrafoJarvisPage.tsx` — o param flui via URL.
- Sem mudança de banco, sem nova rota, sem edge function.

## Não fazer
- Não criar nova página de grafo focado.
- Não adicionar `mode=focus` ou outros params além de `focus`.
- Não alterar comportamento padrão quando `focus` não está presente.
