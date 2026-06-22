## Problema

Hoje o Equity Planner classifica o arquétipo (ex: `servico_profissional` = consultoria) e *opcionalmente* sugere uma migração de modelo, mas:

- A **migração de modelo de negócio fica escondida** num bloco condicional pequeno na aba "Visão geral" e some quando o LLM não devolve `migracao_sugerida`.
- As **iniciativas dos sprints** raramente atacam reestruturação de modelo (recorrência, produtização, tirar dono do funil) — viram tarefas de execução genérica.
- O **deep-dive e o Plano E1A** não tratam vendabilidade/liquidez como tema próprio.
- Para consultoria/projeto-obra, o usuário sai sem entender *por que* é ilíquida nem *como* virar uma empresa vendável.

## Plano

### 1. Forçar diagnóstico de vendabilidade do modelo (`equity-planner-classify`)
- Quando `arquetipo_id ∈ {servico_profissional, projeto_obra}`, **`migracao_sugerida` deixa de ser opcional**: o prompt obriga a escolher a melhor rota de `equity_archetype_migrations` e devolver `viabilidade`, `racional` e `bloqueadores` (novo campo).
- Adicionar campo `vendabilidade_atual` = `{ nota_0_100, motivo_baixa_liquidez, principais_obstaculos[3..5] }` sempre presente no JSON, mesmo para `recorrente`.
- Fallback determinístico: se LLM omitir, preencher a partir do arquétipo (mapa fixo de motivos).

### 2. Expandir rotas de migração (migration nova)
Adicionar seeds faltantes em `equity_archetype_migrations`:
- `projeto_obra → produto_ip` (kit/equipamento/IP licenciável)
- `servico_profissional → projeto_obra_estruturado` (passo intermediário)
- `recorrente → recorrente_escalavel` (de MRR pequeno p/ ARR enterprise)

### 3. Iniciativas de reestruturação de modelo obrigatórias (`equity-planner-compute`)
- Nova dimensão alvo lógica **`modelo_negocio`** (não vira score, vira tag de iniciativa).
- Regra dura adicional no SYSTEM: para arquétipos ilíquidos, **garantir 2 iniciativas no Sprint 1 do tipo `migracao_arquetipo` ou `reestruturacao_modelo`** cobrindo:
  1. Criação de linha recorrente / retainer / contrato mensal
  2. Redução de dependência do dono (playbook, segundo nível, CRM)
- Estender `tipo` para incluir `"reestruturacao_modelo"` no enum + UI badge.
- Pós-processamento server-side: se LLM não devolveu nenhuma iniciativa de modelo p/ arquétipo ilíquido, injetar 2 templates fixos a partir da rota de migração.

### 4. Nova aba “Modelo & Liquidez” na UI
`EquityPlannerAssessment.tsx` — adicionar tab entre "Visão geral" e "Sprints":

```text
┌─ Modelo atual: Serviço profissional (consultoria)
│  Vendabilidade hoje: 38/100  • Veredito: vendável só com reestruturação
│  Por que é difícil vender: [3 bullets]
├─ Rota recomendada: Serviço prof. → Recorrente (retainer mensal)
│  Δ múltiplo esperado: +2.5x  • Viabilidade: alta  • Prazo: 9 meses
│  Bloqueadores: [3 bullets]
├─ 2 iniciativas-chave de reestruturação (cards clicáveis → DeepDive)
└─ CTA: "Construir Plano E1A focado em vendabilidade"
```

Texto: branco/`text-white/80`, cards `bg-graphite/40 border-volt/30`, badge Volt para "Reestruturação de modelo".

### 5. Deep-dive específico de modelo (`equity-deepdive-questions`)
Quando a iniciativa tem `tipo ∈ {migracao_arquetipo, reestruturacao_modelo}`, o prompt da IA passa a injetar bloco extra exigindo perguntas sobre:
- % atual de receita recorrente vs projeto
- Ticket médio, ciclo de venda, churn
- Dependência operacional do dono (horas/semana)
- Ativos transferíveis (metodologia, marca, base instalada)
- Apetite do dono por mudança de modelo

### 6. Plano E1A focado em vendabilidade (`equity-annual-plan-build`)
- Adicionar ao SYSTEM: “Se houver rota de migração de arquétipo ativa, o plano de 12 meses DEVE ter trilha paralela ‘Trilha de Vendabilidade’ com marco mensal explícito (M1…M12) de transição de modelo, % de receita recorrente alvo por trimestre e checklist de exit-readiness no M12.”
- Output JSON ganha campo `trilha_vendabilidade: { meta_recorrencia_pct, marcos_mensais[12], checklist_exit_readiness[] }`.
- `AnnualPlanTimeline.tsx` renderiza essa trilha como faixa Volt sobreposta aos 12 meses.

### 7. Auditoria visual rápida (escopo desta task)
Varrer só os componentes tocados (`EquityPlannerAssessment.tsx`, `AnnualPlanTimeline.tsx`, `InitiativeDeepDiveModal.tsx`, novo `ModelLiquidityTab.tsx`) trocando qualquer `text-foreground`/`text-muted-foreground` remanescente por `text-white` / `text-white/70` sobre fundos escuros.

## Arquivos

**Migration**
- `supabase/migrations/<ts>_equity_model_liquidity.sql` — seeds novos + coluna `bloqueadores` em `equity_archetype_migrations` (se faltar).

**Edge Functions**
- `equity-planner-classify/index.ts` — `vendabilidade_atual` + `migracao_sugerida` obrigatório p/ ilíquidos + fallback determinístico.
- `equity-planner-compute/index.ts` — regra de 2 iniciativas de modelo no Sprint 1 + tipo `reestruturacao_modelo` + injeção server-side.
- `equity-deepdive-questions/index.ts` — bloco extra de perguntas p/ iniciativas de modelo.
- `equity-annual-plan-build/index.ts` — trilha de vendabilidade no output.

**Frontend**
- `src/components/equity-planner/ModelLiquidityTab.tsx` (novo)
- `src/pages/EquityPlannerAssessment.tsx` (nova tab + wiring)
- `src/components/equity-planner/AnnualPlanTimeline.tsx` (faixa de vendabilidade)
- `src/lib/equity-planner/constants.ts` (labels p/ novo tipo)

## Validação (build mode)

1. Rodar classify p/ assessment de consultoria → confirmar `vendabilidade_atual` e `migracao_sugerida` não-nulos.
2. Rodar compute → confirmar ≥2 iniciativas de modelo no Sprint 1.
3. Abrir aba “Modelo & Liquidez” no preview e validar contraste.
4. Gerar Plano E1A → confirmar `trilha_vendabilidade` populada e renderizada.
