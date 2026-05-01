Fiz uma auditoria inicial do CRM/Pipeline e encontrei problemas reais de modelo, dados e UI que explicam por que “suas empresas” e negociações não aparecem como deveriam.

Diagnóstico objetivo:

1. O banco tem dados, mas o pipeline não está refletindo a realidade operacional.
   - `equity_brain.companies`: 282 empresas.
   - `equity_brain.mandates`: 317 mandatos/deals.
   - `equity_brain.buyers`: 503 buyers.
   - `equity_brain.matches`: 67.381 matches.
   - Porém todos os 317 mandatos estão em `pipeline_stage = match`. Ou seja: o Kanban inteiro fica preso na primeira coluna, mesmo havendo negociações em andamento.

2. Há 230 mandatos sem `outcome` e sem responsável.
   - 230 mandatos têm `outcome = null`.
   - 230 mandatos têm `responsavel_id = null`.
   - 210 mandatos não têm valor relevante (`valor_pedido` nem `valor_operacao`).
   - 87 mandatos não têm contato inline.

3. O backfill do marketplace contaminou o modelo de deal.
   - Existem 86 listings ativas no marketplace.
   - Essas listings foram convertidas automaticamente em “mandatos” com `source = backfill_marketplace`.
   - Esses 86 registros ficaram com `outcome = vigente`, que é semanticamente errado: `vigente` é status de mandato, não resultado do deal.
   - Além disso, só 1 listing tem CNPJ real; a maioria nasce de dados incompletos do marketplace.

4. O CRM mistura quatro universos que precisam ser separados, mas conectados:
   - Empresas qualificadas com mandato/deal real.
   - Vendedores/listings ativos do marketplace.
   - Buyers ativos do CRM/marketplace.
   - Empresas frias/importadas/inteligência de mercado.
   Hoje a UI chama quase tudo de “mandato” e isso gera a sensação correta de que o CRM não está 100%.

5. Há problema de visibilidade e navegação.
   - Não existe uma visão clara “Minhas empresas / carteira / pipeline real”.
   - O CRM mostra “Mandatos M&A” com CNPJ como nome principal em muitos casos, não a razão social/codename.
   - O Kanban filtra por `outcome != cancelado`, mas não diferencia mandato real, listing, origem manual, import, vendedor sem mandato, etc.
   - A rota global de notícias foi criada mas ainda não está registrada/navegável.

6. O import melhorou, mas ainda tem lacunas.
   - Import de mandates exige CNPJ válido; isso é ruim para vendedor com mandato/negociação sem CNPJ disponível.
   - Import de activities tenta inserir coluna `note`, mas a tabela real usa `body`; isso pode quebrar import de histórico.
   - Import de contacts aceita `company`, mas a enum atual de `contacts.entity_type` parece ser só `mandate|buyer`; isso precisa ser harmonizado ou bloqueado com mensagem clara.

Plano para deixar o CRM 100% em fases:

Fase 0 — Correção emergencial de dados e semântica
- Normalizar mandatos existentes:
  - `outcome null` -> `em_andamento` para deals vivos.
  - `outcome = vigente` -> `em_andamento` nos registros vindos do marketplace.
  - Definir `stage_changed_at` para registros antigos sem data coerente.
- Separar visualmente `source = backfill_marketplace` de mandato real.
- Corrigir a view/KPI para “Em andamento” considerar pipeline/outcome corretamente, não só `status = em_negociacao`.
- Corrigir import de activities para gravar em `body`, não `note`.
- Verificar e corrigir edge function `eb-import`, incluindo deploy/teste.

Fase 1 — Modelo canônico de CRM: Empresas, Deals, Sellers e Buyers
- Criar uma camada de classificação operacional sem apagar dados:
  - `deal_origin`: manual/import/marketplace/match_inbox/cold.
  - `deal_kind`: mandato_assinado, vendedor_sem_mandato, buyer_mandate, marketplace_listing, prospecção.
  - `deal_confidence`: real, incompleto, precisa_enriquecer.
- Permitir empresa/deal sem CNPJ real usando placeholder controlado e flag `needs_cnpj_enrichment`, igual já existe em empresas importadas.
- Garantir que vendedor com mandato e vendedor sem mandato possam aparecer no CRM, mas com status diferente.
- Revisar `eb_mandates_enriched` para trazer nome/codename/razão social corretamente e não depender só de CNPJ.

Fase 2 — Pipeline operacional verdadeiro
- Regras de estágio automáticas para dados existentes:
  - Listing marketplace ativa sem contato avançado -> “Originação/Match” ou fila “Marketplace”.
  - Mandato assinado/com contrato/data_assinatura -> “NBO” ou etapa configurável.
  - Deal com comprador vinculado -> “NBO” ou “Due Diligence” dependendo dos campos.
  - `vendemos/concluido` -> `closed`.
  - `cancelado/vencido/vendeu_sozinho` -> etapa terminal ou fora do Kanban ativo.
- Adicionar filtros no Kanban:
  - Todos.
  - Mandatos reais.
  - Vendedores sem mandato.
  - Marketplace.
  - Meus deals.
  - Sem responsável.
  - Precisa enriquecer.
- Corrigir o Kanban para exibir razão social/codename, comprador, origem, responsável, status e contato com clareza.

Fase 3 — Tela “Minhas Empresas / Carteira” e auditoria operacional
- Criar uma página de auditoria do CRM com cards:
  - Empresas sem responsável.
  - Deals sem contato.
  - Deals sem valor.
  - Deals sem CNPJ real.
  - Buyers stubs criados por import.
  - Mandatos presos em Match há muitos dias.
  - Registros de marketplace que precisam virar ou não virar mandato real.
- Criar ações rápidas:
  - Atribuir responsável.
  - Mover etapa.
  - Enriquecer CNPJ.
  - Converter listing em mandato real.
  - Marcar como vendedor sem mandato.
  - Arquivar/cancelar.

Fase 4 — Importação robusta para seu cenário real
- Ajustar templates e parser para aceitar planilhas reais da operação:
  - Empresas com ou sem CNPJ.
  - Vendedores com mandato.
  - Vendedores sem mandato.
  - Buyers.
  - Negociações em andamento.
  - Contatos e atividades.
- Adicionar pré-validação com resumo antes de gravar:
  - Quantas empresas/deals/buyers serão criados.
  - Quantos serão atualizados.
  - Quantos sem CNPJ.
  - Quantos sem responsável.
  - Quantos vão para cada etapa.
- Adicionar deduplicação por CNPJ, nome normalizado, telefone/email e external_ref.
- Adicionar relatório pós-import com erros exportáveis.

Fase 5 — Automação de consistência e recalculadora do CRM
- Criar uma função administrativa “rebuild-crm-state” para:
  - Reclassificar deals.
  - Criar contatos primários a partir de campos inline quando faltarem.
  - Recalcular KPIs.
  - Recalcular matches por lote.
  - Recalcular temperatura/probabilidade.
  - Registrar tudo em logs auditáveis.
- Criar cron leve para verificar inconsistências diariamente, sem sobrescrever edição humana.

Fase 6 — UI final 100%
- Reorganizar CRM em abas claras:
  - Pipeline.
  - Empresas/Carteira.
  - Mandatos reais.
  - Vendedores sem mandato.
  - Buyers.
  - Marketplace.
  - Pendências de dados.
  - Atividades.
- Atualizar sidebar para incluir Notícias e Auditoria CRM.
- Integrar o `MarketPulseWidget` no dashboard executivo.
- Registrar `/equity-brain/news` no roteamento.

Ordem de implementação sugerida:

```text
Fase 0: corrigir inconsistências críticas e import quebrado
Fase 1: criar classificação operacional estável
Fase 2: reconstruir pipeline/Kanban com filtros reais
Fase 3: criar Auditoria CRM e ações rápidas
Fase 4: fortalecer import para dados reais da operação
Fase 5: rebuild/recalculation backend
Fase 6: polimento UI e navegação final
```

Critério de “100% funcionando”:
- Toda empresa/deal/buyer aparece em pelo menos uma visão correta.
- Nenhuma negociação real fica escondida por falta de CNPJ, responsável ou etapa.
- Marketplace não é confundido com mandato assinado.
- Pipeline reflete negociação real, não apenas import bruto.
- Existe fila explícita de pendências para dados incompletos.
- Import não falha silenciosamente.
- KPIs batem com o pipeline.
- Advisor/admin consegue operar tudo sem SQL/manual backend.

Se aprovado, começo pela Fase 0 e Fase 1, porque elas destravam imediatamente o CRM e evitam que as próximas telas sejam construídas sobre dado inconsistente.