## Diagnóstico (já confirmado no banco)

Os 317 mandatos estão todos com `status = 'vigente'`. A negociação real vive na coluna `pipeline_stage` (enum `equity_brain.pipeline_stage`):

- `match` — 88
- `nbo` — 1
- `due_diligence` — 0
- `spa` — 0
- `closing` — 228
- `closed` — 0

O `PipelineFunnel` atual lê `m.status` com 3 categorias (Vigente / Em negociação / Vendemos) que ninguém atualiza — por isso aparece "317 / 0 / 0".

## O que vai mudar

### 1. `src/components/equity-brain/crm/PipelineFunnel.tsx`

Reescrever o componente para:

- **Ler `m.pipeline_stage`** (não `m.status`).
- **5 estágios reais** + 1 macro de prospecção, totalizando 6 barras na ordem do funil M&A:

```text
Prospecção  →  Match  →  NBO  →  DD  →  SPA  →  Closing  →  Fechado
```

- **Mapeamento das barras**:

  | Label exibido | Origem | Cor (Tailwind) |
  |---|---|---|
  | Prospecção (sem mandato) | `pipeline_stage IS NULL` ou `deal_origin = 'cold'` sem stage | `bg-zinc-500` |
  | Match | `pipeline_stage = 'match'` | `bg-amber-500` |
  | NBO | `pipeline_stage = 'nbo'` | `bg-orange-500` |
  | Due Diligence | `pipeline_stage = 'due_diligence'` | `bg-blue-500` |
  | SPA | `pipeline_stage = 'spa'` | `bg-indigo-500` |
  | Closing | `pipeline_stage = 'closing'` | `bg-emerald-500` |
  | Fechado | `pipeline_stage = 'closed'` | `bg-emerald-700` |

- **Largura da barra**: proporcional ao maior estágio (igual ao atual), mantendo `Math.max(8, …%)`.
- **Tooltip do header**: continua usando `EB_TIPS.funil_pipeline` (texto centralizado em `ebTooltips.ts` — não muda).
- **Layout/visual**: mantém o mesmo card `bg-zinc-900/40 border border-zinc-800 rounded p-4`, mesma tipografia, só troca os dados e adiciona 4 linhas (de 3 para 7 barras).

### 2. `src/lib/ebTooltips.ts` (ajuste pequeno)

Atualizar o texto do tooltip `funil_pipeline` para refletir a nova semântica: "Distribuição dos mandatos pelos estágios reais do funil M&A — da prospecção até o fechamento. Atualizado quando o estágio muda no Pipeline operacional ou Kanban."

### 3. Nada além disso

- **NÃO** mexer em `mandates.status` no banco — fica como rótulo macro legado, sem migration.
- **NÃO** alterar o `PipelineKanban`, `MandatesMondayTable` ou `QuickEditPopover` — eles já leem `pipeline_stage` corretamente.
- **NÃO** mudar a `eb_today_cards` nem o feed `/equity-brain/hoje` — o problema do feed vazio é outro tópico (filtros restritos), não está no escopo desta correção.

## Por que isso resolve

Hoje o widget "Pipeline operacional" logo abaixo do funil já mostra MATCH 88 / NBO 1 / CLOSING 228 corretamente. Após a mudança, o **funil de cima passa a contar a mesma história visualmente como funil**, com todos os estágios do playbook M&A — você enxerga onde os deals empilham e onde tem gargalo (228 presos em Closing, por exemplo, vira informação acionável).
