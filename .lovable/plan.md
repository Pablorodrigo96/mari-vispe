## Blocos 1–7 entregues (Núcleo de Conhecimento Mari)

Sequência completa:
1. Sync UI↔DB (`MandateSummaryCard`, `BuyerAlertsBanner`, `CompanyEnrichedHeader`).
2. Tabela base `entity_notes` + RLS + view `eb_entity_notes` + `<EntityNotes/>` + seed legado.
3. Menções `@mandate:UUID|Label` etc. + tabela `entity_note_mentions` + autocomplete + backlinks.
4. Daily notes (`/equity-brain/diario`) com 1-por-dia, feed lateral, streak.
5. Templates de notas (6 catálogo client-side, picker shadcn).
6. Tags hierárquicas (`namespace/tag/sub-tag`) + página `/equity-brain/tag/:slug` + autocomplete.
7. **Busca semântica (pgvector)** — embedding por nota, RPC `eb_notes_similar` + `eb_notes_search_hybrid` (BM25 40% + semântico 60%), edge `embed-note` (cron 10min) + `embed-query`, painel "Notas similares" e página `/equity-brain/busca-notas`.

Próximos passos potenciais (fora do escopo atual):
- Bloco 8: agente RAG que responde perguntas com top-K notas + grounding.
- Bloco 9: tags em mandato/buyer/empresa diretamente (hoje só em notas).
- Bloco 10: rename em massa / merge / saved searches.
