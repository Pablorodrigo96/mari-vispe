## Objetivo

Corrigir 3 problemas reportados, mantendo todo o código, conteúdo e funcionalidades intactos — apenas ajuste gráfico/branding.

---

## 1. Trocar o logo "simulado" pelos PNGs oficiais transparentes

Hoje o `MariLogo` está montando o símbolo via SVG inline (recriado por mim) + texto "mari" digitado. Como você mandou os PNGs oficiais com fundo transparente (Photoroom), vamos voltar a usar **os arquivos reais** — que são a marca verdadeira, traçada à mão.

**Assets a importar do upload (PNGs com transparência real):**

```text
user-uploads://símbolo-Photoroom.png                           → src/assets/mari-symbol-volt.png
user-uploads://ChatGPT_Image_28_de_abr._de_2026_20_06_06_1_-Photoroom.png → src/assets/mari-symbol-carbon.png
user-uploads://logo_horizontal_2-Photoroom.png                 → src/assets/mari-lockup-dark.png
user-uploads://logo_v1-Photoroom.png                           → src/assets/mari-lockup-light.png
user-uploads://ChatGPT_Image_28_de_abr._de_2026_20_06_08_4_-Photoroom.png → src/assets/mari-lockup-tagline-light.png
user-uploads://ChatGPT_Image_28_de_abr._de_2026_20_06_08_5_-Photoroom.png → src/assets/mari-lockup-volt-on-dark.png
```

**Reescrever `src/components/brand/MariLogo.tsx`** para usar exclusivamente esses PNGs (sem SVG, sem texto digitado), mantendo a mesma API de `variant`/`size`/`symbolOnly` para não quebrar os pontos de uso (`Header`, `AppSidebar`, `AppTopbar`, `Footer`, `EBSidebar`, `Painel`, `Index`).

Mapeamento de variantes → arquivo:

```text
dark          → mari-lockup-dark.png            (símbolo volt + "mari" branco, sobre carbon)
light         → mari-lockup-light.png           (tudo carbon, sobre bone/branco)
tagline-light → mari-lockup-tagline-light.png   (com "designed forward")
volt          → mari-lockup-volt-on-dark.png    (variação alternativa)
symbol-dark   → mari-symbol-volt.png            (só o donut volt — fundos escuros)
symbol-light  → mari-symbol-carbon.png          (só o donut carbon — fundos claros)
```

`MariWatermark` também passa a renderizar o PNG do símbolo (com `opacity` controlada por estilo), em vez do SVG simulado — assim a "mancha" de marca usa o desenho real, orgânico e imperfeito.

**Não mexer** na lógica de qual variante cada layout escolhe — só trocar a fonte (PNG real em vez de SVG inventado).

---

## 2. Corrigir o logo da tela de login ("DealFlow")

Em `src/pages/Auth.tsx` linhas 217–224 ainda existe o lockup antigo com ícone `Building2` em quadrado accent + texto "Deal**Flow**". Esta é a tela aberta quando o usuário clica em "Vender Empresa" sem estar logado.

Substituir por:

```tsx
<Link to="/" className="inline-flex items-center justify-center mb-6">
  <MariLogo variant="light" size={48} />
</Link>
```

Remover o import não usado de `Building2` se ficar órfão.

---

## 3. Auditar e corrigir verdes fora da paleta Volt

Você tem razão — fizemos parte da troca via aliases (`--gold`, `--navy`), mas existem componentes que usam **classes Tailwind diretas** de verde (emerald/green) que não foram atualizadas. A paleta oficial é apenas:

```text
Carbon   #0A0A0A
Volt     #D9F564
Graphite #2A2A2A
Bone     #FAFAF7
```

Tudo o que estiver `text-emerald-*`, `bg-emerald-*`, `border-emerald-*`, `text-green-*`, `from/to-emerald-*` e similares deve virar a versão Volt equivalente, mantendo a hierarquia visual:

```text
emerald-500/600/700 (sólido) → bg-volt / text-volt
emerald-300/400 (claro)      → text-volt / text-volt-light
emerald-500/10  (tint suave) → bg-volt/10
border-emerald-*             → border-volt/40 (ou border-volt/20 para sutil)
text-emerald-* sobre fundo claro → text-volt-dark (variável já existe, contraste AA)
```

**Locais já mapeados que precisam de varredura:**

- `src/components/equity-brain/EBSidebar.tsx` (item ativo, hover, badges)
- `src/components/layout/AppSidebar.tsx` (link Equity Brain)
- `src/components/layout/Header.tsx` (link Equity Brain)
- `src/pages/Painel.tsx` — toda a paleta `tone: 'emerald'` em `TONE`/`TONE_ICON` deve virar Volt
- `src/components/equity-brain/*Card.tsx` — vários cards usam `emerald-*` em barras/indicadores
- Qualquer `BDR` badge `border-emerald-500/50 text-emerald-600`

**Estratégia de execução:** rodar busca global por `emerald-` e `green-` em `src/`, e fazer substituição por equivalentes Volt em cada ocorrência. Cores **funcionais** (success genérico em ações tipo "salvo com sucesso") podem permanecer com `--success` semântico do design system, mas qualquer "verde de marca/destaque" vira Volt.

Reservar verde-esmeralda **apenas** quando representar um estado semântico (ex.: ✅ "ativo", "sucesso") via token `--success`. Para tudo que é "acento de marca" (Equity Brain, links premium, badges de destaque), usar Volt.

---

## Detalhes técnicos

- Os PNGs Photoroom têm transparência real (verificado visualmente), então não vão criar mais "quadradinho" no header/sidebar.
- O `MariLogo` continua expondo a mesma API → nenhum chamador precisa mudar.
- Favicon SVG criado anteriormente fica como está (já é transparente).
- Nenhuma mudança em rotas, dados, lógica de auth, RLS, edge functions ou conteúdo de texto.
- O nome do produto **Equity Brain** continua existindo (é o nome da feature), só o badge "EB" some e o verde-esmeralda dele vira Volt.

## Arquivos que serão alterados

```text
NOVOS (copiados dos uploads):
  src/assets/mari-symbol-volt.png             (substitui o atual)
  src/assets/mari-symbol-carbon.png           (novo — para fundos claros)
  src/assets/mari-lockup-dark.png             (substitui mari-logo-dark.png)
  src/assets/mari-lockup-light.png            (substitui mari-logo-light.png)
  src/assets/mari-lockup-tagline-light.png    (novo)
  src/assets/mari-lockup-volt-on-dark.png     (substitui mari-logo-volt.png)

EDITADOS:
  src/components/brand/MariLogo.tsx           (volta a usar PNGs reais)
  src/pages/Auth.tsx                          (trocar DealFlow por MariLogo)
  src/components/equity-brain/EBSidebar.tsx   (emerald → volt)
  src/components/layout/AppSidebar.tsx        (link EB: emerald → volt)
  src/components/layout/Header.tsx            (link EB: emerald → volt)
  src/pages/Painel.tsx                        (tone emerald → volt)
  src/components/equity-brain/*Card.tsx       (emerald → volt onde for marca)
  Demais ocorrências de emerald-*/green-* em src/ que forem branding
```

Posso prosseguir?
