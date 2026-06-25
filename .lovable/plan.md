## Objetivo

Adicionar uma versão **White** (clara, estilo Instagram/Threads) ao portal `/investir`, mantendo a versão atual **Dark** intacta, com um **toggle** acessível no header (e no menu Minha Mari) que persiste a escolha do usuário.

## Estratégia

O `/investir` foi construído com muitas classes hard-coded (`bg-[#0A0A0A]`, `text-white`, `bg-black`, `text-[#D9F564]`, `border-white/10`, gradientes Volt etc.) espalhadas em ~40 arquivos. Reescrever cada classe seria caro e arriscado. Em vez disso:

1. **Wrapper de tema com classe `mari-light`** aplicado no `InvestirShell` quando o modo White estiver ativo.
2. **Camada de CSS de overrides** em `src/index.css` (dentro de `@layer utilities`) que, sob `.mari-light`, remapeia todas as cores hard-coded mais usadas para a paleta clara — sem tocar nos componentes.
3. Componentes que JÁ usam tokens semânticos (`bg-background`, `text-foreground`) continuam funcionando automaticamente.
4. Toggle persistido em `localStorage` (`mari-theme` = `dark` | `light`), default = `dark` (versão atual).

Não mexe em nenhuma página fora de `/investir`. Não mexe na lógica de reservas, KYC, ledger, edge functions, Supabase.

## Paleta White (Instagram-like)

| Token Dark atual | Equivalente White |
|---|---|
| Carbon `#0A0A0A` (bg) | Branco puro `#FFFFFF` |
| Graphite `#2A2A2A` (cards) | Cinza muito claro `#FAFAFA` / `#F4F4F5` |
| `text-white` / Bone | Quase-preto `#0A0A0A` |
| Volt `#D9F564` (CTA) | Volt-deep `#7BA428` (CTA preto sobre amarelo escuro legível) — para acentos visuais mantemos um Volt suave `#E8F5B8` apenas em fundos, nunca em texto. CTAs principais ficam **pretos** com texto branco (estilo Instagram "Seguir") |
| `border-white/10` | `border-black/10` |
| `text-white/60` | `text-black/60` |

CTAs Volt → CTAs **pretos** (preenchimento `#0A0A0A`, texto branco), exceto badges/destaques onde Volt-suave funciona como background.

## O que será feito

### 1. Contexto de tema
Criar `src/contexts/MariThemeContext.tsx`:
- `useMariTheme()` → `{ theme: 'dark' | 'light', toggle, setTheme }`
- Persiste em `localStorage.mari-theme`
- Provider aplica/remove a classe `mari-light` no elemento raiz do shell.

### 2. Wrapper no shell
`src/components/investir/InvestirShell.tsx`:
- Envolver com `<MariThemeProvider>`
- Adicionar `className={theme === 'light' ? 'mari-light' : ''}` no container raiz do shell.

### 3. Toggle de tema
- Botão sol/lua no header do `InvestirShell` (desktop) e dentro do dropdown do avatar.
- Versão mobile: item no `BottomTabBar` → seção "Minha Mari" ganha um switch rápido, ou um FAB pequeno no header mobile.

### 4. Camada de overrides em `src/index.css`
Bloco novo, claramente delimitado, ex.:
```css
@layer utilities {
  .mari-light { /* ===== MARI WHITE THEME OVERRIDES ===== */
    /* Backgrounds escuros → branco/cinza claro */
    .bg-\[\#0A0A0A\], .bg-black, .bg-carbon { background-color: #FFFFFF !important; }
    .bg-\[\#2A2A2A\], .bg-graphite { background-color: #F4F4F5 !important; }
    .bg-white\/5, .bg-white\/10 { background-color: rgba(0,0,0,0.04) !important; }
    .bg-white\/20 { background-color: rgba(0,0,0,0.08) !important; }

    /* Texto */
    .text-white, .text-bone, .text-\[\#FAFAF7\] { color: #0A0A0A !important; }
    .text-white\/60, .text-white\/70, .text-white\/80 { color: rgba(10,10,10,0.65) !important; }
    .text-white\/40, .text-white\/50 { color: rgba(10,10,10,0.5) !important; }

    /* Bordas */
    .border-white\/10, .border-white\/20 { border-color: rgba(0,0,0,0.08) !important; }
    .divide-white\/10 > * + * { border-color: rgba(0,0,0,0.08) !important; }

    /* Volt CTA → preto estilo Instagram */
    .bg-\[\#D9F564\], .bg-volt {
      background-color: #0A0A0A !important;
      color: #FFFFFF !important;
    }
    .text-\[\#D9F564\], .text-volt { color: #6B8E1A !important; } /* Volt-deep legível */
    .border-\[\#D9F564\] { border-color: #0A0A0A !important; }

    /* Gradientes Volt → cinza suave */
    .from-\[\#D9F564\], .to-\[\#D9F564\] { --tw-gradient-from: #F4F4F5 !important; --tw-gradient-to: #FFFFFF !important; }

    /* Tokens semânticos do shadcn (caso usados dentro do shell) */
    --background: 0 0% 100%;
    --foreground: 0 0% 4%;
    --card: 0 0% 98%;
    --border: 0 0% 92%;
    --muted: 0 0% 96%;
  }
}
```
Cobertura iterativa: depois de ativar, varrer visualmente cada rota principal (`/investir`, `/investir/descobrir`, `/investir/ativo/:s`, `/investir/missoes`, `/investir/ligas`, `/investir/fantasy`, `/investir/painel`, institucionais) e adicionar overrides extras para qualquer classe hard-coded restante.

### 5. Imagens e logos
Se houver logo branca usada só no dark, condicional simples no `InvestirShell` (`theme === 'light' ? logoPreto : logoBranco`). Caso contrário, deixa CSS resolver via `filter: invert()` apenas em ícones SVG inline que ficarem invisíveis.

### 6. Ajustes pontuais que CSS não resolve
- `StoriesBar` / `FeedCard` overlays escuros (gradientes em cima de fotos) → adicionar variante condicional.
- `CompanyHero` background hero (atualmente preto puro) → no White, fundo branco com leve textura.
Tratados depois da camada CSS, somente onde necessário.

## Detalhes técnicos

- **Escopo**: tudo dentro do shell `/investir`. Resto do app (PME.B3, Auth público fora do investir, etc.) **não muda**.
- **Default**: `dark` (versão atual) para usuários novos. Toggle altera e persiste.
- **A11y**: botão com `aria-label="Mudar para tema claro/escuro"`, ícone `Sun`/`Moon` do lucide.
- **SSR/flicker**: app é SPA Vite, sem SSR — basta ler `localStorage` no init do provider para evitar flash.
- **Sem regressão**: nenhuma classe é REMOVIDA dos componentes; apenas overrides condicionais. Voltar pro dark = remover a classe `mari-light`.

## Ordem de entrega

1. Criar `MariThemeContext` + hook.
2. Adicionar camada `.mari-light` em `src/index.css`.
3. Plugar provider e classe no `InvestirShell`.
4. Adicionar toggle (header desktop + dropdown avatar + item no MinhaMari mobile).
5. Smoke pass nas rotas principais; adicionar overrides extras conforme necessário.
6. (Opcional) tratamento específico de heros/overlays.

## Não inclui

- Refatorar componentes para usar tokens semânticos do shadcn (escopo maior, futuro).
- Mudar paleta global do app fora de `/investir`.
- Trocar fontes ou layout — só cores.
