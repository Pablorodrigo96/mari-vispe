# Plataforma mari (PME.B3 / Equity Brain)

## Visão geral
Marketplace + Equity Brain (cockpit interno) para originar, qualificar e fechar deals de M&A de PMEs no Brasil. Roda em Lovable Cloud (Supabase). Dark theme, marca **mari**, paleta Carbon/Volt/Graphite/Bone.

## Atores
- **Vendedor (seller)**: cadastra empresa em `/vender` (Sell Wizard 4 passos). Vê `/painel`.
- **Comprador (buyer)**: navega marketplace, expressa interesse em listings, cadastra perfil em `buyer_profiles`.
- **Advisor / Admin (Equity Brain)**: opera o cockpit em `/equity-brain/*`. Trabalha matches, mandatos, pipeline, disclosures.
- **Franqueado**: tem perfil Master grátis e recebe alertas geofenced.
- **Contador parceiro**: hub privado de docs + Equity Score via IA.

## Estrutura de rotas (Equity Brain)
- `/equity-brain/dashboard` — Hero com **Match Hot** (top 5 do dia), KPIs, funil.
- `/equity-brain/match-inbox` — fila central de matches buyer↔mandato (4.300+ ativos), tier dinâmico Hot/Warm por percentil.
- `/equity-brain/crm` — Hub: tabela tipo Monday, atividades, pipeline.
- `/equity-brain/crm/mandate/:id` — 360 do mandato (timeline, matches+SHAP, docs, WhatsApp embed).
- `/equity-brain/crm/buyer/:id` — 360 do buyer.
- `/equity-brain/crm/pipeline` — Kanban com etapas configuráveis, SLA, transições.
- `/equity-brain/crm/pipeline/historico` — duração média por etapa, deals congelados.
- `/equity-brain/crm/imports` — upload .xlsx/.csv para popular companies/mandates/buyers.
- `/equity-brain/crm/exports` — exporta dados.
- `/equity-brain/oportunidades` — pré-mandatos: matches qualificados ainda fora do pipeline formal.
- `/equity-brain/grafo-jarvis` — visualização de rede em 3D.
- `/equity-brain/mapa` — mapa Brasil de buyers e companies.
- `/equity-brain/teses`, `/equity-brain/disclosures`, `/equity-brain/access-audit`, `/equity-brain/permissions`.

## Onde está cada coisa (perguntas comuns)
- "Onde vejo os matches que devo trabalhar?" → **Match Inbox** (`/equity-brain/match-inbox`) ou Hero do Dashboard.
- "Onde estão os deals parados?" → Pipeline Kanban → cards com `StageTimeBadge` vermelho ou `/pipeline/historico`.
- "Como vejo o histórico de durações?" → `/equity-brain/crm/pipeline/historico`.
- "Como configuro etapas do pipeline?" → Pipeline Kanban → botão "Editar etapas" (admin).
- "Onde vejo a identidade real de uma empresa cega?" → 360 do mandato → `IdentityRevealCard` → `BlindTeaserButton`.
- "Onde subo docs?" → 360 do mandato → tab Documentos (multi-source: CRM/VDR/Cadastro).

## Premissas universais
- Toda empresa nasce com **codename** (`MARI-PREFIX-####`) e dados sensíveis ocultos para non-admin/advisor; vê via `eb_can_view_identity` + views `*_blind` + fluxo disclosure logado em `access_logs`.
- Roles em `public.user_roles` (NUNCA em profiles). `has_role(uid, 'admin')` é a função canônica.
- Matches geram-se por engine v2 (Bayesian adaptive); Top % = tier dinâmico, NÃO score absoluto.
