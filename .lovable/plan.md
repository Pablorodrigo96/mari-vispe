## Diagnóstico

O relatório (`ValuationReportDialog`, `DCFReportDialog`, `ValuationNarrativeReport`) foi escrito antes do rebrand para **mari** e usa cores hardcoded: `emerald-500/600/700`, `red-500/600`, `amber-50/200`, `slate-400`, `[#0F172A]`, `[#1E293B]`, gradientes verde-azulado etc.

Como o `index.css` aliasou tokens legados, **`bg-emerald-*` na prática vira Volt (#D9F564 — verde-limão)**. Isso causa:

1. **Texto branco em fundo Volt invisível** (imagem 166 — card "Quer fechar esse gap" e card "Mashup Value").
2. **Mistura caótica**: Volt + navy + vermelho-tomate diagnóstico + amarelo-aviso + cinza-azulado de gráfico — sem hierarquia visual.
3. **Contraste quebrado**: badges `bg-emerald-500/20 text-emerald-400` no header escuro ficam Volt-pálido sobre Carbon.
4. **PDF idem**: cores hardcoded RGB (16,185,129) verde-Vispe antigo, fora da identidade atual.

## Princípios do redesign

- **Paleta única mari**: Carbon (#0A0A0A) + Graphite (#2A2A2A) + Volt (#D9F564) + Bone (#FAFAF7) + 1 acento de alerta neutro (vermelho carmim sóbrio só para "perda/risco" no diagnóstico, sem laranja/âmbar).
- **Volt nunca recebe texto branco** — sempre Carbon (`text-foreground` em fundo Volt).
- **Hierarquia em 3 níveis**: (1) hero do valor — superfície escura Carbon com número Volt; (2) cards de dado — Bone/card neutro com filete Volt fino; (3) CTA — Carbon com botão Volt OU Volt com texto Carbon.
- **Glassmorphism leve** (já é padrão do app): `bg-card/60 backdrop-blur-md border border-border`.
- **Tipografia financeira**: número grande em tabular-nums, label em uppercase tracking-wider muted.
- **Zero gradientes coloridos arco-íris** — só gradiente Carbon→Graphite (fundo) e Volt→Volt-light (acento pontual).

## Mudanças por arquivo

### 1. `src/components/valuation/ValuationReportDialog.tsx`

**Header (linha 441):** trocar `bg-[#0F172A]` por `bg-gradient-carbon-deep`; badge passa a `bg-volt/15 text-volt border-volt/30`.

**Hero "Mashup Value" (459-469):** sai gradiente emerald, entra card Carbon com número Volt grande:
```
bg-card border border-border + filete Volt à esquerda
label: text-muted-foreground uppercase tracking-wider text-xs
valor: text-5xl font-bold text-volt tabular-nums
sublinha: text-muted-foreground
```
Remove `text-shadow` (gambiarra para esconder contraste ruim).

**Card "Antes de continuar" (471-504):** elimina vermelho-laranja. Vira card Carbon glass com:
- ícone ⚡ em chip Volt
- texto em `text-foreground` / `text-muted-foreground`
- 3 micro-cards uniformes (sem emoji colorido — usar `lucide-react` TrendingDown/Target/Rocket em Volt)
- CTA: `bg-volt text-carbon hover:bg-volt-light` (botão de ação principal — destaque sem violência)

**Cards Empresa/Financeiro/Múltiplos (507-587):** padronizar:
- ícone-chip `bg-volt/10 text-volt`
- removido emerald de tudo
- divisores `border-border/50` entre linhas para ritmo

**Tabela Valuation por Método (590-635):** header `bg-secondary text-foreground` (não navy hardcoded); linha "Mashup" `bg-volt/10 text-volt` borda superior Volt.

**Múltiplos Implícitos (638-654):** já é Carbon — só trocar `text-emerald-400` por `text-volt`.

**Gap de Equity (704-802):** harmonizar — remover `border-emerald-500/30` e o card "accent" laranja. 3 sumários:
- Atual: `bg-muted/40` (neutro)
- Vispe: `bg-volt/10 border-volt/30 text-volt-dark`
- Gap: também Volt mas com filete (sem 3ª cor accent)
Recharts: barra "atual" `hsl(var(--muted-foreground))`, barra "potencial" `hsl(var(--volt))`. Tooltip já usa tokens.
Botão "Falar com especialista" → `bg-volt text-carbon`.

**Disclaimer amber (817-824):** trocar para `bg-muted/30 border-border` com texto `text-muted-foreground` e ícone Info — sem amarelo gritante.

**CTA WhatsApp final (829-848):** mesmo padrão Carbon-com-Volt-button.

**Botões ação (851-867):** "Baixar PDF" → `bg-volt text-carbon`; "Novo Valuation" → `variant="outline"` com `bg-transparent`.

### 2. `handleDownloadPDF` (62-435) — PDF gerado

Reescrever paleta:
- Header: `#0A0A0A` Carbon (não navy 15,23,42)
- Acento: Volt `#D9F564` com texto Carbon `#0A0A0A` (nunca branco em Volt)
- Texto corpo: `#0A0A0A` em Bone `#FAFAF7`
- Tabela header: Carbon + texto Bone
- Linha total: Volt + texto Carbon bold
- Cards 3-valores diagnóstico: Estimado=Graphite/Bone, True Value=carmim sóbrio `#7A1F1F` em fundo `#FBEAEA`, Potencial=Volt+Carbon
- Disclaimer: faixa neutra `#EEEEEC` com texto Graphite (não amarelo)
- Footer: Carbon + Volt accent
- Logo: "mari" em Volt

### 3. `src/components/valuation/ValuationNarrativeReport.tsx`

**Bloco 9 CTA (334-358):** o problema da imagem 166 — texto branco em fundo Volt invisível.
- Trocar `bg-gradient-to-br from-emerald-500 to-emerald-600 text-white` por `bg-gradient-volt` (Volt→Volt-light) com **texto Carbon** (`text-carbon`).
- Subtexto: `text-carbon/80` (não `text-emerald-100`).
- Botão primário: `bg-carbon text-volt hover:bg-graphite` (inversão elegante).
- Botão secundário: `variant="outline" bg-transparent border-carbon/30 text-carbon hover:bg-carbon/5`.

**Demais blocos (139-312):** trocar `emerald-*` por `volt`-tokens; manter `red-*` apenas nos 2 blocos de "perda" (3 e 4) — já é semântica de alerta legítima — mas suavizar para `red-700/red-50` e `dark:red-950/30` (sem `red-300` agressivo nas bordas; usar `border-border`).

**Badges:** padronizar `bg-volt/15 text-volt-dark border-volt/30` para "ganho/positivo" e `bg-destructive/10 text-destructive border-destructive/30` para "perda".

### 4. `src/components/valuation/DCFReportDialog.tsx`

Aplicar exatamente o mesmo tratamento (mesma estrutura visual, header Carbon, hero Volt-on-Carbon, tabelas neutras, CTA Volt). Sem novas seções.

## O que NÃO muda

- Lógica de cálculo, dados, props, estrutura de seções.
- Diagnóstico de 12 perguntas e edge functions.
- `ValuationDiagnostic.tsx` (página) — só o relatório.
- Páginas `Valuation.tsx`, wizards, e `MyValuations.tsx`.
- Recharts data structure — só cores.

## Verificação

Após aplicar, rodar build e abrir `ValuationReportDialog` mentalmente:
- Nenhum texto branco sobre Volt.
- Máximo 4 cores na tela: Carbon, Bone/card, Volt, 1 carmim só em perda.
- Hero Volt aparece **uma única vez** no relatório (não 3x).
- PDF gerado segue mesma paleta.
