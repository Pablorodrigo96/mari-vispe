## Diagnóstico (cruzando dados reais)

| Filtro da `eb_today_cards` | Realidade no banco | Mata o feed? |
|---|---|---|
| Inatividade > 14 dias (cooling_deal) | Atividade mais antiga é de **hoje cedo** (01/05 02:50) — 0 mandatos esfriados | ✅ Mata 100% dos `cooling_deal` |
| Score ≥ 0.7 (hot_match) | 4.330 matches qualificam | ✅ Tem oferta |
| Você ser `responsavel_id` / `co_advisor` / `origin_advisor` | 230 de 317 mandatos **sem responsável**; só 1 advisor cadastrado no banco | ✅ Mata os cards do seu user |

**Conclusão:** Você é admin operando sobre uma base que ainda não foi distribuída entre advisors. O feed está vazio porque não tem mandato atribuído a você.

## Mudança proposta

Atualizar a função `public.eb_today_cards` para que **admins enxerguem cards de TODOS os mandatos**, mantendo o comportamento normal pra advisors:

- Adicionar `v_is_admin := public.has_role(v_user, 'admin')` no início.
- Em ambos os CTEs (`cooling` e `hot`), trocar a cláusula:
  ```sql
  WHERE (m.responsavel_id = v_user OR v_user = ANY(...) OR m.origin_advisor_id = v_user)
  ```
  por:
  ```sql
  WHERE (v_is_admin
         OR m.responsavel_id = v_user
         OR v_user = ANY(COALESCE(m.co_advisor_ids,'{}'::uuid[]))
         OR m.origin_advisor_id = v_user)
  ```

Tudo o mais permanece idêntico: filtro de score ≥0.7, cooling >14d, exclusão de `closed`, dismissals, ordenação por `priority_score DESC`, limite de 7 cards.

## Resultado esperado

- **Você (admin)**: feed `/equity-brain/hoje` deve passar a mostrar até 7 hot_match cards (dos 4.330 disponíveis), priorizados por `priority_score`. Cards do tipo cooling_deal continuam 0 até algum mandato passar 14 dias sem atividade — isso é correto.
- **Advisors normais**: comportamento idêntico ao atual (vêem só seus mandatos).
- **Sem mudança de schema, sem mudança de RLS, sem mudança de frontend.**

## Fora de escopo (deixar pra outro turno)

- Distribuir os 230 mandatos órfãos entre advisors (problema operacional real).
- Criar painel "Mandatos sem responsável" no admin.
- Trocar fonte de inatividade de `mandates.last_activity_at` pra `crm_activities`.
