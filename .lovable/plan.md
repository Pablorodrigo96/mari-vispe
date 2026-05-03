# MARI State Reference — Pacote de Diagnóstico (03/05/2026)

## Objetivo
Gerar **4 arquivos de referência** em `/mnt/documents/` que servirão como fonte de verdade sobre o estado real da plataforma. Esses arquivos são para serem anexados em prompts futuros para evitar que features sejam construídas sobre suposições erradas (vide divergências encontradas no diagnóstico).

## O que vai ser entregue

### 1. `MARI_SCHEMA_STATE.txt`
Dump SQL real (já coletado no diagnóstico) contendo:
- Lista completa de colunas das 7 tabelas core (companies, buyers, mandates, matches, crm_activities, benchmark_transactions, deal_events)
- 9 enums do schema `equity_brain` com todos os labels
- 60 functions/triggers do schema
- Contagens reais (não estimativas)
- Cobertura de campos críticos (geocode, SV, thesis)
- Validação de integridade FK (0 orphans confirmado)

### 2. `MARI_CODE_STATE.txt`
- 81 edge functions deployadas (lista completa)
- 47 páginas EB + 97 componentes EB
- 33 hooks customizados
- 26 libs utilitárias
- Configuração `supabase/config.toml` (verify_jwt overrides)
- Mapa de redirects de rotas legadas

### 3. `MARI_STATE_REFERENCE.json`
JSON estruturado com a **realidade**, corrigindo o template do prompt original:
- Schemas reais por tabela (com tipos)
- Lista de campos que **não existem** mas são frequentemente assumidos
- Edge functions agrupadas por domínio (mari-*, match-*, eb-*, calculate-*, etc.)
- Componentes mapeados a paths reais
- Cobertura % de cada campo crítico

### 4. `MARI_README.md`
Documento legível resumindo:
- Snapshot de rows por tabela
- **Tabela de divergências críticas vs. suposições comuns** (o que mais importa)
- Próximas migrations necessárias
- Template de prompt para reuso

## Divergências críticas que vão para o README (já confirmadas no banco)

```text
Suposição comum                          Realidade
---------------------------------------- ----------------------------------------
matches.mandate_id existe                NÃO. matches liga cnpj↔buyer_id
buyers.tese_text é coluna                NÃO existe na tabela buyers
buyers.linkedin_url existe               NÃO existe
buyers.email_contato_principal existe    NÃO existe
buyers.website preenchido                Existe mas 0/503 populados
mandates.motivo_venda existe             NÃO existe
mandates.fase_changed_at                 NÃO. É stage_changed_at
mandates.titulo / mandates.fase          NÃO. É pipeline_stage + outcome
benchmark_transactions tem 55 rows       Está VAZIA (0 rows)
matches.sav_score populado               0/141.601 calculados
matches.thesis_text populado             0/141.601 gerados
companies geocodificadas 80%             63% (248/394)
F1.1 criou view eb_buyers_enriched      View criada mas colunas-fonte não existem
```

## Implementação técnica

1. **Coletar dados restantes** que faltam (já tenho 90%):
   - Triggers list (info_schema)
   - RLS policies count
   - Edge functions config
   - Cron jobs ativos

2. **Gerar os 4 arquivos** via script Node/bash em `/mnt/documents/`:
   - `MARI_SCHEMA_STATE.txt` (texto formatado)
   - `MARI_CODE_STATE.txt` (texto formatado)
   - `MARI_STATE_REFERENCE.json` (JSON validado)
   - `MARI_README.md` (markdown)

3. **Emitir tags `<lov-artifact>`** para cada arquivo gerado, permitindo download direto.

## Não está no escopo

- **NÃO** vou criar migrations para os campos faltantes (`buyers.tese_text`, `mandates.motivo_venda`, etc.) — isso fica para uma Fase F1.3 separada que você pode autorizar depois com base no README.
- **NÃO** vou rodar backfill de SAV/thesis nos 141k matches (job pesado, precisa decisão).
- **NÃO** vou alterar código da plataforma — esta tarefa é puramente diagnóstica/documental.

## Próximo passo após aprovação

Aprove e eu rodo as últimas queries de complemento + escrevo os 4 arquivos em `/mnt/documents/` em uma única passada. Tempo estimado: ~2 min.
