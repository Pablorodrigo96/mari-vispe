

## Plano: Corrigir Header Invisível na Página /capital

### Problema
A rota `/capital` está na lista `darkHeroRoutes` do Header, que aplica texto branco e logo clara no topo. Porém o fundo da página é claro (gradiente branco/cinza), tornando tudo invisível.

### Solução
Remover `'/capital'` da lista `darkHeroRoutes` na linha 48 de `src/components/layout/Header.tsx`. Isso fará o header usar o estilo sólido (fundo branco, texto escuro) desde o início, como já funciona em `/vender`.

### Arquivo alterado

| Arquivo | Mudança |
|---|---|
| `src/components/layout/Header.tsx` | Remover `'/capital'` do array `darkHeroRoutes` (linha 48) |

