Plano para fazer o Equity Brain funcionar na interface

Diagnóstico confirmado:
- A base interna já tem dados: 84 empresas, 420 sinais, 84 scores e 84 oportunidades geradas.
- O problema principal é de acesso pela aplicação: o front-end está consultando diretamente o schema interno `equity_brain`, mas a API do app só expõe `public`, gerando erro `Invalid schema: equity_brain` e deixando as telas vazias.
- Há um segundo problema: algumas telas filtram/selecionam `cnae_principal` em `opportunities_ready`, mas essa coluna não existe nessa tabela. O CNAE está em `companies`.
- Também foi identificado que os triggers aparecem ausentes no snapshot de configuração, então a automação futura de listings precisa ser reforçada.

O que vou ajustar

1. Criar uma camada pública segura para leitura do Equity Brain
- Criar views em `public` com `security_invoker=on`, apontando para as tabelas/views internas necessárias.
- As views manterão as regras de permissão do Equity Brain: admin, advisor e parceiro autorizado conseguem ler; usuários comuns continuam sem acesso.
- Incluir pelo menos:
  - `public.eb_opportunities_ready`
  - `public.eb_companies`
  - `public.eb_companies_scored`
  - `public.eb_companies_enriched`
  - `public.eb_company_signals`
  - `public.eb_matches_enriched`
  - `public.eb_call_feedback`
  - `public.eb_events`
  - `public.eb_buyers`
  - `public.eb_buyer_theses`
  - `public.eb_investment_theses`
  - views auxiliares de mapa/board quando usadas.

2. Corrigir o campo CNAE nas oportunidades
- A view `public.eb_opportunities_ready` já trará `cnae_principal` por join com `equity_brain.companies`.
- Assim os filtros por vertical, como ISP/Telecom, funcionarão sem precisar alterar a tabela original.

3. Atualizar o front-end do Equity Brain para consultar a camada pública
- Substituir consultas como:
  - `supabase.schema("equity_brain").from("opportunities_ready")`
- Por consultas em views públicas seguras:
  - `supabase.from("eb_opportunities_ready")`
- Fazer isso nas telas/componentes do cockpit que hoje leem dados internos:
  - Dashboard
  - Oportunidades
  - Board Executivo
  - Mapa do Equity Brain
  - Grafo
  - DealCard
  - Buyers/BuyerCard
  - Calls
  - Teses

4. Manter gravações via funções seguras
- Onde a tela precisa criar buyer, adicionar tese, remover tese ou registrar call, não vou abrir escrita direta insegura nas tabelas internas.
- Vou ajustar para usar funções/botões seguros ou, quando a escrita atual já estiver protegida por políticas internas, manter a estrutura com o mínimo necessário.
- A prioridade deste ajuste é: oportunidades aparecerem e navegação/leitura do cockpit funcionar.

5. Reforçar a sincronização futura
- Recriar/confirmar o trigger em `public.listings` para chamar o bootstrap do Equity Brain em insert/update.
- Corrigir a função `sync-listings-to-equity-brain` para chamar o bootstrap completo (`bootstrap_company_from_listing`) em vez de apenas sincronizar a company, evitando que novas listings fiquem sem signals/scores/opportunities.
- Adicionar resposta mais clara no botão “Sincronizar marketplace”, mostrando quantas oportunidades existem após o processo.

6. Melhorar o estado vazio da tela de oportunidades
- Se ainda não houver resultado para o vertical/filtro escolhido, mostrar uma mensagem útil:
  - “Existem oportunidades na base, mas o filtro atual não encontrou resultados.”
  - Botão para “Ver todos os verticais”.
  - Botão para “Sincronizar marketplace” quando admin/advisor.

Resultado esperado
- Ao abrir `/equity-brain/oportunidades`, você verá as 84 oportunidades já geradas.
- O Dashboard passará a mostrar Top 50, KPIs e funil com dados reais.
- O filtro vertical ISP/Telecom funcionará porque 64 empresas já estão com CNAE `6190601`.
- O cockpit deixará de falhar por `Invalid schema: equity_brain`.
- Novas empresas cadastradas no marketplace continuarão alimentando automaticamente o Equity Brain.

Detalhes técnicos
- Não vou expor o schema interno diretamente para todos.
- A solução será por views públicas controladas e RLS preservado.
- Não vou remover nenhuma funcionalidade existente.
- A correção será aplicada por migration para views/funções/triggers e por ajustes nos componentes React que hoje chamam `.schema("equity_brain")` diretamente.