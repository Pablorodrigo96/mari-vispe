

## Plano: Corrigir Drawer cortando conteúdo + Melhorar perguntas do diagnóstico

### Problema 1: Diagnóstico cortado

O componente `Drawer` (vaul) renderiza conteúdo ancorado na parte inferior da tela. Com 12 perguntas + header + summary, o conteúdo excede o espaço disponível e fica cortado. O `max-h-[92vh]` no DrawerContent não resolve porque o Drawer tem comportamento de "puxar para cima" que limita a altura visível.

**Solução**: Substituir os dois `Drawer` (diagnóstico e narrativa) por `Dialog` fullscreen com scroll interno. Isso garante que todo o conteúdo seja acessível.

### Problema 2: Perguntas genéricas

As perguntas atuais são títulos curtos ("Controle de EBITDA", "Balanço auditado") sem contexto suficiente. O empresário não entende o impacto real de cada item.

**Solução**: Reescrever cada uma das 12 perguntas com:
- Título como pergunta direta e contextualizada (ex: "Sua empresa apura e monitora o EBITDA mensalmente, com análise de margem operacional recorrente?")
- Descrição expandida explicando o impacto no valuation quando a resposta é "Não"
- Remover `truncate` da descrição para garantir visibilidade total

---

### Arquivos a modificar

**1. `src/components/valuation/ValuationReportDialog.tsx`**
- Substituir os dois `Drawer` por `Dialog` com `DialogContent` fullscreen (`max-w-4xl max-h-[90vh] overflow-y-auto`)
- Manter a mesma lógica de fluxo: diagnóstico → narrativa

**2. `src/lib/diagnosticCalculator.ts`**
- Reescrever `label` e `description` de cada item para perguntas contextualizadas:
  - `capitalGainOptimized`: "Existe planejamento para minimizar o imposto sobre ganho de capital na venda da participação societária?" / "Sem otimização, até 34% do ganho pode ser tributado, reduzindo drasticamente o valor líquido recebido pelo vendedor."
  - `taxPlanning`: "A empresa possui planejamento tributário atualizado considerando a reforma tributária?" / "Estruturas tributárias desatualizadas geram pagamento excessivo de impostos e reduzem a atratividade para compradores."
  - `ebitdaControl`: "Sua empresa apura o EBITDA mensalmente com análise de margem operacional recorrente?" / "Sem controle de EBITDA, o comprador aplica desconto por falta de visibilidade sobre a real geração de caixa."
  - `debtControlled`: "A relação dívida/EBITDA está abaixo de 3x e a estrutura de capital é equilibrada?" / "Endividamento alto reduz o Equity Value e afasta investidores que buscam empresas com balanço saudável."
  - `chartOfAccounts`: "Existe plano de contas gerencial separado do contábil, com centros de custo?" / "Sem gerencial separado, o comprador não consegue analisar rentabilidade por unidade de negócio."
  - `auditedBalance`: "As demonstrações financeiras dos últimos 3 anos foram auditadas por firma independente?" / "Balanço não auditado gera desconfiança e justifica pedidos de desconto de 15-30% na negociação."
  - `controllerArea`: "Existe equipe ou responsável dedicado ao controle financeiro e reporting gerencial?" / "Sem controladoria, os números dependem do dono — isso é um risco crítico para qualquer comprador."
  - `continuousMonitoring`: "Indicadores financeiros (KPIs) são acompanhados semanalmente via dashboards?" / "Falta de monitoramento indica gestão reativa — compradores penalizam empresas sem previsibilidade."
  - `orgChartUpdated`: "A empresa possui organograma atualizado com papéis e responsabilidades definidos?" / "Organograma indefinido sinaliza dependência do fundador, reduzindo o valor de transação."
  - `salesMachine`: "O processo comercial é documentado com funil de vendas e métricas de conversão?" / "Sem máquina de vendas, a receita depende de esforço individual — isso reduz a previsibilidade e o múltiplo aplicado."
  - `documentedProcesses`: "Os processos críticos da operação estão documentados (SOPs, fluxogramas)?" / "Processos na cabeça das pessoas = risco operacional alto e desconto no valuation."
  - `fixedAssetsRegistered`: "Existe inventário e controle patrimonial de máquinas, equipamentos e imóveis?" / "Ativos não registrados não podem ser considerados no cálculo de valor da empresa."

**3. `src/components/valuation/ValuationDiagnostic.tsx`**
- Remover `truncate` da descrição do `DiagnosticRow`
- Ajustar padding/layout para acomodar descrições maiores

---

### Resumo

| Arquivo | Ação |
|---|---|
| `ValuationReportDialog.tsx` | Trocar Drawer por Dialog fullscreen para diagnóstico e narrativa |
| `diagnosticCalculator.ts` | Reescrever 12 perguntas com contexto e impacto |
| `ValuationDiagnostic.tsx` | Remover truncate, ajustar layout para textos maiores |

