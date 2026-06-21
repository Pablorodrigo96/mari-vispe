## Equity Planner — Feito vs Pendente (vs Masterplan)

Auditoria do que já está implementado no projeto contra o MASTERPLAN. Sem alterações de código — apenas leitura.

### ✅ Já implementado (MVP base)

**Modelo de dados (Supabase)** — 11 tabelas criadas:
- Operacionais: `equity_companies`, `equity_assessments`, `equity_dimension_scores`, `equity_valuations`, `equity_value_bridge_items`, `equity_initiatives`, `equity_buyer_map`, `equity_progress_log`.
- Calibração: `equity_archetypes` (3 seeds: Serviço, Projeto/Obra, Recorrente), `equity_comps_benchmarks`, `equity_initiative_library`.

**Motor IA** — Edge function `equity-planner-compute` usando Claude (Anthropic) com:
- Cálculo do IPE (12 dimensões ponderadas por arquétipo).
- Valuation por múltiplo via curva sigmoide sobre faixa do arquétipo.
- Geração de Value Bridge e Plano em Equity Sprints (12m).

**Frontend** — rotas `/equity-planner`, `/novo`, `/:id`, `/meus-equity-planners`:
- Wizard 5 passos com intake guiado **ou** "Meeting Paste" (cola transcrição/diagnóstico).
- Assessment com 5 abas: Raio-X (radar), Valor (bridge), Plano (sprints), Compradores (buyer map), Progresso.
- Integração com Sidebar (grupo Avaliar) e rota registrada em `App.tsx`.

**Identidade visual:** Carbon/Volt mantida, reusa shell autenticado.

---

### ❌ Pendente / fora do MVP atual

**Camada de arquétipos (§1.3, §10):**
- Só 3 arquétipos seedados — faltam os outros 5 (Distribuição, Varejo, Indústria, Produto/IP, Asset-heavy) para Fase 2.
- **Migração de arquétipo** como iniciativa de maior impacto (tabela `archetype_migrations` + lógica no compute) — não implementado.
- **Afinador setorial dinâmico** (Camada 3, tabela `sector_tuning` + geração runtime via RAG) — não implementado.

**Motor multi-agente (§7):**
- Hoje é uma única chamada Claude. Masterplan pede orquestrador + 9 especialistas (Classificador, Diagnóstico, Valuation, Financeiro, Tributário, Comercial, Mercado, Buyer Mapping, Planner).
- **Classificador de Arquétipo rodando primeiro** — hoje o arquétipo é escolhido no wizard, não detectado por IA.

**Diagnóstico & Valuation (§2, §3):**
- **Upload de documentos** (DRE, balancete, contratos) com extração via IA — não implementado (só intake + meeting paste).
- **Normalização de EBITDA com add-backs** estruturada (remuneração dono, despesas pessoais, não-recorrentes) — não tem UI dedicada.
- **Triangulação** múltiplos + DCF + SDE — só múltiplos.
- **Veredito de liquidez** explícito ("vendável hoje / em N meses / inviável") — falta tag na UI.

**Buyer Map (§5):**
- Tabela existe e há aba na UI, mas falta:
  - 3 arquétipos de comprador (Estratégico/Financeiro/Individual) com teses calibradas.
  - **Engenharia reversa** (alvo de comprador reescreve prioridade do plano).
  - **Prêmio estratégico** quantificado entrando no Value Bridge.

**Planner (§6):**
- Biblioteca `equity_initiative_library` existe mas vazia/não-usada — falta seed de playbook por dimensão/arquétipo.
- Fórmula de priorização `Δvalor / (esforço × prazo) × dependências` — não explícita.
- Regras "de-risking antes de crescimento" e sazonamento de 12–24 meses — não codificadas.

**Loop de re-medição (§9):**
- Tabela `equity_progress_log` existe e tem aba Progresso, mas não há fluxo de **re-execução periódica** (botão "re-rodar diagnóstico" gerando novo snapshot e comparativo).

**Outros artefatos:**
- **PDF export** dos 5 artefatos (Raio-X, Memorando de Valor, Plano, Buyer Map, Dashboard) — não implementado.
- **Detecção declarado × real** quando integrações existirem — fora do MVP.
- Integrações contábil/CRM/gateway — Fase 3, fora do escopo.

---

### Recomendação de próximos incrementos (ordem sugerida)

1. **Migração de arquétipo** (alavanca-chave do masterplan) — tabela `archetype_migrations` + lógica no compute marca migração como top initiative quando detectada.
2. **Classificador de Arquétipo via IA** rodando antes do compute, com confiança e justificativa.
3. **Seed da `equity_initiative_library`** por arquétipo×dimensão para o Planner consumir.
4. **Veredito de liquidez** explícito + faixa de múltiplo visual no Raio-X.
5. **Re-medição** (botão "Nova avaliação" reutilizando dados anteriores + comparativo IPE/Valor).
6. **Upload de documentos** com extração Claude (DRE/balancete) → preenche intake.
7. **Buyer Map enriquecido** + prêmio estratégico no Value Bridge.
8. **Add-backs estruturados** + DCF/SDE de sanidade.

Diga qual desses blocos quer atacar primeiro e eu desenho o plano de build detalhado.