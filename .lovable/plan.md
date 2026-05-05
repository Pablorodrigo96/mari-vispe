## Integrar Cruzamento Anatel dentro de "Mercado"

Hoje `/equity-brain/mercado` (NewsPage) só mostra notícias e o cruzamento Anatel vive numa rota solta `/equity-brain/anatel/cruzamento`. Vamos unificar dentro de Mercado.

### Mudanças

**1. `src/pages/equity-brain/AnatelCruzamentoPage.tsx`**
- Adicionar prop opcional `embedded?: boolean`.
- Quando `embedded`, remover o wrapper `min-h-screen` + `max-w-7xl px-6 py-8` + breadcrumb "voltar" e o header duplicado, devolvendo apenas o conteúdo (busca CNPJ + Tabs internas).

**2. `src/pages/equity-brain/NewsPage.tsx`**
- Envolver o conteúdo atual em um Tabs externo:
  - Aba **"Notícias"** (default) — todo o conteúdo atual (stats + filtros + NewsPanel).
  - Aba **"Cruzamento Anatel"** — `<AnatelCruzamentoPage embedded />`.
- Sincronizar aba ativa com querystring `?tab=anatel|noticias` via `useSearchParams` (deep-link).

**3. `src/App.tsx`**
- Trocar a rota `anatel/cruzamento` por um `<Navigate to="/equity-brain/mercado?tab=anatel" replace />` para preservar links antigos.

### Resultado

Usuário em **Mercado** vê duas abas no topo: Notícias (default) e Cruzamento Anatel. URLs antigas redirecionam automaticamente.