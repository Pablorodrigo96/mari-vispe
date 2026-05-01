Encontrei o problema: os dashboards existem e carregam em `/equity-brain/dashboard/executivo`, `/equity-brain/dashboard/mandato`, `/equity-brain/dashboard/match` e `/equity-brain/dashboard/nbo`, mas os links da sidebar foram criados apontando para `/dashboard/...` sem o prefixo `/equity-brain`. Por isso, quando você clica neles, a navegação não chega corretamente nas páginas dentro do cockpit.

Plano para corrigir agora:

1. Corrigir os links da sidebar
   - Alterar a seção “Dashboards” do menu lateral para apontar para:
     - `/equity-brain/dashboard/executivo`
     - `/equity-brain/dashboard/mandato`
     - `/equity-brain/dashboard/match`
     - `/equity-brain/dashboard/nbo`
   - Assim os cliques vão abrir as páginas corretas dentro do Equity Brain.

2. Tornar os dashboards mais fáceis de achar
   - Renomear visualmente a seção para algo mais explícito, por exemplo “DASHBOARDS M&A”.
   - Manter os quatro itens visíveis logo abaixo do item principal “Dashboard”/CRM, com destaque Volt quando ativos.

3. Adicionar acesso rápido no Dashboard principal
   - Inserir cards/botões no topo do `/equity-brain` apontando para os quatro dashboards:
     - Visão Executiva M&A
     - Mandatos
     - Matching
     - NBO
   - Isso evita depender só da sidebar para encontrar as páginas.

4. Conferir a rota antiga do CRM
   - Manter o “Dashboard Executivo” fora da aba CRM, conforme você pediu.
   - Se ainda existir algum link legado para `/equity-brain/crm/executivo`, transformar em redirecionamento ou remover da navegação, para não confundir.

5. Validação
   - Abrir cada dashboard pela sidebar e confirmar que o título correto aparece:
     - “Visão Executiva M&A”
     - “Dashboard de Mandatos”
     - “Dashboard de Matching”
     - “NBO”
   - Confirmar que o item ativo fica destacado no menu.