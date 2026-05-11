import {
  PhoneCall,
  FileSignature,
  RefreshCw,
  AlertOctagon,
  Users,
  Sun,
  Sparkles,
  Brain,
  Headphones,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type NoteTemplateScope = "mandate" | "buyer_ma" | "company" | "daily";

/**
 * When `autoGenerate` is set, picking the template invokes the named edge function
 * instead of inserting markdown locally. The function is expected to populate
 * `ai_thesis_summary` / `ai_pitch` / `ai_runs.parsed_output`, which the
 * `upsert_ai_note` trigger then materialises as a note with `source='ai_*'`.
 */
export interface NoteTemplate {
  id: string;
  label: string;
  description: string;
  scope: NoteTemplateScope[];
  icon: LucideIcon;
  body: string;
  autoGenerate?: {
    fn: "claude-classify-thesis" | "claude-generate-pitch" | "claude-analyze-call";
    /** Which entity types the autogen accepts (subset of scope). */
    accepts: Array<"mandate" | "buyer_ma" | "company" | "match" | "listing">;
  };
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "call-discovery",
    label: "Call Discovery",
    description: "Estrutura para primeira conversa de descoberta",
    scope: ["mandate", "buyer_ma", "company"],
    icon: PhoneCall,
    body: `# Call Discovery — {{entityLabel}}
_{{date}}_

## Contexto
- 

## Dores / motivações
- 

## Critérios de decisão
- 

## Próximos passos
- [ ] 

## Stakeholders & menções
- @
`,
  },
  {
    id: "ioi",
    label: "IOI / Carta de interesse",
    description: "Indicação de interesse com faixa de valuation",
    scope: ["buyer_ma", "company"],
    icon: FileSignature,
    body: `# IOI — {{entityLabel}}
_Emitido em {{date}}_

## Faixa de valuation
- EV: R$ — a R$ —
- Múltiplo implícito: — x EBITDA

## Estrutura
- Cash at closing: 
- Earn-out: 
- Rollover: 

## Condicionantes
- 

## Prazo de validade
- 
`,
  },
  {
    id: "follow-up",
    label: "Follow-up",
    description: "Atualização rápida de status e próximo toque",
    scope: ["mandate", "buyer_ma", "company", "daily"],
    icon: RefreshCw,
    body: `## Follow-up — {{date}}

- **Última interação:** 
- **Status atual:** 
- **Pendências:** 
- **Próximo toque:** 
`,
  },
  {
    id: "post-mortem",
    label: "Post-mortem (Lost)",
    description: "Análise de perda e aprendizado",
    scope: ["mandate", "company"],
    icon: AlertOctagon,
    body: `# Post-mortem — {{entityLabel}}
_{{date}}_

## Motivo principal
- 

## Sinais que ignoramos
- 

## O que faríamos diferente
- 

## Aprendizado replicável
- 
`,
  },
  {
    id: "one-on-one",
    label: "Reunião 1:1",
    description: "Pauta, decisões e ações de uma reunião 1:1",
    scope: ["daily"],
    icon: Users,
    body: `## Reunião 1:1 — {{date}}

### Pauta
- 

### Decisões
- 

### Ações
- [ ] 
`,
  },
  {
    id: "daily-default",
    label: "Daily padrão",
    description: "Estrutura diária: prioridades, calls e insights",
    scope: ["daily"],
    icon: Sun,
    body: `## Prioridades

- 

## Calls / Reuniões

- 

## Insights & próximos passos

- 
`,
  },
];

export function getTemplatesForScope(scope: NoteTemplateScope): NoteTemplate[] {
  return NOTE_TEMPLATES.filter((t) => t.scope.includes(scope));
}

export interface TemplateContext {
  date?: string;
  entityLabel?: string;
}

export function applyTemplate(tpl: NoteTemplate, ctx: TemplateContext = {}): string {
  const date = ctx.date ?? format(new Date(), "dd/MM/yyyy", { locale: ptBR });
  const entityLabel = ctx.entityLabel ?? "—";
  return tpl.body.replace(/\{\{date\}\}/g, date).replace(/\{\{entityLabel\}\}/g, entityLabel);
}
