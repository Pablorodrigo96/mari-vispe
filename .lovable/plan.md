
# Rebrand Visual: PME.B3 → mari

Reconstrução **somente gráfica** da identidade. Zero alterações em estrutura de código, rotas, hooks, edge functions, schema, lógica de negócio ou ferramentas. Apenas: cores, tokens, fontes, logo, textos de marca e metadata.

---

## 1. Nova Identidade (referência das imagens enviadas)

**Paleta oficial:**
- `CARBON` `#0A0A0A` — fundo principal escuro
- `VOLT` `#D9F564` — accent / destaque (substitui todo o gold/amber/orange/yellow)
- `GRAPHITE` `#2A2A2A` — superfícies secundárias / cards
- `BONE` `#FAFAF7` — fundo claro / texto sobre escuro

**Tipografia:**
- `Neue Haas Grotesk Display` (Medium, lowercase, letterspacing negativo) — wordmark e títulos
- `Inter` (400/500) — corpo e interface (já usado, mantém)
- *Fallback p/ Neue Haas (não está no Google Fonts):* usar **Inter Tight** ou **Space Grotesk** com `font-weight: 500`, `letter-spacing: -0.04em`, `text-transform: lowercase` — entrega 95% da sensação sem licença paga.

**Logo:** símbolo "vinil" (círculo orgânico preto com elipse interna + ponto) + wordmark `mari` lowercase + tagline `designed forward`.

---

## 2. Escopo da Mudança

### A. Tokens de design (`src/index.css` + `tailwind.config.ts`)
Reescrever a camada de cores do design system:

| Token antigo | Vira | HSL novo |
|---|---|---|
| `--gold` (38 92% 50%) | `--volt` | `74 84% 68%` (#D9F564) |
| `--gold-light` | `--volt-light` | `74 84% 78%` |
| `--gold-dark` | `--volt-dark` | `74 70% 55%` |
| `--navy` (222 47% 11%) | `--carbon` | `0 0% 4%` (#0A0A0A) |
| `--navy-light` | `--graphite` | `0 0% 16%` (#2A2A2A) |
| `--background` (claro) | `--bone` | `60 33% 97%` (#FAFAF7) |
| `--accent` / `--ring` | apontam p/ `--volt` | — |

**Manter aliases legados** (`--gold`, `--navy`, classes `gradient-gold`, `gradient-navy-deep`, `text-gradient-gold`, `shadow-gold`, `bg-gold`, `text-navy`, etc.) **redirecionando** internamente para os novos tokens. Isso evita tocar em ~99 arquivos que usam `bg-gold`/`text-navy`/`hsl(38…)` — o resultado visual muda, o código não.

**Marker clusters Leaflet** (linhas 168-229 do `index.css`): trocar `hsl(38 …)` por `hsl(74 84% 68%)` mantendo os mesmos seletores.

### B. Tipografia (`tailwind.config.ts` + `index.html`)
- Adicionar `Inter Tight` e `Space Grotesk` via Google Fonts no `index.html`.
- Estender `fontFamily` no Tailwind: `display: ["Inter Tight", "Space Grotesk", "Inter", ...]` para títulos.
- Não alterar `font-sans` (Inter) — corpo permanece.

### C. Logo & Símbolo
- Criar `src/assets/mari-logo.svg` (símbolo vinil) — vetorizado a partir das imagens enviadas, em duas variantes: `mari-symbol.svg` (só o ícone) e `mari-wordmark.svg` (símbolo + "mari" + "designed forward").
- Cores controláveis via `currentColor` para adaptar a fundo Carbon/Volt/Bone.
- Substituir referências ao logo PME.B3 em: `AppSidebar.tsx`, `AppTopbar.tsx`, `Header.tsx`, `Footer.tsx`.
- Atualizar `public/favicon.ico` e `<link rel="icon">` no `index.html` apontando para o novo símbolo (gerar PNG 512px do símbolo Volt-on-Carbon).

### D. Textos de Marca (busca-e-substitui controlado)
Substituir literais em arquivos de UI/conteúdo (NÃO em comentários técnicos, nomes de tabela, secrets ou IDs):
- `PME.B3` → `mari`
- `PME B3` → `mari`
- `PMEB3` → `mari`
- Tagline: onde apropriado, usar `designed forward` ou manter copy existente — decidido por contexto.

Arquivos atingidos: `index.html` (title, meta, og), `Footer.tsx`, `AppTopbar.tsx`, `Header.tsx`, `Index.tsx` (hero/copy), `BlindTeaser.tsx`, `PartnerDashboard.tsx`, `PortfolioPotential.tsx`, `mockData.ts`, componentes em `valuation/`, `investors/`, `capital/`, `matching/`, `teaser/`, `sell/`, `partner/`.

### E. Metadata (`index.html`)
- `<title>mari — designed forward`
- `<meta description>` mantém função, troca marca
- `og:title`, `twitter:title`, `og:image` (gerar nova capa Volt/Carbon e subir em `public/og-mari.png`)
- `<meta name="theme-color" content="#0A0A0A">` adicionado

### F. Memórias do projeto a atualizar
Após implementação, atualizar:
- `mem://style/corporate-financial-identity` → nova paleta mari
- `mem://style/branding-pmeb3-standardization` → renomear arquivo p/ `branding-mari` e atualizar Open Graph
- `mem://style/footer-branding-vispe` → texto "mari, do Grupo Vispe" (manter relação com Vispe)
- `mem://index.md` Core: atualizar linha de identidade

---

## 3. O Que NÃO Será Tocado

- Schema Supabase, RLS, edge functions, migrations
- Hooks, contextos, lógica de negócio (matching, valuation, capital, etc.)
- Stripe, integrações (national-search, BrasilAPI, geocoding)
- Estrutura de rotas, AppShell, sidebar topology
- Componentes shadcn (`src/components/ui/*`) — herdam tokens automaticamente
- Lógica de mapas Leaflet (só cores dos clusters)
- Conteúdo funcional/copy técnico (apenas trocas de marca onde aparece "PME.B3")

---

## 4. Estratégia de Risco-Zero

A chave é o **alias de tokens**: ao manter `--gold`, `--navy`, `bg-gold`, `text-navy`, `gradient-gold`, `shadow-gold` e `text-gradient-gold` apontando internamente para Volt/Carbon, **nenhum dos 99 arquivos que usam essas classes precisa ser editado**. O resultado: troca visual instantânea e consistente, código legado intacto.

Edições explícitas ficam reservadas a:
- 2 arquivos de tokens (`index.css`, `tailwind.config.ts`)
- 4 arquivos de layout para o logo (Sidebar, Topbar, Header, Footer)
- 1 arquivo HTML (metadata + favicon + Google Fonts)
- ~20 arquivos com literais "PME.B3" / "PMEB3" via substituição contextual
- 2-3 arquivos SVG/PNG novos em `src/assets/` e `public/`

---

## 5. QA Visual Pós-Implementação

1. Verificar Home (`/`), Painel logado, Marketplace, Mapa, Teaser cego, Wizard de venda, Footer
2. Confirmar contraste WCAG AA do Volt sobre Carbon (texto pequeno: usar Bone; Volt apenas em accents/CTAs grandes)
3. Validar dark mode (já é o default — vira ainda mais consistente)
4. Conferir clusters Leaflet em verde Volt
5. Print do Open Graph card

---

**Posso aprovar e seguir para implementação?**
