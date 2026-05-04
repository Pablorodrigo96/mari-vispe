## Plano — Refinamento Narrativo da Home com Carrossel

### 1. Novo componente `src/components/home/HeroCarousel.tsx`
Carrossel auto-rotativo com 5 slides usando o `Carousel` de `src/components/ui/carousel.tsx` (embla) já existente.

**Comportamento:**
- Auto-advance a cada 5,5s (plugin `embla-carousel-autoplay` — adicionar dependência se ainda não estiver disponível; fallback: `setInterval` + `api.scrollNext()`).
- Pause em hover/touch.
- Loop infinito.
- Dots clicáveis no rodapé (5 bolinhas, ativa em Volt).
- Transição fade/slide horizontal padrão do embla.
- Keyboard accessible (setas).
- Mobile-first: texto encolhe (`text-3xl md:text-5xl lg:text-6xl`).

**Estrutura por slide:**
- Badge pequena no topo (cor Volt, uppercase, tracking widest).
- Headline branco bold (`font-display`).
- Frase-chave destacada com `text-gradient-gold bg-accent text-secondary-foreground border-secondary-foreground font-extrabold` (mantém o padrão visual aprovado).
- Subtítulo cinza com `whitespace-pre-line` para preservar quebras.
- CTA `<Button>` Volt, link para `/mari`.

**Conteúdo dos 5 slides** (badge / headline / frase-chave / subtítulo / CTA):
1. PARA TODO EMPRESÁRIO · "Você não decide quando vender sua empresa." · "O mercado decide." · "E a maioria dos empresários percebe isso tarde demais…" · `Descobrir meu timing →`
2. PARA TODO EMPRESÁRIO · "Todo empresário vai vender a empresa um dia." · "Mas poucos sabem quanto ela realmente vale." · "E menos ainda sabem quem poderia comprar você AGORA…" · `Ver quem está olhando →`
3. PARA TODO EMPRESÁRIO · "Você está perdendo dinheiro." · "E nem sabe." · "Não é por falta de esforço. É por falta de informação…" · `Acessar essa inteligência →`
4. INTELIGÊNCIA PREDITIVA · "Vender empresa não é sorte." · "É timing, preparação e comprador certo." · "A Mari analisa sua empresa, seu mercado e possíveis compradores…" · `Calcular meu timing →`
5. A DIFERENÇA MARI · "Eu estou olhando para a sua empresa." · "Antes de você pedir." · "Mari não espera você se cadastrar… 21 milhões de CNPJs…" · `Descobrir agora →`

(Textos integrais conforme prompt enviado.)

### 2. Editar `src/pages/Index.tsx`

**Hero section (linhas 72–122):**
- Substituir o bloco atual de `motion.div` (badge), `motion.h1` e `motion.p` (subtítulo + CTAs antigos) pelo `<HeroCarousel />`.
- Manter o background gradiente, watermark, ParticlesBackground e wrapper section.

**Bloco "pós-hero" (logo abaixo do carrossel, antes do SearchBar):**
Adicionar novo bloco centralizado com:
- Texto:
  > Mari analisa sua empresa, seu mercado e os compradores esperando por você.
  > Em 1 minuto, você descobre:
  > • Se sua empresa está em janela de venda nos próximos 12 meses
  > • Quanto ela pode valer
  > • Quem poderia comprar você
  > Sem cadastro obrigatório. Sem surpresa. Sem achismo.
- CTA destacado Volt grande: `→ Analisar minha empresa AGORA` → `/mari`.

**Stats (linhas 136–141):** novos labels (mesmos números):
- "Empresas em janela identificadas pela Mari"
- "Deals fechados via plataforma"
- "Volume transacionado (compradores + vendedores alinhados)"
- "Tempo médio entre identificação da janela e oferta"

**Bloco Categorias (linha 159–188):** acima do grid, adicionar pequeno intro:
- Eyebrow: "ESTÁ PROCURANDO COMPRAR?"
- Subtexto: "Mari mostra as empresas com maior probabilidade de fechar deal nos próximos 12 meses — ranqueadas por assimetria de valor (não só disponibilidade). Filtre por setor, valor e localização. Mari faz o resto."
- Mantém H2 atual ("É um investidor e quer encontrar a melhor empresa…") como headline secundária.

### 3. Editar `src/components/layout/Header.tsx`
- Renomear item de menu "Matching" → "Compradores" (rota mantida).
- CTA Volt principal: "Anunciar Grátis" → "Analisar empresa grátis ✓" apontando para `/mari` (em vez de `/vender`).
- Validar versões desktop e mobile.

### 4. Detalhes técnicos
- Reutilizar tokens existentes: `bg-accent`, `text-accent`, `text-volt`, `glass-card`, `gradient-navy-deep`.
- Carrossel usa `embla-carousel-react` (já em `carousel.tsx`); para autoplay, importar `embla-carousel-autoplay` — adicionar via `bun add embla-carousel-autoplay` se não estiver instalado.
- Pause em hover via prop `stopOnInteraction` + `stopOnMouseEnter` do plugin.
- Acessibilidade: `aria-label` em dots, `role="region"` no carousel.
- Sem chamadas de IA, sem alterações de schema/DB.

### 5. Fora do escopo
- Não mexer em `/painel`, `/equity-brain`, `/mari` (calculadora) ou em qualquer rota fora da Home.
- Não alterar Footer, MariDifferentialCard, Featured Listings ou CTA section final.
- Não rodar Lighthouse (validação manual pelo usuário após deploy).

### Arquivos a tocar
- **Novo:** `src/components/home/HeroCarousel.tsx`
- **Editado:** `src/pages/Index.tsx`, `src/components/layout/Header.tsx`
- **Possível:** `package.json` (adição de `embla-carousel-autoplay`)
