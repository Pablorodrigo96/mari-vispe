# Acelerar carregamento inicial — Home (`/`) e Valuation (`/valuation`)

## Diagnóstico

O `src/App.tsx` faz **import estático eager** de ~110 páginas (admin, equity-brain, dashboards, capital, etc.). Resultado: quem abre só a Home baixa um bundle gigantesco com código que ele nunca vai usar — só o Equity Brain sozinho traz dezenas de páginas pesadas. Isso aumenta o TTI (time-to-interactive), que é exatamente o sintoma que você descreveu (gente entrando e saindo antes da página carregar).

Além disso:
- `Index.tsx` puxa `framer-motion`, `ParticlesBackground`, `HeroCarousel`, `MariDifferentialCard`, e busca `featured-listings` no Supabase **em paralelo com o render inicial**.
- `Valuation.tsx` monta 8 seções pesadas (`MethodologySection`, `ValuationBeforeAfter`, `TrustSection`, `ValuationTestimonials`, `ValuationPaymentModal`, etc.) já no primeiro paint, mesmo que o usuário só veja o hero.

## O que vamos fazer

### 1. Code-splitting em `src/App.tsx` (maior ganho)

Converter quase todos os `import` de páginas para `React.lazy(() => import(...))`, mantendo eager **apenas**:
- `Index` (rota `/` — já é a entrada principal)
- `Auth`, `NotFound` (críticas/leves)
- Providers e componentes de layout (`AppShell`, `AuthProvider`, `Header`, `Footer`)

Envolver `<Routes>` em um único `<Suspense fallback={<RouteLoader />}>` com um spinner minimalista (já existe `Skeleton`).

Resultado esperado: bundle inicial cai de ~vários MB para uma fatia pequena com Home + shared chunks. Equity Brain, Admin, Dashboards, Capital SEO, Valuation wizards, etc. viram chunks sob demanda.

### 2. Otimizar `src/pages/Index.tsx`

- Lazy-load **abaixo da dobra**: `MariDifferentialCard`, seção de Featured Listings (`ListingCard`/Supabase query) e `Footer` via `React.lazy` + `Suspense` com skeleton, ou carregar quando entrar no viewport (`IntersectionObserver`).
- Manter eager: `Header`, `HeroCarousel`, `SearchBar`, stats (são o que aparece no first paint).
- Usar `loading="eager"` + `fetchpriority="high"` na primeira imagem do carrossel; `loading="lazy"` no resto (já está parcialmente).
- Adicionar `<link rel="preconnect">` para o domínio Supabase no `index.html` para acelerar a query de featured.
- A query `featured-listings-master` deve rodar com `staleTime` longo (ex: 5min) para usuários voltando.

### 3. Otimizar `src/pages/Valuation.tsx`

- Manter eager apenas `Header` + `ValuationTypeSelector` (hero + planos = primeira tela).
- Lazy-load: `ValuationWhySection`, `ValuationHowItWorks`, `MethodologySection`, `ValuationBeforeAfter`, `TrustSection`, `ValuationTestimonials`, `ValuationFooterCTA`, `ValuationPaymentModal`.
- Modal de pagamento só importa quando `showPaymentModal` for true (lazy + Suspense).

### 4. Ajustes globais leves

- Em `vite.config.ts`, adicionar `manualChunks` simples para isolar `framer-motion`, `recharts`, `@radix-ui`, `react-router-dom` em vendor chunks compartilhados (melhora cache entre páginas).
- Garantir `preconnect` e `dns-prefetch` em `index.html` para Supabase + CDNs de fontes.

## Detalhes técnicos

**Padrão de lazy em App.tsx:**
```tsx
const Marketplace = lazy(() => import("./pages/Marketplace"));
// ...
<Suspense fallback={<RouteLoader />}>
  <Routes>...</Routes>
</Suspense>
```

**Padrão em Index.tsx / Valuation.tsx:**
```tsx
const FeaturedListingsSection = lazy(() => import("@/components/home/FeaturedListingsSection"));
// extrair a seção atual para um arquivo próprio
<Suspense fallback={<SectionSkeleton />}>
  <FeaturedListingsSection />
</Suspense>
```

**Não vou tocar em:**
- Lógica de negócio (auth, valuation calc, sectorMapping etc.).
- Visual/conteúdo das páginas — só a forma como o JS é carregado.
- Cliente Supabase, types, .env.

## Métrica de validação

Após o deploy: abrir `/` em modo incógnito → Network tab deve mostrar bundle inicial bem menor (idealmente <500 KB gzipped vs. atual). Lighthouse mobile deve melhorar TTI/LCP. O conteúdo da Home aparece igual; o resto carrega sob demanda.

## Fora do escopo (sugestões para depois)

- Imagens das categorias/listings em formato AVIF/WebP responsivo (`<picture>`).
- Mover `ParticlesBackground` para carregamento adiado via `requestIdleCallback`.
- SSR/prerender da Home (exigiria mudar stack, fora de Vite SPA).
