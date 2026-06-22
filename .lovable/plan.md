## Onda 10 — Pitch maior na home + redesign do /equity-planner

### 1. Home (`EquityPlannerSection.tsx`) — chamada maior e mais forte

Reescrever a seção como um bloco hero-sized, ocupando mais altura visual (py-28/32, fundo carbon com gradiente volt sutil + grão), tipografia em escala "headline" tipo manifesto:

- **Eyebrow**: `EQUITY PLANNER · MARI`
- **Headline gigante** (text-4xl → text-6xl lg:text-7xl, leading apertado):
  > Qualquer negócio pode ter **equity** — e ser vendido.
- **Sub-headline forte** (text-xl lg:text-2xl, peso médio, ~70ch):
  > Nós te entregamos o mapa prático pra transformar a sua empresa numa empresa **vendável**.
- Linha de apoio menor com a promessa concreta (15 min · 12 pilares · plano de 12 meses · benchmark setorial).
- CTA principal grande ("Fazer meu diagnóstico" → `/equity-planner`) + CTA secundário "Ver meus diagnósticos".
- Lado direito vira um **painel-mockup** maior (3 KPIs em coluna: IPE, Valuation hoje, Gap pro topo) com glow volt, no lugar dos 3 cards pequenos atuais — mais cinematográfico, menos "feature list".
- Manter `break-words`, semantic tokens, sem cores hardcoded.

### 2. `/equity-planner` — redesign completo (sumir com "branco + caixas cinzas")

Hoje a página usa `bg-background` (claro no tema) + `Card` shadcn default → fica branco com caixas cinzas dentro do AppShell. Vamos alinhar com a identidade Carbon/Volt/Bone do resto do produto (mesma linguagem do Painel/EB):

**Estrutura nova:**

1. **Hero escuro full-bleed** dentro do container do AppShell:
   - Fundo `bg-carbon` com radial volt + grid sutil.
   - Eyebrow + headline grande "Transforme sua empresa num **ativo vendável**".
   - Sub manifesto: "Valor = lucro normalizado × múltiplo. A gente mostra como subir os dois."
   - CTA volt grande + outline ghost "Ver meus planos (n)" condicional.
   - Mini-stat bar embaixo: "12 pilares · IPE 0–100 · benchmark P25/P50/Top10 · plano 12 meses".

2. **Bloco "Como funciona" (5 passos)** — substitui os cards cinzas:
   - Grid responsivo (1 / 2 / 5 col), cada item com número grande (01–05), ícone volt, título e descrição.
   - Cards `bg-graphite/40 border-white/5 hover:border-volt/30`, sem o cinza shadcn padrão.

3. **Bloco "Equação de valor"** redesenhado:
   - Visual em duas colunas: à esquerda, a fórmula em display type (`VALOR = LUCRO × MÚLTIPLO`) com os termos destacáveis em volt; à direita, mini value-bridge ilustrativa (3 barras: hoje → execução → topo).
   - Substitui a Card cinza atual.

4. **Faixa final de CTA** em volt sólido sobre carbon, "Pronto pra ver o seu número?" → `/equity-planner/novo`.

**Tokens / estilo:**
- Tudo em tokens semânticos (`bg-carbon`, `text-bone`, `text-volt`, `border-white/10`, `glass-card`).
- Zero `Card` shadcn default; usar divs com classes da identidade mari (mesma das outras telas EB/Painel).
- Animações leves framer-motion `whileInView` (já usado no resto).
- `break-words` em todo texto longo.

### Arquivos

- **Editar** `src/components/home/EquityPlannerSection.tsx` — nova copy + escala + painel-mockup à direita.
- **Editar** `src/pages/EquityPlanner.tsx` — redesign completo descrito acima.
- Sem mudanças de schema, sem novas rotas, sem mudança no AppShell/sidebar.

### Fora de escopo

- Não mexer em `/equity-planner/novo`, `/equity-planner/:id`, report, my-list.
- Não mexer no cockpit card do `/painel` nem na quest do MyProfile (já feitos na Onda 9).
