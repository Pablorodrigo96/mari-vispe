## Objetivo

Dois ajustes em `/equity-planner/novo`:
1. **Fluxo**: visitante responde o wizard inteiro anônimo; só pede login no final pra desbloquear o resultado.
2. **Design**: trocar o card cinza atual por um **split-screen imersivo** consistente com a brand mari (Carbon/Volt/Graphite/Bone, glassmorphism), aplicado tanto nas perguntas quanto na página de resultado `/equity-planner/:id`.

---

## Parte 1 — Fluxo sem login até o final

### `src/pages/EquityPlannerNew.tsx`
- **Remover** o `useEffect` que redireciona pra `/auth` e o `if (!user) return null`. Wizard renderiza pra qualquer visitante.
- **Persistir respostas em `sessionStorage`** (chave `equity_planner_draft_v1`, TTL 1h) a cada mudança: `mode, razao, cnpj, setor, porte, uf, scores, faturamento, ebitda, observ, meetingText, chosenArquetipo, classification, step`. Reidratar no mount.
- **Anônimo pula classificador IA**: no step 3 → vai direto pro step 5 (gate). `runClassifier()` e `ensureDraft()` só rodam com `user`.
- **Gate no step 5** (`handleSubmit`): se `!user`, salva rascunho e navega pra `/auth?next=/equity-planner/novo&resume=1&tab=signup`.
- **Reidratação pós-login**: no mount, se `user` existe e há rascunho com `step >= 3`, restaura estado e dispara automaticamente `runClassifier()` → `handleSubmit()` com overlay "Gerando seu diagnóstico…". Limpa sessionStorage no fim.

### Novo `src/components/equity-planner/SignupGateCard.tsx`
Card mostrado no step 5 quando `!user`, substituindo "Gerar diagnóstico":

> ✓ Diagnóstico completo. **Falta 1 passo pra desbloquear seu plano.**
>
> Pra garantir a segurança dos seus dados e do seu planejamento, crie uma conta gratuita. Suas respostas ficam salvas — após o cadastro o diagnóstico é gerado automaticamente.
>
> [Criar conta grátis →] [Já tenho conta]

Combina os dois tons (conquista no topo + segurança no corpo). Estilo card Volt sobre Carbon com borda Volt/30 e ícone de cadeado animado.

### `src/pages/Auth.tsx`
Confirmar que respeita `?next=` e `?tab=signup` (ajustar se não respeitar).

---

## Parte 2 — Redesign split-screen imersivo

### Nova estrutura visual em `/equity-planner/novo`
Substitui o `Card` cinza único por um layout `min-h-screen` com **duas colunas** em desktop, stack em mobile:

```text
┌─────────────────────────┬──────────────────────────────────┐
│  COLUNA ESQUERDA (40%)  │  COLUNA DIREITA (60%)            │
│  bg-carbon              │  bg-graphite/40 backdrop-blur-xl │
│  border-r border-volt/10│                                  │
│                         │                                  │
│  • logo mari            │  • 1 pergunta em foco            │
│  • "Equity Planner"     │  • tipografia grande             │
│  • progresso vertical   │  • inputs sem caixas cinzas      │
│    com 6 steps          │  • microcopy contextual          │
│    (volt = atual,       │                                  │
│     volt/30 = feito)    │                                  │
│  • subtítulo do step    │  Footer:                         │
│  • mini citação/dica    │  [Voltar]      [Próximo →]       │
│  • selo "dados seguros" │                                  │
└─────────────────────────┴──────────────────────────────────┘
```

**Mobile**: coluna esquerda colapsa em header sticky (`h-16`) com logo + progresso horizontal compacto.

### Tokens visuais (todos via design system mari, sem hex hardcoded)
- Fundo geral: `bg-carbon` com radial-gradient `volt/5` sutil no topo.
- Coluna esquerda: `bg-gradient-to-b from-carbon to-graphite/60`.
- Coluna direita: `bg-graphite/30 backdrop-blur-xl` com borda interna `volt/10`.
- Inputs: `bg-transparent border-b-2 border-volt/20 focus:border-volt` (sem caixas — underline style); sliders mantêm volt como track.
- Botões: primário `bg-volt text-carbon`, secundário `bg-transparent border border-volt/30 text-bone`.
- Sliders das 12 dimensões viram **lista compacta com label grande + slider inline + número em Volt** (ao invés do bloco com hint embaixo de cada um). Hint vira tooltip `(i)`.

### Animações (framer-motion já no projeto)
- Transição entre steps: `AnimatePresence` com `x: 20 → 0` fade.
- Progresso vertical: barra Volt cresce com `layout` animation.
- Step ativo: pulse sutil no número/ícone.

### Novos componentes
- `src/components/equity-planner/WizardShell.tsx` — layout split-screen reutilizável (props: `step, totalSteps, stepLabel, children, footer`).
- `src/components/equity-planner/WizardProgress.tsx` — progresso vertical com 6 steps + labels.

### Página de resultado `/equity-planner/:id` (`EquityPlanner.tsx` ou o arquivo equivalente)
- Aplicar **mesmo split-screen**: esquerda fixa com identidade da empresa + IPE score grande em Volt + tabs de navegação (Raio-X / Valuation / Sprints / Compradores); direita scrollável com o conteúdo da tab.
- Cards internos: `bg-graphite/40 backdrop-blur-xl border-volt/10` (substitui os "cinzas terríveis").
- Headline tokens: tipografia da brand (já configurada — Inter/Space Grotesk per memory).
- Charts/bars com Volt como cor principal.

---

## Arquivos afetados

**Editar:**
- `src/pages/EquityPlannerNew.tsx` (fluxo + uso do novo shell)
- `src/pages/EquityPlanner.tsx` (redesign do resultado)
- `src/pages/Auth.tsx` (validar `?next` e `?tab=signup`)

**Criar:**
- `src/components/equity-planner/WizardShell.tsx`
- `src/components/equity-planner/WizardProgress.tsx`
- `src/components/equity-planner/SignupGateCard.tsx`

**Não muda:** edge functions, schema, RLS, design tokens globais (uso só dos já existentes).

---

## Fora do escopo
- Mudar o classificador IA ou as edge functions.
- Trocar a paleta/tipografia da brand mari (locked em memory).
- Redesign de outras páginas do app.
