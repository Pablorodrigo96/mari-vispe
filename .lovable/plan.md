## Aumentar tamanho dos logos da mari

Os PNGs oficiais têm padding interno generoso, então os tamanhos atuais (`size=32–48`) renderizam visualmente pequenos. Vou ampliar todos os pontos de uso e aumentar a altura dos containers que limitam a marca.

### Mudanças

| Local | Antes | Depois |
|---|---|---|
| `Header.tsx` (público) | `size={36}` em `h-16` | `size={72}` em `h-20` |
| `AppSidebar.tsx` (logado, desktop) | `size={32}` (collapsed `28`) | `size={64}` (collapsed `44`) |
| `Footer.tsx` | `size={42}` | `size={88}` |
| `Auth.tsx` (login do Vender) | `size={48}` variant `light` | `size={120}` variant `tagline-light` (com "designed forward") |
| `EBSidebar.tsx` (Equity Brain) | `size={32}` | `size={48}` |

### Arquivos editados

```text
src/components/layout/Header.tsx
src/components/layout/AppSidebar.tsx
src/components/layout/Footer.tsx
src/pages/Auth.tsx
src/components/equity-brain/EBSidebar.tsx
```

Sem qualquer outra mudança — só dimensões.
