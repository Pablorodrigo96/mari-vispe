## Fase 10 — Vertical ISP (Piloto)

Aterrissar o Equity Brain no vertical **ISP/Telecom** antes de generalizar: buyers reais, teses específicas, signals do setor, filtro pré-aplicado e relatório top-100 para o BDR.

### Estado atual (verificado)
- `equity_brain.buyers`: 5 buyers placeholder (ISP Consolidador Sul, Family Office RS Telecom, Fundo Roll-up Telecom, Concorrente Regional Caxias, Grupo ISP Nacional). Todos `source='manual'`.
- `equity_brain.investment_theses`: 5 teses genéricas (`sucessao_familiar`, `consolidacao_regional`, `roll_up_setor`, `aquisicao_carteira`, `ganho_margem_governanca`). **Nenhuma específica de ISP.**
- `equity_brain.signal_catalog`: 18 signals genéricos. Faltam todos os 14 signals ISP (concorrencia_alta, custo_fibra_pesado, multas_anatel, arpu_alto_estimado, etc.).
- `equity_brain.companies`: **0 empresas com CNAEs de telecom** no banco — o seed do `sync-companies-from-cnpj` ainda não puxou esse vertical. O CSV top-100 vai sair vazio até alguém rodar o sync para CNAEs 6110801/6110802/6190601/6190602.
- Schema de `buyer_theses`: tem `buyer_id`, `thesis_key`, `prioridade`, `custom_notes`, `custom_pitch`, `active`. **Não existem colunas `cnaes_target/ufs_target/faixa_fat_min/faixa_fat_max/score_min_ma`** mencionadas no prompt — esses filtros vivem direto em `buyers` (`setores_interesse`, `ufs_interesse`, `ticket_min`, `ticket_max`). Vou seguir o schema atual e não inventar colunas novas.
- `EquityBrainLayout.tsx` já existe com header simples. Precisa ganhar o seletor de Vertical.

---

### Entregáveis

#### 1. Migration SQL — `phase10_vertical_isp.sql`

**1.a. 14 signals novos no `signal_catalog`** (idempotente via `ON CONFLICT (signal_key) DO NOTHING`):

| signal_key | category | default_weight |
|---|---|---|
| `concorrencia_alta` | mercado | 10 |
| `custo_fibra_pesado` | operacional | 12 |
| `multas_anatel` | regulatorio | 18 |
| `crescimento_clientes_baixo` | comercial | 12 |
| `arpu_alto_estimado` | comercial | 10 |
| `baixo_churn_estimado` | comercial | 10 |
| `geografia_premium` | mercado | 10 |
| `crescimento_estavel` | financeiro | 8 |
| `crescimento_estagnado` | financeiro | 12 |
| `margem_apertada` | financeiro | 15 |
| `margem_baixa` | financeiro | 18 |
| `dividas_bancarias_altas` | financeiro | 18 |
| `sem_sucessao` | sucessao | 22 |
| `poucos_socios` | societario | 10 |

**1.b. 5 teses ISP em `investment_theses`** (idempotente via `ON CONFLICT (thesis_key) DO NOTHING`):
- `isp_consolidacao_regional` — required: `setor_consolidando`; boost: `concorrencia_alta`, `crescimento_estagnado`, `custo_fibra_pesado`, `fundador_60_plus`
- `isp_sucessao` — required: `sucessao_provavel`; boost: `fundador_60_plus`, `poucos_socios`, `sem_sucessao`, `crescimento_estavel`
- `isp_fadiga_regulatoria` — required: `multas_anatel`; boost: `desorganizacao_financeira_provavel`, `fundador_60_plus`, `margem_apertada`
- `isp_capex_estresse` — required: `dividas_bancarias_altas`; boost: `margem_baixa`, `crescimento_clientes_baixo`
- `isp_carteira_premium` — required: `arpu_alto_estimado`; boost: `baixo_churn_estimado`, `geografia_premium`, `porte_atrativo_ma`

Categoria `vertical_isp` para ficarem agrupadas na página `Teses`.

**1.c. View `v_isp_universe`** para o filtro vertical e o relatório top-100:
```sql
CREATE OR REPLACE VIEW equity_brain.v_isp_universe AS
SELECT c.*, cs.score_ma_total, cs.score_top_thesis
FROM equity_brain.companies c
LEFT JOIN equity_brain.company_scores cs ON cs.cnpj = c.cnpj
WHERE c.cnae_principal IN
  ('6110801','6110802','6190601','6190602','6190699','6120501','6141800','6142600')
  AND c.situacao_cadastral = 'Ativa';
```

#### 2. Seed de 8 buyers ISP reais via UI (na página `/equity-brain/buyers`)

Em vez de SQL hardcode (nomes reais devem ser confirmados pela Vispe antes), vou enriquecer os 5 buyers placeholder existentes + criar 3 novos com **nomes reais de mercado conhecidos** e marcação `source='seed_isp_phase10'` para fácil auditoria:

1. **Brisanet Serviços de Telecomunicações** — `estrategico` · ticket 5M-150M · UFs: CE/RN/PB/PE/BA/MA/PI · setores: ['telecom']
2. **Desktop Sigmanet** — `estrategico` · ticket 10M-200M · UFs: SP · setores: ['telecom']
3. **Vero Internet** — `estrategico` · ticket 5M-100M · UFs: MG/SP/GO · setores: ['telecom']
4. **Unifique Telecomunicações** — `estrategico` · ticket 5M-150M · UFs: RS/SC/PR · setores: ['telecom']
5. **Algar Telecom** — `estrategico` · ticket 20M-500M · UFs: MG/SP/GO/MT · setores: ['telecom']
6. **Vinci Partners (Infra Digital)** — `financeiro_fundo` · ticket 30M-500M · UFs: nacional · setores: ['telecom','infra']
7. **Pátria Investimentos (Infra)** — `financeiro_fundo` · ticket 50M-1Bi · UFs: nacional · setores: ['telecom','infra']
8. **IG4 Capital** — `financeiro_fundo` · ticket 30M-300M · UFs: nacional · setores: ['telecom']

Cada um recebe 1-3 `buyer_theses` apontando para os `thesis_key` ISP novos (com `prioridade` 1-3). Como o schema atual de `buyer_theses` **não tem colunas de filtro próprias**, a restrição geográfica/ticket vem do próprio buyer (`ufs_interesse`, `ticket_min/max`, `setores_interesse`) — alinhado a como o motor de matching atual já funciona.

Será uma única migration `INSERT … ON CONFLICT (nome) DO UPDATE` para idempotência.

#### 3. Seletor de Vertical no Header (`EquityBrainLayout.tsx`)

- Novo componente `VerticalSelector.tsx`: dropdown shadcn `Select` com opções "Todos" / "ISP / Telecom".
- Persistência em `localStorage` (key `eb.vertical`, default `"isp"` no piloto).
- Hook `useVertical()` em `src/hooks/useVertical.ts` que expõe `{ vertical, setVertical, cnaeFilter }` onde `cnaeFilter` retorna o array de CNAEs (vazio = sem filtro).
- O hook é consumido por `DashboardPage`, `OportunidadesPage`, `MapaPage`, `GrafoPage` e adiciona `.in('cnae_principal', cnaeFilter)` quando `vertical === 'isp'`.

#### 4. Página `Teses` — agrupar por `category`

Pequeno ajuste em `TesesPage.tsx` para mostrar separador `Verticais` vs `Genéricas`, destacando as 5 teses ISP com badge âmbar "Vertical: ISP".

#### 5. Exportador CSV Top-100 ISP

- Botão "Exportar Top 100 ISP CSV" na `DashboardPage` (visível só quando vertical = ISP ou Todos).
- Roda query client-side via `supabase` na view `v_isp_universe` ordenado por `score_ma_total DESC LIMIT 100`, monta CSV (cnpj, razao_social, uf, municipio, cnae_principal, score_ma_total, score_top_thesis, sinais_fortes, buyer_matches) e dispara download via Blob.

---

### Arquivos

**Novo:**
- `supabase/migrations/<timestamp>_phase10_vertical_isp.sql` — signals + teses + view + seed de buyers + buyer_theses
- `src/hooks/useVertical.ts` — context/localStorage para vertical ativo
- `src/components/equity-brain/VerticalSelector.tsx` — dropdown no header
- `src/lib/exportCsv.ts` — util genérico (CSV escape + download)

**Editar:**
- `src/components/equity-brain/EquityBrainLayout.tsx` — adicionar `<VerticalSelector />` no header
- `src/pages/equity-brain/DashboardPage.tsx` — aplicar `useVertical()` nas queries + botão "Exportar Top 100 ISP"
- `src/pages/equity-brain/OportunidadesPage.tsx` — aplicar filtro vertical na query principal
- `src/pages/equity-brain/MapaPage.tsx` — aplicar filtro vertical
- `src/pages/equity-brain/GrafoPage.tsx` — aplicar filtro vertical
- `src/pages/equity-brain/TesesPage.tsx` — agrupar por `category`, badge ISP
- `.lovable/plan.md` — marcar Fase 10 como concluída

**Memória:**
- Criar `mem://features/equity-brain-vertical-isp` documentando a regra (CNAEs ISP, signals novos, default vertical = ISP no piloto).

---

### Critérios de aceite
- ✅ 14 signals ISP novos disponíveis em `signal_catalog`.
- ✅ 5 teses ISP em `investment_theses` (categoria `vertical_isp`).
- ✅ 8 buyers ISP cadastrados (`source='seed_isp_phase10'`), cada um com 1-3 `buyer_theses`.
- ✅ Header do Equity Brain mostra dropdown "Vertical: ISP/Telecom" persistido em localStorage.
- ✅ Toggling o vertical refiltra Dashboard, Oportunidades, Mapa e Grafo.
- ✅ Botão "Exportar Top 100 ISP CSV" funciona e baixa o arquivo (lista vazia até o sync trazer companies de telecom).
- ✅ Página Teses agrupa Genéricas vs Vertical ISP.

### Armadilhas tratadas
- **Schema de `buyer_theses` não tem colunas de filtro:** seguimos o schema real e mantemos os filtros nos campos de `buyers` (já é como o `match-buyer` lê hoje).
- **Banco vazio de companies de telecom:** sinalizo no relatório CSV uma toast "0 empresas — rode o sync de CNAEs ISP em /admin" para evitar confusão; não inventamos dados.
- **Tese genérica demais:** cada tese ISP tem 1 `required_signal` restritivo, não só boosters.
- **Seed idempotente:** todas as inserções usam `ON CONFLICT` para a migration poder ser reaplicada.