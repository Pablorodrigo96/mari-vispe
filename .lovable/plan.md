## Diagnóstico

As tabelas (`equity_initiative_deepdive`, `equity_annual_plan`) e o front-end (modal, timeline, wiring em `EquityPlannerAssessment`) já estão no repo, mas as 3 edge functions novas **nunca foram deployadas** — qualquer clique nos cards do sprint retorna 404 ("Requested function was not found"). É por isso que "não funciona".

Auditoria adicional dos arquivos confirmou que migração, RLS, GRANTs, tipos gerados e wiring no front estão coerentes.

## Plano de execução

1. **Deploy das 3 functions** ausentes do runtime:
   - `equity-deepdive-questions`
   - `equity-deepdive-compile`
   - `equity-annual-plan-build`

2. **Smoke test end-to-end** via `curl_edge_functions` na sessão do usuário:
   - Gerar perguntas para 1 iniciativa real (`7d029b8b-…`) → confirmar 200 + linha persistida em `equity_initiative_deepdive` com `questions`.
   - Salvar respostas mockadas → chamar `equity-deepdive-compile` → confirmar `compiled_prompt` populado e `status='concluida'`.
   - Confirmar gating do botão "Construir Plano E1A" (≥50% iniciativas compiladas).
   - Chamar `equity-annual-plan-build` → confirmar plano salvo em `equity_annual_plan` com 12 meses.

3. **Corrigir o que falhar** (provavelmente nada além de pequenos ajustes de shape JSON, dada a auditoria). Casos cobertos:
   - Se Claude devolver JSON inválido na compile/annual: já existe fallback/extractor — apenas validar.
   - Se RLS bloquear o front após insert via service-role: ajustar policy se necessário.

4. **Fechar com checagem visual** no console/network do preview para garantir 0 erros 404/500 no fluxo.

Nenhuma mudança de UI/design adicional será feita — o redesign visual e a estrutura de cards clicáveis já estão implementados no commit anterior.
