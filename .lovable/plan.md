## Diagnóstico

A página `/parceiro` força um gradient escuro próprio (`from-slate-950 via-slate-900`) dentro do `AppShell`, que já tem um fundo claro (`bg-muted/20`). Resultado: dois "mundos" colados — sidebar/topbar claros, conteúdo preto. O título "Painel do Parceiro" some por cima do gradient, o banner amarelo claro destoa, e os StatCards aparecem vazios porque dependem do contraste escuro para o texto branco aparecer.

Vou refazer o `PartnerDashboard` (e padrões reutilizados) para herdar a paleta do shell e seguir o mesmo "tom" das outras páginas autenticadas (como `Painel.tsx`): fundo neutro `bg-background`/`bg-muted/20`, cards `bg-card` com bordas sutis, e o **dourado PME.B3 (`accent`)** como único destaque cromático. Nada de slate-950 hardcoded.

## Mudanças

### 1. `src/pages/PartnerDashboard.tsx` — repaginação completa
- Remover wrapper `bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen`. Usar `bg-background` herdado do shell, com padding consistente (`p-6 lg:p-8`).
- **Header**: hero limpo em `bg-card` com borda fina e leve gradient dourado no canto (apenas 8% opacidade), título em `text-foreground`, badge "PARCERIAS" em `bg-accent/10 text-accent`.
- **Banner "Importar carteira"**: trocar `from-accent/10 via-accent/5 to-transparent` (que vira branco no fundo escuro do shell) por `bg-card border-accent/30` com faixa lateral dourada `border-l-4 border-l-accent`. Botões mantêm hierarquia: primário dourado, secundários `variant="outline"`.
- **StatCards**: usar `bg-card border-border` com hover de borda dourada. Ícone em quadradinho colorido por categoria (azul/esmeralda/vermelho/dourado em opacidade 15%). Texto em `text-foreground`/`text-muted-foreground` — sem mais branco em fundo claro.
- **Tabs**: `TabsList` com fundo `bg-muted` e trigger ativo em `bg-card text-foreground` (igual ao padrão shadcn padrão), removendo a faixa branca solta.
- **Cards "Meus Leads" e "Pool da Rede"**: usar `bg-card border-border`, sem `!bg-slate-900/60 backdrop-blur-md`. Itens internos: `bg-muted/40 hover:bg-muted/60 border-border/60`.
- **Estado vazio**: ícone em círculo dourado leve (`bg-accent/10`), texto `text-muted-foreground`, CTA dourado.
- **Inputs/Selects do filtro do pool**: usar tokens padrão (`bg-background border-input`) em vez de `bg-slate-950 border-slate-700`.
- **VDR Dialog**: trocar `!bg-slate-900 border-slate-700` por defaults shadcn.

### 2. `src/components/partner/SharedOpportunityCard.tsx` — alinhar ao novo tom
- Ler o arquivo e remover qualquer `bg-slate-*` hardcoded; substituir por tokens (`bg-card`, `border-border`, `text-foreground`/`text-muted-foreground`), preservando a estrutura e badges existentes.

### 3. `src/components/partner/InterestModal.tsx` e `ReservationCountdown.tsx` — checagem rápida
- Ler e ajustar apenas se houver fundos escuros hardcoded incompatíveis com a paleta clara.

## Princípios visuais aplicados
- **Uma única cor de marca**: dourado `hsl(var(--accent))`. Status (azul/verde/vermelho) só em badges/ícones pequenos, opacidade 15%, sem inundar superfícies.
- **Hierarquia por elevação**, não por cor: `bg-background` → `bg-card` → `bg-muted/40` para itens listados.
- **Bordas sutis** (`border-border`) em vez de cards "flutuantes" pretos.
- **Mesma linguagem do `/painel`**: gradients laterais leves nos hero cards, ícones em quadradinho colorido, tipografia em `text-foreground`.

## Resultado esperado
A área de parceiros vai parecer parte do mesmo produto — sidebar PME.B3 clara → topbar clara → conteúdo claro com toques dourados. Sem mais "mundo preto" colado em "mundo branco".
