
# Mari Light v2 — Feed Instagram/TikTok, não "inverter cores"

A v1 atual é só um remap global com `!important` em cima das classes escuras. Resultado: texto cinza-claro sobre branco-claro, Volt vira um verde-oliva lavado (#6b8e1a) que some no fundo, cards sem borda e sem sombra. Nada parece feed social.

A v2 abandona o "inverter tudo" e constrói um **design system claro próprio**, pensado como Instagram/TikTok: superfície branca quente, hierarquia por sombra leve, acentos saturados (rosa→laranja gradiente Instagram + verde-folha para CTA), bordas e contraste medidos.

## Princípios

1. **Texto sempre escuro de verdade.** `#0F0F10` (titulo) e `#5A5A60` (secundário). Nada de `rgba(0,0,0,0.45)` em corpo de texto — vira ilegível.
2. **Volt vira acento, não fundo.** Verde-folha saturado `#22A06B` (estilo "ao vivo") só em badges, contadores e bordas — nunca em fundo de botão grande.
3. **CTA principal preto Instagram** (`#0F0F10` com `#FFFFFF`), CTA secundário tem **outline de 1.5px** preto. Stories ao vivo ganham o **gradient IG oficial** (rosa → laranja → amarelo).
4. **Cards têm contorno + sombra.** `border: 1px solid #ECECEE` + `shadow: 0 1px 2px rgba(15,15,16,0.04), 0 8px 24px -16px rgba(15,15,16,0.08)`.
5. **Hierarquia por chip colorido**, não por opacidade. Categoria, setor, "ao vivo", "rodada aberta" — cada um com par bg/fg definido.

## Paleta semântica (substitui o bloco `.mari-light` em `src/index.css`)

```text
Surface
  --m-bg          #FFFFFF        fundo página
  --m-bg-soft     #FAFAFB        faixas/strips
  --m-surface     #FFFFFF        card
  --m-surface-2   #F4F4F6        card secundário, input
  --m-overlay     rgba(15,15,16,0.04)

Text
  --m-text        #0F0F10        títulos, números
  --m-text-2      #3A3A40        corpo
  --m-text-3      #6E6E76        meta, timestamps
  --m-text-4      #9A9AA2        placeholders, ícones inativos

Border
  --m-border      #ECECEE        card/divider
  --m-border-2    #E0E0E4        input/hover
  --m-border-3    #0F0F10        outline button

Brand & status
  --m-accent      #0F0F10        CTA primário (Instagram-black)
  --m-accent-fg   #FFFFFF
  --m-live        #22A06B        "ao vivo", crescendo, success
  --m-live-bg     #E6F6EE
  --m-warn        #F59E0B
  --m-danger      #E11D48
  --m-info        #3B82F6
  --m-gradient-ig linear-gradient(45deg,#F58529 0%,#DD2A7B 40%,#8134AF 70%,#515BD4 100%)
  --m-volt-deep   #2F7A1F        (mantido só para texto pequeno "Volt" se necessário)
```

Para evitar regressão, mantemos `--volt` etc. mas com **valores recalculados em modo claro** (`--volt: 145 65% 38%` → vira o verde-folha) — assim componentes que ainda usam Tailwind `text-volt` ganham contraste sem cada um precisar trocar de classe.

## Componentes que ganham tratamento explícito

### Header / TopBar (`InvestirShell`)
- Fundo branco com `backdrop-blur` e borda inferior `#ECECEE`.
- Logo Mari: chip permanece preto sobre branco (não fica verde nem inverte).
- Toggle dark/light vira um pill `[Dark · Light]` em vez de ícone solto.

### StoriesBar (bolinhas)
- **Ring de story ao vivo** = `--m-gradient-ig` (rosa→roxo→azul IG) com pulse, igual Instagram.
- Story de empresa (não-live) = ring `#E0E0E4` 2px.
- Story de fundador (não-live) = ring duotone preto→`#22A06B`.
- Badge "ao vivo" embaixo do avatar = `#DC2743` fundo, texto branco, font-bold.
- Nome embaixo: `#0F0F10` 12px, fundador em itálico `#3A3A40`.

### FeedCard
- Card branco com borda+sombra (token acima), `rounded-2xl`, **sem** `bg-graphite/40`.
- Header do card: avatar circular 36px + nome 14/600 `#0F0F10` + cidade 12/400 `#6E6E76` + chip de categoria à direita.
- Chips de categoria com pares definidos (`Rodada aberta` = `#FFF1E6/#C2410C`, `Atualização` = `#E6F6EE/#15803D`, `Live` = `#FCE7F3/#BE185D`, `Conquista` = `#FEF3C7/#92400E`).
- Métricas: número grande `#0F0F10` 22/700 tabular-nums + delta `#15803D` 12/600 (se positivo) ou `#BE123C`.
- Bottom bar: 💬 comments · 👥 followers · 🎯 investors — ícones outline 16px `#3A3A40`, números `#0F0F10`.
- Botão "Conhecer empresa" = preto sólido full width.

### HighlightStrip (carrosséis horizontais)
- Título da seção 16/700 `#0F0F10` com ícone à esquerda em `#22A06B`.
- "Ver mais" como link `#0F0F10` underline-on-hover.
- Cards 240px: borda `#ECECEE`, hover `#0F0F10`, foto sem overlay (claras).
- Barra de progresso da rodada: track `#F4F4F6` + fill `#22A06B`.

### StoryViewer
- Mantém fundo preto (igual IG mesmo no app light — story é imersivo).
- Botão CTA do final: muda de "branco com texto preto" para "preto com texto branco + hover gradient IG".

### Greeting + título "Empresas reais crescendo agora"
- "Empresas reais" em `#0F0F10`, "crescendo agora" recebe `background-clip: text` do `--m-gradient-ig` (rosa→roxo→azul). Sem mais verde lavado.

### Banner Sparkles "Instagram aproxima pessoas…"
- Fundo `#FAFAFB`, borda `#ECECEE`, ícone preto, palavra "Mari" com gradient IG.

### CategoryStrip (chips de setor)
- Pílulas brancas com borda `#E0E0E4`, ativa = fundo `#0F0F10` texto branco. Emoji mantido.

### CommentsThread / inputs
- Input: bg `#F4F4F6`, focus `border #0F0F10` + ring `rgba(15,15,16,0.08)`.
- Comentário do fundador: pílula `#FCE7F3/#BE185D` "Fundador" (mesma cor do Live IG).

### Tab bar / Bottom nav mobile
- Branco com borda superior `#ECECEE`, ícones `#9A9AA2` inativos, ativo `#0F0F10` + dot `#DC2743` embaixo.

## Implementação técnica

1. **Reescrever `src/index.css` linhas 429–569** trocando o bloco "MARI WHITE THEME" inteiro. Manter o seletor `.mari-light` como gate (já está aplicado em `InvestirShell`).
2. Os overrides param de usar `!important` em escala — passamos os novos tokens via CSS vars e deixamos as classes Tailwind herdarem. `!important` fica reservado para os 5 casos legados que continuam usando hex hardcoded.
3. Adicionar utilities no `@layer components`:
   ```text
   .m-card           → bg + border + shadow
   .m-card-hover     → hover:border-#0F0F10
   .m-chip-{tone}    → 5 variantes (live, round, update, milestone, info)
   .m-cta            → CTA preto
   .m-cta-outline    → CTA outline
   .m-text-gradient  → background-clip text + gradient IG
   .m-ring-live      → ring com gradient IG + animate-pulse
   ```
4. **Trocar classes nos componentes-chave** (sem refatorar tudo): `FeedCard`, `StoriesBar`, `HighlightStrip`, `FeedHome` (banner + greeting + título), `CategoryStrip`, `CommentsThread`. Onde a v1 dependia de `text-bone`, troca por `text-[hsl(var(--foreground))]` (já mapeado).
5. **Logo Mari**: garantir que continua legível — chip preto sobre branco no light, chip Volt sobre carbon no dark.
6. **Toggle**: trocar o ícone solto por um segmented control `Escuro · Claro` no header, ao lado do avatar.
7. **QA visual**: rodar Playwright em 3 telas (`/investir`, `/investir/empresa/:symbol`, story viewer) em ambos os temas, screenshot lado a lado, conferir contraste com pytesseract não é necessário — verificação visual basta.

## Fora de escopo desta passagem

- Não mexer em telas fora de `/investir` (admin, valuation, equity-brain etc.).
- Não mudar o dark theme.
- Não trocar fontes — só cor, borda, sombra, chip.

## Entregáveis

1. Bloco `.mari-light` reescrito em `src/index.css` com tokens semânticos + utilities `m-*`.
2. Refactor visual de 6 componentes: `StoriesBar.tsx`, `FeedCard.tsx`, `HighlightStrip` (inline em `FeedHome.tsx`), `CategoryStrip.tsx`, header do `InvestirShell`, `CommentsThread.tsx`.
3. Segmented toggle Dark/Light no header.
4. Screenshots antes/depois nos 2 temas como verificação.
