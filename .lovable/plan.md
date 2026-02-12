
## Remover Efeito de Hover Defeituoso nos Clusters

### Problema
O efeito de `transform: scale(1.1)` adicionado ao hover dos clusters está causando uma animação irregular e rápida quando o mouse passa sobre eles, criando um efeito de "bounce" indesejado.

### Análise da Causa
A combinação de:
1. **Animação contínua**: `cluster-pulse` rodando constantemente (2s infinite)
2. **Efeito de hover**: `transform: scale(1.1)` aplicado ao hover

Está criando uma sobreposição de animações que causa o comportamento defeituoso descrito.

### Solução Proposta
Remover o efeito `transform: scale(1.1)` do hover dos clusters em `src/index.css`:

**Arquivos a modificar:**
1. `src/index.css` - Remover as regras:
   - `.marker-cluster-small:hover { transform: scale(1.1) !important; }`
   - `.marker-cluster-medium:hover { transform: scale(1.1) !important; }`
   - `.marker-cluster-large:hover { transform: scale(1.1) !important; }`

Manter:
- Os tamanhos aumentados dos clusters (52px, 64px, 76px)
- As cores vibrantes douradas
- A animação `cluster-pulse` apenas para large clusters (sem interferência do hover)
- O `box-shadow` estático e as bordas

### Resultado Esperado
- Clusters permanecerão maiores e visíveis conforme desejado
- Nenhuma animação irregular ao passar o mouse
- Aparência limpa e profissional mantida
- Apenas a animação `cluster-pulse` suave para clusters grandes continuará rodando

