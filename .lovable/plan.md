
# Plano — Feature "O Plano Perfeito"

Camada 100% aditiva sobre a aba Valuation. Reutiliza o motor `calculateValuation` existente, os steps do wizard atual (Bloco A) e o sistema de auth/subscription. Nada do fluxo atual de Básico/Master é movido, alterado ou removido.

## 1. Confirmações obrigatórias (checklist do briefing)

- NÃO altera `src/lib/valuationCalculator.ts` (motor reutilizado via import).
- NÃO altera o fluxo `ValuationWizard` nem `ValuationMultiplos`/`ValuationDCF`.
- NÃO remove nem reposiciona os cards de planos em `ValuationTypeSelector.tsx` — o novo banner é inserido ACIMA do bloco existente.
- REUTILIZA `useAuth`, `signUp`, `supabase.auth` e `useValuationAccess` (1 grátis no Básico, ilimitado no Master, mesma lógica de `canUseMultiples` / `consumeMultiplesAccess`).
- REUTILIZA os steps `StepCompanyProfile` + `StepFinancialData` (Bloco A) — montados dentro do novo wizard sem duplicar perguntas.
- Mantém design system (fundo escuro `gradient-navy-deep`, accent verde-limão `text-accent` / `bg-accent`, tipografia atual, `ParticlesBackground`, `framer-motion`).

## 2. Arquivos NOVOS

| Caminho | Propósito |
|---|---|
| `src/lib/planoPerfeitoCalculator.ts` | Motor NOVO do Plano Perfeito. Importa `calculateValuation` para obter V0 e múltiplo. Implementa fórmulas do briefing (gap, clientes_novos, CAC mensal, % receita, semáforo). Edge cases (V_target≤V0, ARPU≤0, clientes≤0). |
| `src/hooks/usePlanoPerfeitoAccess.ts` | Wrapper fino sobre `useValuationAccess`: 1 grátis Básico, ilimitado Master/admin. Não toca tabela atual; conta via nova `planos_perfeitos`. |
| `src/hooks/usePlanosPerfeitos.ts` | CRUD/list dos planos salvos do usuário (histórico). |
| `src/components/valuation/plano-perfeito/PlanoPerfeitoBanner.tsx` | Banner full-width "🚀 Novidade · O Plano Perfeito · Construa a ponte da sua empresa até o bilhão" + CTA. Renderizado dentro de `ValuationTypeSelector` ACIMA dos cards. |
| `src/components/valuation/plano-perfeito/PlanoPerfeitoWizard.tsx` | Orquestrador multi-step com framer-motion. Steps: Bloco A (reusa `StepCompanyProfile` + `StepFinancialData`) → Bloco B (4 perguntas novas) → captura lead → resultado. |
| `src/components/valuation/plano-perfeito/StepMetaValuation.tsx` | Pergunta 1: presets R$100M/500M/1B/custom. |
| `src/components/valuation/plano-perfeito/StepPrazo.tsx` | Pergunta 2: slider 1–15 anos, default 10 (usa `@/components/ui/slider`). |
| `src/components/valuation/plano-perfeito/StepCacArpu.tsx` | Perguntas 3+4: CAC e ARPU. ARPU pré-preenchido se já capturado no Bloco A (não foi — campo novo). Tooltip CAC. |
| `src/components/valuation/plano-perfeito/StepLeadCapture.tsx` | Nome, e-mail, WhatsApp, empresa. Copy: "Vamos enviar seu Plano Perfeito por e-mail". |
| `src/components/valuation/plano-perfeito/PlanoPerfeitoResult.tsx` | Tela "wow": hero com contador animado (R$/mês), grid de métricas, gráfico evolução (Recharts já no projeto), semáforo viabilidade, 3 CTAs (PDF, consultoria, refazer). |
| `src/components/valuation/plano-perfeito/PlanoPerfeitoChart.tsx` | Gráfico mês-a-mês (valuation projetado + CAC acumulado + marcos 100M/500M/1B). |
| `src/components/valuation/plano-perfeito/ViabilitySemaforo.tsx` | Card verde/amarelo/vermelho conforme % receita. |
| `src/pages/PlanoPerfeito.tsx` | Rota `/valuation/plano-perfeito` que monta o wizard (espelha padrão de `ValuationMultiplos.tsx`). |
| `src/pages/MeusPlanosPerfeitos.tsx` | Rota `/meus-planos-perfeitos` — histórico (segue padrão `MyValuations.tsx`). |
| `supabase/functions/plano-perfeito-signup/index.ts` | Edge function: cria conta com senha temporária, envia e-mail de primeiro acesso, retorna sessão. Reutiliza auth existente; chamada apenas quando usuário não-logado conclui o fluxo. |

## 3. Arquivos EXISTENTES modificados (mínimo)

| Caminho | Mudança exata |
|---|---|
| `src/components/valuation/ValuationTypeSelector.tsx` | Inserir `<PlanoPerfeitoBanner onStart={...} />` no topo do `container` (linha ~65), ANTES do bloco `motion.div` do título. Nada mais é tocado. |
| `src/pages/Valuation.tsx` | Adicionar handler `handleStartPlanoPerfeito = () => navigate('/valuation/plano-perfeito')` e passar como prop nova `onStartPlanoPerfeito` para `ValuationTypeSelector`. |
| `src/App.tsx` | Registrar rotas `/valuation/plano-perfeito` (pública, wizard pede cadastro no final) e `/meus-planos-perfeitos` (privada). Lazy import. |
| `src/components/layout/AppSidebar.tsx` | Adicionar item "Meus Planos Perfeitos" dentro do grupo Valuation/Histórico existente (apenas quando logado). |

Nenhum outro arquivo é tocado. Motor, planos, auth, design tokens — intocados.

## 4. Banco de dados (migration nova, aditiva)

Tabela `public.planos_perfeitos`:
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null` (sem FK p/ `auth.users`, padrão do projeto)
- `valuation_inputs jsonb` (Bloco A)
- `plano_inputs jsonb` (meta, prazo, CAC, ARPU, churn)
- `result jsonb` (output completo do motor novo)
- `valuation_atual numeric`, `valuation_meta numeric`, `investimento_mensal numeric`, `viabilidade text` (green/yellow/red)
- `lead_tag text default 'plano_perfeito'`
- `created_at timestamptz default now()`

RLS: usuário lê/insere o próprio; `service_role` ALL; sem grant para `anon`. GRANT explícito para `authenticated`/`service_role` (segue padrão do projeto).

## 5. Fluxo de execução

```text
[Valuation home]
  └─ PlanoPerfeitoBanner ─► /valuation/plano-perfeito
       └─ PlanoPerfeitoWizard
            ├─ Step 1-2: StepCompanyProfile + StepFinancialData (REUSO)
            ├─ Step 3: Meta valuation
            ├─ Step 4: Prazo (slider)
            ├─ Step 5: CAC + ARPU
            ├─ Step 6: Lead capture (se !user)
            │     └─ edge fn plano-perfeito-signup
            │          ├─ cria conta + senha temp
            │          ├─ envia e-mail primeiro acesso
            │          └─ devolve sessão (auto-login)
            ├─ consume 1 crédito (Básico) ou skip (Master/admin)
            ├─ calculateValuation(...)  → V0
            ├─ calcularPlanoPerfeito(...) → resultado
            ├─ INSERT planos_perfeitos
            └─ PlanoPerfeitoResult (wow + CTAs)
```

## 6. Regras de acesso

- Não-logado: pode preencher tudo; cadastro acontece no Step 6 antes do cálculo → 1 grátis consumido.
- Básico: 1 Plano Perfeito grátis (consome o mesmo crédito de `multiples` do `useValuationAccess`, conforme briefing).
- Master/admin: ilimitado + cenários múltiplos + sensibilidade + PDF avançado (flags lidas de `useValuationAccess.isMasterPlan`).

## 7. Dúvidas / ambiguidades para você decidir

1. **Crédito do "1 grátis Básico":** consumir o mesmo balcão de `multiples` do `useValuationAccess` (briefing diz "mesma lógica do valuation atual") ou criar contador separado `planos_perfeitos_used` na tabela `subscriptions`? Default proposto: mesmo balcão de `multiples` para não tocar schema de subscriptions.
2. **Churn:** input do usuário ou default fixo 5% no Step 5? Briefing menciona default — proponho default 5% oculto + toggle "ajustar premissas" para expor o campo.
3. **PDF avançado Master:** gerar via edge function nova (mesma stack dos PDFs atuais de valuation) ou reutilizar template existente com seção extra "Plano Perfeito"? Proponho edge function nova `plano-perfeito-pdf` no próximo ciclo (fora deste plano) — neste ciclo entrego apenas o botão "Salvar PDF" usando `window.print()` estilizado, mantendo escopo.
4. **Cenários múltiplos / sensibilidade (Master):** entregar nesta primeira leva ou marcar como "v2"? Proponho entregar a UI base com 3 cenários (otimista/base/pessimista) variando CAC ±20%, mas SEM sensibilidade interativa (slider de premissas) — esta vai para v2.

Aprove ou ajuste essas 4 decisões e eu parto para o código.
