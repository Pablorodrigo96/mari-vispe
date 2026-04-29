
# Revisão Visual mari — Logo, Branding e Contraste

Três correções pontuais no rebrand, sem mexer em estrutura/lógica.

## 1. Logos reais nos lugares estratégicos

Substituir o SVG vetorizado pelo **PNG oficial enviado** em pontos onde o impacto visual conta:

- **Login/Auth**, **Hero da Home**, **Footer**, **Topbar/Sidebar do Painel** → `MariLogo` ganha 3 variantes baseadas em PNG real:
  - `mari-logo-dark.png` (fundo escuro, símbolo Volt + wordmark Bone)
  - `mari-logo-light.png` (fundo claro, símbolo + wordmark Carbon)
  - `mari-logo-volt.png` (fundo Volt, tudo Carbon)
  - `mari-symbol-dark.png` / `mari-symbol-volt.png` (apenas símbolo)
- Componente `MariLogo` reescrito para escolher a variante via prop `variant: 'dark' | 'light' | 'volt' | 'symbol-dark' | 'symbol-volt'` com fallback inteligente por contexto.
- Aplicações:
  - **Sidebar** (fundo Carbon) → variante `dark`
  - **Topbar** (fundo Bone) → variante `light`
  - **Header público transparente sobre hero escuro** → `dark`; **scrolled em bone** → `light`
  - **Footer** (fundo Carbon) → `dark`

## 2. PMEB3 remanescentes

- `ValuationReportDialog.tsx` (2 ocorrências) → `www.pmeb3.com.br` vira `mari.vispe.com.br`
- `DCFReportDialog.tsx` (1 ocorrência) → mesmo
- `ViewAsContext.tsx` `STORAGE_KEY = 'pmeb3.view_as'` → **manter** (chave interna de localStorage; trocar invalidaria preferências de admins ativos). Comentário explicativo será adicionado.

## 3. Contraste Volt sobre fundo claro

**Problema raiz:** O token `--accent` em modo claro está como Volt brilhante (`#D9F564`), que em `text-accent` sobre `bg-background`/`bg-card` (Bone/branco) fica praticamente invisível (contraste ~1.3:1).

**Correção (em `src/index.css`):**
- No `:root` (light mode): `--accent` muda de `74 84% 68%` (Volt) para `74 70% 32%` (Volt-deep, escuro mas mantendo a "alma" verde) — atinge AA para texto.
- Acrescentar variável complementar `--volt-surface: 74 84% 68%` que continua o Volt brilhante para uso em **fundos** (`bg-volt`, badges, CTAs grandes onde o par é sempre Carbon).
- Atualizar `tailwind.config.ts`: `volt.DEFAULT` continua brilhante (para `bg-volt`); novo `volt.deep` para texto sobre claro.
- No `.dark` (modo escuro, padrão da plataforma): `--accent` continua Volt brilhante — funciona perfeitamente sobre Carbon.
- Botões `bg-accent` em modo claro: como `--accent` ficou escuro, eles também ficam escuros (consistência preservada — fundo escuro, texto Bone). Mas para os CTAs "vivos" Volt (Anunciar Grátis, Meu Painel) trocar a classe pontualmente para `bg-volt text-carbon hover:bg-volt-light` em **Header.tsx** (4 lugares) e **Footer.tsx** se houver.
- Cards sobre fundo Bone que usam `text-accent` para preço/destaque: ficam automaticamente legíveis (Volt-deep escuro).

**Marker clusters do mapa**: continuam Volt brilhante (estão sobre tiles de mapa, não sobre Bone — não afetados).

## 4. QA pós-mudança

- Inspecionar visualmente: Home (logado e deslogado), Painel, Marketplace, Auth/Login, Footer, PDFs de valuation
- Confirmar legibilidade do verde em todos os fundos claros
- Validar que CTAs principais (Anunciar Grátis, Meu Painel) continuam Volt vivo

**Posso aprovar?**
